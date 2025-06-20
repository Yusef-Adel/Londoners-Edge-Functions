# Update User Edge Function

## Overview

The `update-user` Supabase Edge Function updates guest information in the Guesty system. This function allows partial updates of guest profiles, supporting a comprehensive set of personal information, contact details, preferences, and identification data. Only the fields provided in the request will be updated.

## Endpoint

```
POST https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/update-user
```

## Authentication

This function requires proper authentication headers. Include your Supabase API key in the request headers.

## Request Format

### Headers

```
Content-Type: application/json
Authorization: Bearer <your-supabase-token>
```

### Request Body

```json
{
  "guestId": "string",
  "firstName": "string",
  "lastName": "string",
  "hometown": "string",
  "address": "object",
  "picture": "string",
  "email": "string",
  "emails": "array",
  "phone": "string",
  "phones": "array",
  "notes": "string",
  "tags": "array",
  "goodToKnowNotes": "string",
  "preferredLanguage": "string",
  "birthday": "string",
  "gender": "string",
  "maritalStatus": "string",
  "dietaryPreferences": "array",
  "allergies": "array",
  "interests": "array",
  "pronouns": "string",
  "kids": "array",
  "passportNumber": "string",
  "identityNumber": "string",
  "nationality": "string",
  "otaLinks": "array"
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guestId` | string | Yes | The unique identifier for the guest in the Guesty system |
| `firstName` | string | No | Guest's first name |
| `lastName` | string | No | Guest's last name |
| `hometown` | string | No | Guest's hometown |
| `address` | object | No | Guest's address information |
| `picture` | string | No | URL to guest's profile picture |
| `email` | string | No | Primary email address |
| `emails` | array | No | Array of email addresses |
| `phone` | string | No | Primary phone number |
| `phones` | array | No | Array of phone numbers |
| `notes` | string | No | General notes about the guest |
| `tags` | array | No | Array of tags for guest categorization |
| `goodToKnowNotes` | string | No | Important notes for staff |
| `preferredLanguage` | string | No | Guest's preferred language |
| `birthday` | string | No | Guest's birthday (ISO date format) |
| `gender` | string | No | Guest's gender |
| `maritalStatus` | string | No | Guest's marital status |
| `dietaryPreferences` | array | No | Array of dietary preferences |
| `allergies` | array | No | Array of allergies |
| `interests` | array | No | Array of guest interests |
| `pronouns` | string | No | Guest's preferred pronouns |
| `kids` | array | No | Information about guest's children |
| `passportNumber` | string | No | Guest's passport number |
| `identityNumber` | string | No | Guest's identity/ID number |
| `nationality` | string | No | Guest's nationality |
| `otaLinks` | array | No | Links to OTA (Online Travel Agency) profiles |

## Response Format

### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Guest updated successfully",
  "data": {
    "id": "guest_12345",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "hometown": "New York",
    "address": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "US"
    },
    "tags": ["vip", "repeat-guest"],
    "preferredLanguage": "en",
    "birthday": "1990-01-15",
    "gender": "male",
    "nationality": "US",
    "notes": "Prefers early check-in",
    "goodToKnowNotes": "Has pet allergies",
    "dietaryPreferences": ["vegetarian"],
    "allergies": ["peanuts", "pets"],
    "interests": ["hiking", "photography"],
    "pronouns": "he/him",
    "updatedAt": "2025-06-20T10:08:19Z"
  }
}
```

*Note: The actual response structure depends on the data returned by the Guesty API and may include additional fields.*

### Error Responses

#### Missing Required Parameters

**Status Code:** `400 Bad Request`

```json
{
  "error": "guestId is required"
}
```

#### Authentication Error

**Status Code:** `500 Internal Server Error`

```json
{
  "error": "Failed to retrieve Guesty access token"
}
```

#### Guest Not Found

**Status Code:** `404 Not Found`

```json
{
  "error": "Failed to update guest information in Guesty",
  "details": "Guest not found",
  "status": 404
}
```

#### Validation Error

**Status Code:** `400 Bad Request`

```json
{
  "error": "Failed to update guest information in Guesty",
  "details": "Invalid email format",
  "status": 400
}
```

#### Guesty API Error

**Status Code:** `4xx/5xx` (matches Guesty response)

```json
{
  "error": "Failed to update guest information in Guesty",
  "details": "Error details from Guesty API",
  "status": 422
}
```

#### General Server Error

**Status Code:** `500 Internal Server Error`

```json
{
  "error": "Internal server error",
  "details": "Error message details"
}
```

## Example Usage

### JavaScript/TypeScript

```javascript
// Update basic information
const response = await fetch('https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/update-user', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_SUPABASE_TOKEN'
  },
  body: JSON.stringify({
    guestId: 'guest_12345',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    tags: ['vip', 'repeat-guest'],
    preferredLanguage: 'en',
    dietaryPreferences: ['vegetarian'],
    allergies: ['peanuts']
  })
});

