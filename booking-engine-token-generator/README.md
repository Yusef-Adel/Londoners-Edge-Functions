# Booking Engine Token Generator

This edge function manages OAuth2 access tokens for the Guesty Booking Engine API. It automatically generates, stores, and refreshes tokens to ensure you always have a valid token available.

## Features

- **Automatic Token Generation**: Fetches OAuth2 tokens from Guesty Booking Engine API
- **Token Storage**: Stores tokens in Supabase database (`guesty_booking_engine_tokens` table)
- **Token Validation**: Checks token expiry and automatically refreshes when needed
- **Cron Job Support**: Can be called by cron jobs for automated token refresh
- **CORS Support**: Handles CORS preflight requests

## Environment Variables

Required environment variables in Supabase:

- `GUESTY_BOOKING_ENGINE_CLIENT_ID`: Your Guesty Booking Engine application client ID
- `GUESTY_BOOKING_ENGINE_CLIENT_SECRET`: Your Guesty Booking Engine application client secret
- `SUPABASE_URL`: Your Supabase project URL (auto-provided)
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (auto-provided)
- `SUPABASE_ANON_KEY`: Your Supabase anon key (auto-provided)

## Database Table

You need to create a table called `guesty_booking_engine_tokens` with the following schema:

```sql
CREATE TABLE guesty_booking_engine_tokens (
  id BIGSERIAL PRIMARY KEY,
  token_type TEXT NOT NULL,
  expires_in INTEGER NOT NULL,
  access_token TEXT NOT NULL,
  scope TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Usage

### Manual API Call

```bash
curl --location --request POST 'https://your-project.supabase.co/functions/v1/booking-engine-token-generator' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json'
```

### Cron Job (Recommended)

Set up a cron job in Supabase to refresh the token every 24 hours:

1. Go to your Supabase Dashboard
2. Navigate to Database > Cron Jobs
3. Create a new cron job with the following SQL:

```sql
SELECT
  net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/booking-engine-token-generator',
    headers := '{"Content-Type": "application/json"}'::jsonb
  ) AS request_id;
```

Schedule: `0 0 * * *` (runs daily at midnight)

## Response Format

### Success Response

```json
{
  "status": "success",
  "message": "New booking engine token generated",
  "data": {
    "token_type": "Bearer",
    "expires_in": 86400,
    "scope": "booking_engine:api",
    "expires_at": "2025-11-23T00:00:00.000Z",
    "access_token": "your_access_token_here"
  }
}
```

### Cron Job Success Response

```json
{
  "status": "success",
  "message": "Booking Engine token refreshed by cron job",
  "details": {
    "expires_at": "2025-11-23T00:00:00.000Z",
    "hours_until_expiry": "24.00"
  }
}
```

### Error Response

```json
{
  "status": "error",
  "message": "Error description"
}
```

## How It Works

1. **Cron Job Detection**: The function detects if it's being called by a cron job (via user-agent header)
2. **Authentication**: Regular API calls require authentication with Supabase keys
3. **Token Validation**: Checks if a valid token exists in the database (expires in more than 5 minutes)
4. **Token Generation**: If no valid token exists or called by cron job, generates a new token from Guesty Booking Engine API
5. **Token Storage**: Stores the new token in the database (only one token is maintained at a time)
6. **Response**: Returns the token data or confirmation message

## Token Lifecycle

- Tokens are valid for the duration specified by the API (typically 24 hours)
- The function considers a token expired if it has less than 5 minutes until expiry
- Only one token is stored at a time - old tokens are deleted when generating new ones
- Expired tokens are cleaned up automatically

## Security

- Authentication required for manual API calls (Supabase anon key or service role key)
- Cron jobs bypass authentication (identified by pg_net user-agent)
- Tokens are stored securely in Supabase database
- CORS configured to allow all origins (modify if needed for production)
