# Get User Edge Function

## Overview

The `get-user` Supabase Edge Function retrieves guest information from the Guesty API using a guest ID. This function serves as a proxy to fetch detailed guest data including personal information, contact details, and other relevant guest attributes.

## Endpoint

```
POST https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/get-user
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
  "guestId": "string"
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guestId` | string | Yes | The unique identifier for the guest in the Guesty system |

## Response Format

### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "guest_12345",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "address": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "US"
    },
    "dateOfBirth": "1990-01-01",
    "nationality": "US",
    "passportNumber": "ABC123456",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-06-19T16:44:52Z"
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
  "error": "Failed to fetch guest information from Guesty",
  "details": "Guest not found",
  "status": 404
}
```

#### Guesty API Error

**Status Code:** `4xx/5xx` (matches Guesty response)

```json
{
  "error": "Failed to fetch guest information from Guesty",
  "details": "Error details from Guesty API",
  "status": 400
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
const response = await fetch('https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/get-user', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_SUPABASE_TOKEN'
  },
  body: JSON.stringify({
    guestId: 'guest_12345'
  })
});

const data = await response.json();
console.log(data);
```

### cURL

```bash
curl -i --location --request POST 'https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/get-user' \
  --header 'Authorization: Bearer YOUR_SUPABASE_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{
    "guestId": "guest_12345"
  }'
```

### Python

```python
import requests
import json

url = 'https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/get-user'
headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_SUPABASE_TOKEN'
}
data = {
    'guestId': 'guest_12345'
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
   curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-user' \
     --header 'Authorization: Bearer YOUR_LOCAL_TOKEN' \
     --header 'Content-Type: application/json' \
     --data '{
       "guestId": "GUEST_ID_HERE"
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
3. **Token Retrieval**: Fetches the Guesty access token from the database
4. **Guesty API Call**: Makes a GET request to the Guesty Guests CRUD API
5. **Response Handling**: Returns the guest data or appropriate error messages
6. **Error Forwarding**: Forwards Guesty API error responses with their original status codes

## Error Handling

The function includes comprehensive error handling for:
- Missing required parameters
- Token retrieval failures
- Guesty API errors (guest not found, unauthorized, etc.)
- Network connectivity issues
- General server errors

## CORS Support

The function includes CORS headers to allow requests from any origin:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`

## API Integration

This function integrates with the Guesty API endpoint:
- **Endpoint**: `https://open-api.guesty.com/v1/guests-crud/{guestId}`
- **Method**: `GET`
- **Authentication**: Bearer token from database

## Notes

- The function uses Deno runtime with Supabase Edge Functions
- Environment variables `SUPABASE_URL` and `SUPABASE_ANON_KEY` must be configured
- Requires a valid Guesty access token stored in the database
- The function acts as a proxy to the Guesty API, forwarding error responses with their original status codes
- Response data structure depends on the Guesty API response format
- Guest information may include sensitive personal data - ensure proper access controls