const result = await response.json();
console.log(result);
```

```javascript
// Update only specific fields
const updateResponse = await fetch('https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/update-user', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_SUPABASE_TOKEN'
  },
  body: JSON.stringify({
    guestId: 'guest_12345',
    notes: 'Updated notes about the guest',
    goodToKnowNotes: 'Prefers room on higher floor'
  })
});
```

### cURL

```bash
curl -i --location --request POST 'https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/update-user' \
  --header 'Authorization: Bearer YOUR_SUPABASE_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{
    "guestId": "guest_12345",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "tags": ["vip"],
    "preferredLanguage": "en",
    "dietaryPreferences": ["vegetarian"],
    "address": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "US"
    }
  }'
```

### Python

```python
import requests
import json

url = 'https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/update-user'
headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_SUPABASE_TOKEN'
}
data = {
    'guestId': 'guest_12345',
    'firstName': 'John',
    'lastName': 'Doe',
    'email': 'john.doe@example.com',
    'phone': '+1234567890',
    'tags': ['vip', 'repeat-guest'],
    'preferredLanguage': 'en',
    'dietaryPreferences': ['vegetarian'],
    'allergies': ['peanuts'],
    'notes': 'Prefers early check-in'
}

response = requests.post(url, headers=headers, data=json.dumps(data))
result = response.json()
print(result)
```

## Local Development

To test this function locally:

1. Start your local Supabase instance:
   ```bash
   supabase start
   ```

2. Make a test request to the local endpoint:
   ```bash
   curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/update-user' \
     --header 'Authorization: Bearer YOUR_LOCAL_TOKEN' \
     --header 'Content-Type: application/json' \
     --data '{
       "guestId": "GUEST_ID_HERE",
       "firstName": "John",
       "lastName": "Doe",
       "email": "john.doe@example.com",
       "tags": ["vip"]
     }'
   ```

## Database Schema

This function interacts with a `guesty_tokens` table that should have the following structure:

```sql
CREATE TABLE guesty_tokens (
  id SERIAL PRIMARY KEY,
  access_token TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Function Behavior

1. **CORS Handling**: The function handles CORS preflight requests to allow cross-origin requests
2. **Input Validation**: Validates that the guestId parameter is provided
3. **Selective Updates**: Only includes fields in the update payload that are explicitly provided
4. **Token Retrieval**: Fetches the Guesty access token from the database
5. **API Integration**: Makes a PATCH request to the Guesty Guests CRUD API
6. **Response Handling**: Returns the updated guest data or appropriate error messages
7. **Error Forwarding**: Forwards Guesty API error responses with their original status codes

## Data Types and Structures

### Address Object
```json
{
  "street": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zipCode": "10001",
  "country": "US"
}
```

### Contact Arrays
```json
{
  "emails": ["primary@example.com", "secondary@example.com"],
  "phones": ["+1234567890", "+0987654321"]
}
```

### Kids Array
```json
{
  "kids": [
    {
      "name": "Child Name",
      "age": 8,
      "gender": "male"
    }
  ]
}
```

### OTA Links Array
```json
{
  "otaLinks": [
    {
      "platform": "Booking.com",
      "url": "https://booking.com/profile/123"
    }
  ]
}
```

## Error Handling

The function includes comprehensive error handling for:
- Missing required parameters
- Token retrieval failures
- Guesty API errors (guest not found, validation errors, etc.)
- Invalid data formats
- Network connectivity issues
- General server errors

## CORS Support

The function includes CORS headers to allow requests from any origin:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`

## API Integration

This function integrates with the Guesty API endpoint:
- **Endpoint**: `https://open-api.guesty.com/v1/guests-crud/{guestId}`
- **Method**: `PATCH`
- **Authentication**: Bearer token from database

## Best Practices

1. **Partial Updates**: Only send fields that need to be updated
2. **Data Validation**: Ensure data formats match Guesty requirements
3. **Error Handling**: Handle validation errors gracefully
4. **Privacy**: Be mindful of sensitive personal information
5. **Logging**: Monitor updates for audit purposes

## Notes

- The function uses Deno runtime with Supabase Edge Functions
- Environment variables `SUPABASE_URL` and `SUPABASE_ANON_KEY` must be configured
- Requires a valid Guesty access token stored in the database
- Only provided fields are included in the update payload
- The function forwards Guesty API error responses with their original status codes
- Supports comprehensive guest profile management including personal, contact, and preference data
- All fields except `guestId` are optional, allowing for flexible partial updates
