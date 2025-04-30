# Retrieve All Listings Function

This is a Deno-based Supabase Edge Function that retrieves all listings data from the Guesty API. The function is designed to handle CORS, error handling, and secure access to Guesty API tokens stored in a Supabase database.

## Features
- **Deno Language Server Integration**: Provides autocomplete, go-to-definition, and other developer tools.
- **Supabase Integration**: Uses Supabase's service role key for secure database access.
- **Guesty API Integration**: Fetches all listings data from the Guesty API.
- **CORS Support**: Handles preflight and cross-origin requests.
- **Error Handling**: Provides clear error responses for invalid requests or API failures.

---

## Setup Guide

### Prerequisites
1. **Install Deno**
   Follow the setup guide for Deno: [Deno Setup Guide](https://deno.land/manual/getting_started/setup_your_environment).

2. **Set Up Supabase**
   Ensure you have a Supabase project running locally or in production. For local development, you can use the CLI command:
   ```bash
   supabase start
   ```

3. **Environment Variables**
   Set the following environment variables for the function:
   - `SUPABASE_URL`: Your Supabase project URL.
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key.

---

## Function Overview

### File Structure
- **Imports**:
  - `supabase-js`: For interacting with the Supabase database.
  - `http/server.ts`: For creating an HTTP server.
- **Supabase Client Initialization**:
  - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are used to initialize the Supabase client.
- **Guesty Token Retrieval**:
  - Queries the `guesty_tokens` table for the latest token.
- **Listings Retrieval**:
  - Fetches all listings data from the Guesty API using the retrieved token.

---

### Code Highlights

#### 1. **CORS Handling**
This function includes built-in support for CORS, enabling cross-origin requests:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};
```

#### 2. **Error Handling**
Provides detailed error messages for:
- Missing or invalid input.
- API request failures.
- Internal server errors.

#### 3. **Guesty API Integration**
Uses the `fetch` API to retrieve all listings data from Guesty:
```typescript
const response = await fetch(
  'https://open-api.guesty.com/v1/listings',
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${guestyToken}`,
      'Accept': 'application/json',
    },
  }
);
```

---

## How to Run Locally

### Steps:
1. **Start Supabase**
   ```bash
   supabase start
   ```

2. **Run the Function**
   Save the code in a file (e.g., `mod.ts`) and run it using Deno:
   ```bash
   deno run --allow-env --allow-net mod.ts
   ```

3. **Invoke the Function**
   Use `curl` or any HTTP client to call the function:
   ```bash
   curl -i --location --request POST 'https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/Retrieve-all-listings' \
     --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
     --header 'Content-Type: application/json'
   ```

### Example Response:
- **Success**:
  ```json
  {
    "status": "success",
    "data": { ...listingsData }
  }
  ```
- **Error**:
  ```json
  {
    "status": "error",
    "message": "Error message here"
  }
  ```

---

## Notes
- **Token Storage**: The function retrieves the latest Guesty token from the `guesty_tokens` table in Supabase. Ensure your database schema includes this table with the fields:
  - `access_token`: The token string.
  - `created_at`: Timestamp of token creation.
- **Security**: Do not expose your Supabase service role key or Guesty API tokens publicly.

---

## References
- [Deno Manual](https://deno.land/manual)
- [Supabase Documentation](https://supabase.com/docs)
- [Guesty Open API](https://open-api.guesty.com/)
