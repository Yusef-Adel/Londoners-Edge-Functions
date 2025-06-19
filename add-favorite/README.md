# Add Favorite Edge Function

## Overview

The `add-favorite` Supabase Edge Function allows users to add listing IDs to their favorites list. This function manages user favorites by retrieving the current favorites, checking for duplicates, and updating the database with the new favorite listing.

## Endpoint

```
POST https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/add-favorite
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
  "guestyUserId": "string",
  "listingId": "string"
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guestyUserId` | string | Yes | The unique identifier for the user in the Guesty system |
| `listingId` | string | Yes | The unique identifier for the listing to be added to favorites |

## Response Format

### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Listing added to favorites successfully",
  "favorites": ["listing_123", "listing_456", "new_listing_789"]
}
```

### Already in Favorites Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Listing is already in favorites",
  "favorites": ["listing_123", "listing_456"]
}
```

### Error Responses

#### Missing Required Parameters

**Status Code:** `400 Bad Request`

```json
{
  "error": "guestyUserId is required"
}
```

```json
{
  "error": "listingId is required"
}
```

#### User Not Found

**Status Code:** `404 Not Found`

```json
{
  "error": "User not found or database error",
  "details": "Error message details"
}
```

#### Database Update Error

**Status Code:** `500 Internal Server Error`

```json
{
  "error": "Failed to update favorites",
  "details": "Error message details"
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
const response = await fetch('https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/add-favorite', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_SUPABASE_TOKEN'
  },
  body: JSON.stringify({
    guestyUserId: '681a31ffe7bc0d02c5d57505',
    listingId: 'listing_123'
  })
});

const data = await response.json();
console.log(data);
```

### cURL

```bash
curl -i --location --request POST 'https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/add-favorite' \
  --header 'Authorization: Bearer YOUR_SUPABASE_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{
    "guestyUserId": "681a31ffe7bc0d02c5d57505",
    "listingId": "listing_123"
  }'
```

### Python

```python
import requests
import json

url = 'https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/add-favorite'
headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_SUPABASE_TOKEN'
}
data = {
    'guestyUserId': '681a31ffe7bc0d02c5d57505',
    'listingId': 'listing_123'
}

response = requests.post(url, headers=headers, data=json.dumps(data))
print(response.json())
```

## Local Development

To test this function locally:

1. Start your local Supabase instance:
   ```bash
   supabase start
   ```

2. Make a test request to the local endpoint:
   ```bash
   curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/add-favorite' \
     --header 'Authorization: Bearer YOUR_LOCAL_TOKEN' \
     --header 'Content-Type: application/json' \
     --data '{"guestyUserId":"681a31ffe7bc0d02c5d57505","listingId":"listing_123"}'
   ```

## Database Schema

This function interacts with a `users` table that should have the following structure:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  guesty_user_id TEXT UNIQUE NOT NULL,
  favorites TEXT[] DEFAULT '{}',
  -- other user fields...
);
```

## Function Behavior

1. **CORS Handling**: The function handles CORS preflight requests to allow cross-origin requests
2. **Input Validation**: Validates that both `guestyUserId` and `listingId` are provided
3. **User Lookup**: Finds the user by their Guesty user ID
4. **Duplicate Check**: Checks if the listing is already in the user's favorites
5. **Array Management**: Safely handles the favorites array, initializing it if it doesn't exist
6. **Database Update**: Updates the user's favorites array with the new listing
7. **Response**: Returns the updated favorites list or appropriate error messages

## Error Handling

The function includes comprehensive error handling for:
- Missing required parameters
- User not found scenarios
- Database connection issues
- General server errors
- Invalid request formats

## CORS Support

The function includes CORS headers to allow requests from any origin:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`

## Notes

- The function uses Deno runtime with Supabase Edge Functions
- Environment variables `SUPABASE_URL` and `SUPABASE_ANON_KEY` must be configured
- The favorites are stored as a PostgreSQL array in the database
- Duplicate listings are automatically prevented
