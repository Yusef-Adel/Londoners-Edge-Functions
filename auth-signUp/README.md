# Auth Sign-Up Function Documentation

## Overview
This Edge Function handles user registration with dual integration: Supabase Authentication + Guesty Guest Management. It ensures users exist in both systems for seamless booking and user management.

## Function Flow

### High-Level Process
```
1. Validate request data
2. Check if user exists in Supabase database → If yes, return error
3. Check if guest exists in Guesty (by email OR phone) → If yes, use existing guest ID
4. If guest not in Guesty → Create new guest
5. Create user in Supabase Auth
6. Insert user into Supabase users table with Guesty ID
7. Send email verification
8. Return success response
```

### Detailed Step-by-Step Flow

#### Step 1: Request Validation
- **Required fields**: `email`, `password`, `fullname`
- **Optional fields**: `first_name`, `last_name`, `phone_number`, `user_type`, `redirect_url`, `gender`, `birthday`, `address`, `country`, and extended Guesty fields
- **Validation**: Birthday format must be `YYYY-MM-DD`

#### Step 2: Check Supabase Database
```typescript
// Query users table by email
const { data: existingUser } = await supabase
  .from('users')
  .select('email, guesty_user_id')
  .eq('email', email)
  .single();

if (existingUser) {
  return 409 Conflict // Email already exists
}
```

**Purpose**: Prevent duplicate accounts in Supabase
**Outcome**: 
- ✅ User does not exist → Continue to Step 3
- ❌ User exists → Return error 409

#### Step 3: Check Guesty by Email OR Phone
```typescript
// Search Guesty by email first
const emailSearchUrl = `https://open-api.guesty.com/v1/guests-crud?email=${email}`;
// If not found and phone provided, search by phone
const phoneSearchUrl = `https://open-api.guesty.com/v1/guests-crud?phone=${phone}`;
```

**Search Strategy**:
1. **Primary Search**: Search by email
2. **Secondary Search**: If not found by email AND phone is provided, search by phone
3. **Match Criteria**: Exact match on email or phone in guest records

**Outcome**:
- ✅ Guest found → Use existing `guest_id`, set `isNewGuestyUser = false`
- ❌ Guest not found → Proceed to Step 4

#### Step 4: Create Guest in Guesty (if needed)
```typescript
const guestData = {
  firstName, lastName, fullName,
  email, emails: [email],
  phone, phones: phone ? [phone] : [],
  contactType: "guest",
  preferredLanguage: "en",
  // ... optional fields
}
```

**API Endpoint**: `POST https://open-api.guesty.com/v1/guests-crud`

**Fields Mapped**:
- **Required**: `firstName`, `lastName`, `fullName`, `email`, `contactType`
- **Optional**: `phone`, `birthday`, `gender`, `hometown`, `address`, `tags`, `notes`, `maritalStatus`, `dietaryPreferences`, `allergies`, `interests`, `pronouns`, `kids`, `passportNumber`, `identityNumber`, `nationality`, `otaLinks`

**Outcome**:
- ✅ Guest created → Get `guest_id`, set `isNewGuestyUser = true`
- ❌ Creation fails → Continue WITHOUT Guesty integration (set `guest_id = null`)

#### Step 5: Create User in Supabase Auth
```typescript
const { data: authData } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: 'https://londoners.vercel.app/auth/callback',
    data: { fullname, first_name, last_name, ... }
  }
})
```

**Email Verification**: Automatically sends confirmation email with redirect to callback URL

**Outcome**:
- ✅ Auth user created → Proceed to Step 6
- ❌ Auth creation fails → Return error 400

#### Step 6: Insert into Supabase Users Table
```typescript
const userData = {
  email,
  fullname,
  first_name, last_name,
  phone_number,
  user_type,
  guesty_user_id: guestyUserId, // Can be null
  gender, birthday,
  address, country
}
```

**Error Handling**: If insertion fails, the auth user is automatically deleted (cleanup)

**Outcome**:
- ✅ User inserted → Return success response
- ❌ Insertion fails → Cleanup auth user, return error 500

## Integration Guarantees

### Dual System Check
```
┌─────────────────────────────────────────────────┐
│ USER REGISTRATION GUARANTEES                    │
├─────────────────────────────────────────────────┤
│ 1. User ALWAYS exists in Supabase              │
│ 2. User SHOULD exist in Guesty (best effort)   │
│ 3. If Guesty fails, registration still succeeds│
│ 4. Guesty ID is stored in Supabase users table │
└─────────────────────────────────────────────────┘
```

### Guesty Integration States

| Scenario | Guesty Check | Action | Result |
|----------|--------------|--------|--------|
| New user, email not in Guesty | ❌ Not found | Create new guest | `guesty_user_id` = new ID |
| New user, phone not in Guesty | ❌ Not found | Create new guest | `guesty_user_id` = new ID |
| Email exists in Guesty | ✅ Found | Use existing guest | `guesty_user_id` = existing ID |
| Phone exists in Guesty | ✅ Found | Use existing guest | `guesty_user_id` = existing ID |
| Guesty API error | ⚠️ Error | Skip Guesty | `guesty_user_id` = null |

## API Request/Response

### Request
```bash
POST /auth-signUp
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "fullname": "John Doe",
  "phone_number": "+1234567890", // Optional
  "user_type": "guest", // Optional
  "gender": "male", // Optional
  "birthday": "1990-01-15", // Optional (YYYY-MM-DD)
  "redirect_url": "https://yourfrontend.com/auth/callback" // Optional
}
```

