# Get All Listing IDs

This Edge Function fetches all listing IDs from the Guesty API.

## Endpoint

`GET /get-all-listing-IDs`

## Description

Retrieves all listing IDs from Guesty's Open API by:
1. Fetching the Guesty access token from the `guesty_tokens` table in Supabase
2. Making a request to `https://open-api.guesty.com/v1/listings`
3. Extracting and returning the `_id` field from each listing

## Request

No request body required. This is a GET endpoint.

## Response

### Success Response (200)

```json
{
  "listingIds": ["507f1f77bcf86cd799439011", "507f191e810c19729de860ea"],
  "count": 2
}
```

- `listingIds`: Array of listing ID strings
- `count`: Total number of listing IDs returned

### Error Responses

**500 - Token Retrieval Error**
```json
{
  "error": "Failed to retrieve Guesty API token"
}
```

**500 - Guesty API Error**
```json
{
  "error": "Failed to fetch listings from Guesty"
}
```

## Environment Variables

Required:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

## Database Requirements

Requires a `guesty_tokens` table with:
- `access_token` column containing a valid Guesty API token

## Local Testing

```bash
supabase start

curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/get-all-listing-IDs' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
```

## CORS

This function includes CORS headers to allow cross-origin requests from any domain.
