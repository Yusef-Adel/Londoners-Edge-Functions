# Get Property Videos Edge Function

This Supabase Edge Function retrieves video data for a specific property listing from the `listing_video` table.

## Overview

The function accepts a property listing ID and returns all associated video records from the database. It includes comprehensive error handling, CORS support, and proper authentication validation.

## API Specification

### Endpoint
```
POST /functions/v1/get-property-videos
```

### Authentication
Requires a valid Authorization header with a Bearer token.

### Request Body
```json
{
  "listing_id": "string (required)"
}
```

### Response Format

#### Success Response (200)
```json
[
  {
    "id": "uuid",
    "listing_id": "string",
    "video_url": "string",
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
]
```

#### Error Responses

**400 Bad Request**
```json
{
  "error": "Missing listing_id in request body"
}
```

**401 Unauthorized**
```json
{
  "error": "Missing Authorization header"
}
```

**405 Method Not Allowed**
```json
{
  "error": "Method not allowed"
}
```

**500 Internal Server Error**
```json
{
  "error": "Internal server error",
  "details": "Error details"
}
```

## Usage Examples

### cURL
```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-property-videos' \
  --header 'Authorization: Bearer YOUR_AUTH_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{"listing_id":"your-listing-id-here"}'
```

### JavaScript/TypeScript
```typescript
const response = await fetch('/functions/v1/get-property-videos', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    listing_id: 'your-listing-id-here'
  })
});

const videos = await response.json();
```

### Python
```python
import requests

url = "http://localhost:54321/functions/v1/get-property-videos"
headers = {
    "Authorization": "Bearer YOUR_AUTH_TOKEN",
    "Content-Type": "application/json"
}
data = {
    "listing_id": "your-listing-id-here"
}

response = requests.post(url, headers=headers, json=data)
videos = response.json()
```

## Features

- ✅ **CORS Support**: Handles cross-origin requests
- ✅ **Method Validation**: Only accepts POST requests
- ✅ **Authentication**: Validates Authorization header
- ✅ **Input Validation**: Validates required fields
- ✅ **Error Handling**: Comprehensive error responses
- ✅ **JSON Parsing**: Safe JSON parsing with error handling

## Database Schema

The function queries the `listing_video` table with the following expected structure:

```sql
CREATE TABLE listing_video (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id TEXT NOT NULL,
  video_url TEXT,
  video_title TEXT,
  video_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Environment Variables

Ensure these environment variables are set in your Supabase project:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key

## Local Development

1. Start Supabase locally:
   ```bash
   supabase start
   ```

2. Deploy the function:
   ```bash
   supabase functions deploy get-property-videos
   ```

3. Test the function:
   ```bash
   curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-property-videos' \
     --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
     --header 'Content-Type: application/json' \
     --data '{"listing_id":"test-listing-id"}'
   ```

## Error Handling

The function implements comprehensive error handling:

1. **CORS Preflight**: Handles OPTIONS requests for browser compatibility
2. **Method Validation**: Rejects non-POST requests
3. **Authentication**: Validates Authorization header presence
4. **JSON Parsing**: Safely parses request body with error handling
5. **Input Validation**: Validates required `listing_id` field
6. **Database Errors**: Handles and reports database query errors
7. **Unexpected Errors**: Catches and logs unexpected errors

## Security Considerations

- All requests require valid authentication
- Input validation prevents injection attacks
- CORS headers are properly configured
- Error messages don't expose sensitive information
- All database queries use parameterized queries through Supabase client

## Performance Notes

- Function uses Supabase client for optimal database connections
- No caching implemented - consider adding for frequently accessed data
- Direct database query for best performance
- Minimal processing overhead

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check that Authorization header is included and valid
2. **400 Bad Request**: Ensure `listing_id` is included in request body
3. **500 Internal Server Error**: Check database connection and table schema
4. **CORS Errors**: Function includes CORS headers, check client-side configuration

### Debugging

Enable function logs in Supabase dashboard to see detailed error information and request logs.

## Contributing

When modifying this function:

1. Maintain backward compatibility
2. Update this README for any API changes
3. Add appropriate error handling
4. Test with various input scenarios
5. Validate CORS functionality for browser clients