### Success Response (200)
```json
{
  "status": "success",
  "message": "User registered successfully. Please check your email to verify your account before signing in.",
  "email_verification_required": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "email_confirmed_at": null,
    ...
  },
  "user_profile": {
    "user_id": 123,
    "email": "user@example.com",
    "fullname": "John Doe",
    "guesty_user_id": "673abc...",
    ...
  },
  "guesty_user_id": "673abc...",
  "guesty_integration": {
    "success": true,
    "is_new_guesty_user": false,
    "guesty_response": { ... }
  }
}
```

### Error Responses

#### 400 - Validation Error
```json
{
  "status": "error",
  "message": "Email, password, and fullname are required"
}
```

#### 409 - Conflict (User Exists)
```json
{
  "status": "error",
  "message": "Email already exists in our system. Please use a different email or try signing in instead."
}
```

#### 500 - Server Error
```json
{
  "status": "error",
  "message": "Could not add user to the database",
  "details": "..."
}
```

## Email Verification Flow

1. User registers → Receives confirmation email
2. Email contains verification link:
   ```
   https://[supabase-url]/auth/v1/verify?token=...&redirect_to=https://londoners.vercel.app/auth/callback
   ```
3. User clicks link → Supabase verifies token
4. Supabase redirects to:
   ```
   https://londoners.vercel.app/auth/callback#access_token=...&refresh_token=...
   ```
5. Frontend extracts tokens and creates session

## Configuration Requirements

### Environment Variables
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

### Supabase Dashboard Settings
- **Site URL**: `https://londoners.vercel.app` (no trailing slash)
- **Redirect URLs**: `https://londoners.vercel.app/auth/callback`
- **Email Verification**: Enabled

### Database Schema
```sql
-- users table must have these columns:
CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR,
  fullname VARCHAR NOT NULL,
  first_name VARCHAR,
  last_name VARCHAR,
  phone_number VARCHAR,
  user_type VARCHAR,
  guesty_user_id VARCHAR, -- Can be NULL
  gender VARCHAR,
  birthday DATE,
  address TEXT,
  country VARCHAR,
  profile_image_url VARCHAR,
  favorites JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- guesty_tokens table for Guesty API authentication:
CREATE TABLE guesty_tokens (
  id SERIAL PRIMARY KEY,
  access_token VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Error Handling & Logging

### Console Logs Structure
```
=== GUESTY INTEGRATION START ===
✅ Guesty token retrieved successfully
Searching for existing guest in Guesty by email or phone...
✅ GUEST FOUND IN GUESTY - Using existing guest ID: 673abc...
=== GUESTY INTEGRATION SUCCESS ===
✅ User successfully inserted into database: user@example.com
=== USER REGISTRATION COMPLETE ===
User exists in Supabase: ✅
User exists in Guesty: ✅
Guesty Guest ID: 673abc...
Is new Guesty guest: No
```

### Error Scenarios

1. **Guesty Token Missing**
   - Log: `❌ No Guesty tokens found in database`
   - Action: Skip Guesty integration, continue registration
   - Result: User created with `guesty_user_id = null`

2. **Guesty API Error**
   - Log: `❌ GUESTY INTEGRATION ERROR: [error message]`
   - Action: Skip Guesty integration
   - Result: User created with `guesty_user_id = null`

3. **Database Insertion Fails**
   - Log: `❌ Error inserting into users table`
   - Action: Delete auth user (cleanup)
   - Result: Return 500 error

## Testing

### Test Case 1: New User (Not in Guesty)
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/auth-signUp' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "newuser@example.com",
    "password": "password123",
    "fullname": "New User",
    "phone_number": "+1234567890"
  }'
```
**Expected**: User created in both Supabase and Guesty

### Test Case 2: Existing Email in Guesty
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/auth-signUp' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "existing@example.com",
    "password": "password123",
    "fullname": "Existing User"
  }'
```
**Expected**: User created in Supabase with existing Guesty ID

### Test Case 3: Existing Phone in Guesty
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/auth-signUp' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "newmail@example.com",
    "password": "password123",
    "fullname": "User Name",
    "phone_number": "+1234567890"
  }'
```
**Expected**: User created in Supabase with existing Guesty ID (found by phone)

## Maintenance & Troubleshooting

### Common Issues

1. **Email verification not working**
   - Check Site URL has no trailing slash
   - Verify redirect URL is whitelisted
   - Wait 5-10 minutes for config changes to propagate

2. **Guesty integration fails**
   - Verify `guesty_tokens` table has valid token
   - Check Guesty API status
   - Review logs for specific error

3. **User can't sign in after registration**
   - User must verify email first
   - Check `email_confirmed_at` in auth.users table
   - Resend verification email if needed

### Monitoring
- Check logs for `❌` symbols indicating failures
- Monitor `guesty_user_id = null` cases
- Track email verification completion rates

## Security Considerations

- ✅ Passwords never stored in users table (handled by Supabase Auth)
- ✅ Email verification required before sign-in
- ✅ CORS properly configured
- ✅ Service role key used only server-side
- ✅ Input validation on all fields
- ✅ Cleanup on failure (auth user deleted if DB insert fails)

## Future Enhancements

1. Add phone verification alongside email verification
2. Implement retry logic for Guesty API failures
3. Add webhook for Guesty guest updates
4. Support bulk user imports
5. Add rate limiting for registration attempts
