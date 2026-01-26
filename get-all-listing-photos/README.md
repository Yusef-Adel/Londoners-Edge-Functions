# Get All Listing Photos

## Overview
This Supabase Edge Function retrieves all photos for a specific property from the Guesty API.

## Endpoint
`POST /functions/v1/get-all-listing-photos`

## Description
Fetches property photos from Guesty's property-photos API endpoint using the stored Guesty access token from the Supabase database.

## Request

### Headers
```
Authorization: Bearer <SUPABASE_ANON_KEY>
Content-Type: application/json
```

### Body Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| propertyId | string | Yes | The unique identifier of the property in Guesty |

### Example Request
```json
{
  "propertyId": "507f1f77bcf86cd799439011"
}
```

## Response

### Success Response (200 OK)
```json
{
  "success": true,
  "propertyId": "507f1f77bcf86cd799439011",
  "photos": [
    {
      "id": "photo-id-1",
      "url": "https://example.com/photo1.jpg",
      "thumbnail": "https://example.com/photo1-thumb.jpg",
      "order": 1,
      "caption": "Living Room"
    },
    {
      "id": "photo-id-2",
      "url": "https://example.com/photo2.jpg",
      "thumbnail": "https://example.com/photo2-thumb.jpg",
      "order": 2,
      "caption": "Bedroom"
    }
  ],
  "count": 2
}
```

### Error Responses

#### 400 Bad Request - Missing Property ID
```json
{
  "error": "propertyId is required"
}
```

#### 500 Internal Server Error - Token Retrieval Failed
```json
{
  "error": "Failed to retrieve Guesty API token"
}
```

#### 4xx/5xx - Guesty API Error
```json
{
  "error": "Failed to fetch property photos from Guesty",
  "details": "Detailed error message from Guesty"
}
```

## How It Works

1. **Request Validation**: Validates that `propertyId` is provided in the request body
2. **Token Retrieval**: Fetches the Guesty access token from the `guesty_tokens` table in Supabase
3. **API Call**: Makes a GET request to Guesty's property-photos endpoint:
   ```
   GET https://open-api.guesty.com/v1/properties-api/property-photos/property-photos/{propertyId}
   ```
4. **Response**: Returns the photos data along with success status and photo count

## Testing

### Local Testing
```bash
# Start Supabase locally
supabase start

# Make a test request
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-all-listing-photos' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"propertyId":"507f1f77bcf86cd799439011"}'
```

### Production Testing
```bash
curl -i --location --request POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/get-all-listing-photos' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"propertyId":"507f1f77bcf86cd799439011"}'
```

## Dependencies
- `@supabase/functions-js` - Supabase Edge Runtime
- `@supabase/supabase-js` - Supabase client library

## Database Requirements
This function requires access to the `guesty_tokens` table with the following structure:
- `access_token` (string): Valid Guesty API access token

## CORS Configuration
This function includes CORS headers to allow cross-origin requests from any origin (`*`). Modify the `corsHeaders` object in the code to restrict access as needed.

## Error Handling
The function includes comprehensive error handling for:
- Missing or invalid request parameters
- Database connection issues
- Token retrieval failures
- Guesty API errors
- Network errors

All errors are logged to the console and returned with appropriate HTTP status codes.

## Notes
- The Guesty access token must be valid and have proper permissions to access the property-photos API
- Property IDs should be valid Guesty property identifiers
- The response structure depends on Guesty's API response format
- Ensure the `guesty_tokens` table is properly maintained with valid tokens
