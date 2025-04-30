# Token Generator Edge Function

This edge function is responsible for generating and managing Guesty API tokens. It ensures that a valid token is always available by checking the database for an existing token and generating a new one if necessary.

## Overview

The function performs the following tasks:
1. Checks if a valid token exists in the `guesty_tokens` table.
2. If no valid token is found or the token is about to expire, it generates a new token using the Guesty API.
3. Stores the newly generated token in the `guesty_tokens` table in the Supabase database.

## File Structure

- `index.ts`: The main edge function file.

## Environment Variables

The function requires the following environment variables to be set in your Supabase project:

| Variable Name               | Description                                      |
|-----------------------------|--------------------------------------------------|
| `SUPABASE_URL`              | Your Supabase project URL.                       |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key for database access.   |
| `GUESTY_CLIENT_ID`          | Guesty API client ID.                            |
| `GUESTY_CLIENT_SECRET`      | Guesty API client secret.                        |

## How It Works

1. **Token Validation**:
   - The function checks the `guesty_tokens` table for the most recent token.
   - If the token is valid and not about to expire (within 5 minutes), it is reused.

2. **Token Generation**:
   - If no valid token exists, the function sends a POST request to the Guesty API to generate a new token.
   - The token is stored in the `guesty_tokens` table, and the `expires_at` timestamp is calculated automatically by the database.

3. **Response**:
   - The function returns the token details, including the `access_token`, `expires_in`, `expires_at`, and `scope`.

## API Endpoints

### POST `https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/token-generator`

#### Request
- **Method**: `POST`
- **Headers**:
  - `Content-Type: application/json`
- **Body**: None required.

#### Response
- **Success**:
  ```json
  {
    "status": "success",
    "message": "Token retrieved successfully",
    "data": {
      "token_type": "Bearer",
      "expires_in": 3600,
      "scope": "open-api",
      "expires_at": "2023-12-31T23:59:59.000Z",
      "access_token": "your-access-token"
    }
  }
Error:
{
  "status": "error",
  "message": "Error message"
}
