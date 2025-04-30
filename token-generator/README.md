# Londoners Edge Functions

This repository contains the **Supabase Edge Function** for generating and managing Guesty API tokens.

## Overview

The edge function:
1. Generates a new token from the Guesty API.
2. Stores the token in a Supabase database.
3. Checks if a valid token exists and reuses it if possible.
4. Automatically generates a new token if the current one is expired or about to expire.

## File Structure

- `index.ts`: The main edge function file.
- `README.md`: Documentation for the edge function.

## Environment Variables

The function requires the following environment variables to be set in your Supabase project:

| Variable Name               | Description                                      |
|-----------------------------|--------------------------------------------------|
| `SUPABASE_URL`              | Your Supabase project URL.                       |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key for database access.   |
| `GUESTY_CLIENT_ID`          | Guesty API client ID.                            |
| `GUESTY_CLIENT_SECRET`      | Guesty API client secret.                        |

## How It Works

1. **Token Generation**:
   - The function sends a POST request to the Guesty API with the required credentials.
   - The API responds with an access token and expiration details.

2. **Database Storage**:
   - The token is stored in the `guesty_tokens` table in the Supabase database.
   - A database trigger calculates the `expires_at` timestamp.

3. **Token Validation**:
   - The function checks if a valid token exists in the database.
   - If no valid token exists, a new one is generated.

## Deployment

1. Deploy the edge function to your Supabase project:
   ```bash
   supabase functions deploy token-generator