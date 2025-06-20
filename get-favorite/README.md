# Get Favorite Edge Function

## Overview

The `get-favorite` Supabase Edge Function retrieves a user's favorite listings with detailed property information from the Guesty API. This function fetches the user's favorite listing IDs from the database and then retrieves comprehensive property details for each listing, including images, ratings, location, and amenities.

## Endpoint

```
POST https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/get-favorite
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
  "guesty_user_id": "string"
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guesty_user_id` | string | Yes | The unique identifier for the user in the Guesty system |

## Response Format

### Success Response

**Status Code:** `200 OK`

```json
[
  {
    "id": "listing_12345",
    "name": "Beautiful Oceanview Apartment",
    "location": "Miami, United States",
    "subLocation": "123 Ocean Drive, South Beach",
    "rating": 4.8,
    "reviews": 156,
    "bedrooms": 2,
    "beds": 3,
    "baths": 2,
    "guests": 6,
    "images": [
      "https://image-url-1.jpg",
      "https://image-url-2.jpg",
      "https://image-url-3.jpg"
    ]
  },
  {
    "id": "listing_67890",
    "name": "Cozy Mountain Cabin",
    "location": "Aspen, United States",
    "subLocation": "456 Mountain View Road",
    "rating": 4.9,
    "reviews": 89,
    "bedrooms": 3,
    "beds": 4,
    "baths": 2,
    "guests": 8,
    "images": [
      "https://image-url-4.jpg",
      "https://image-url-5.jpg"
    ]
  }
]
```

### Empty Favorites Response

**Status Code:** `200 OK`

```json
[]
```

*Returns an empty array when the user has no favorites or favorites array is empty.*

### Error Responses

#### Missing Required Parameters

**Status Code:** `400 Bad Request`

```json
{
  "error": "guesty_user_id is required"
}
```

#### User Not Found

**Status Code:** `404 Not Found`

```json
{
  "error": "User not found or failed to fetch user data",
  "details": "Error message details"
}
```

#### Authentication Error

**Status Code:** `500 Internal Server Error`

```json
{
  "error": "Failed to retrieve Guesty access token"
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

## Response Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier for the listing |
| `name` | string | Property title or nickname |
| `location` | string | City and country of the property |
| `subLocation` | string | Street address or neighborhood |
| `rating` | number | Average rating (0-5 scale) |
| `reviews` | number | Total number of reviews |
| `bedrooms` | number | Number of bedrooms |
| `beds` | number | Number of beds |
| `baths` | number | Number of bathrooms |
| `guests` | number | Maximum number of guests |
| `images` | string[] | Array of image URLs for the property |

## Example Usage

### JavaScript/TypeScript

```javascript
const response = await fetch('https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/get-favorite', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_SUPABASE_TOKEN'
  },
  body: JSON.stringify({
    guesty_user_id: '681a31ffe7bc0d02c5d57505'
  })
});

const favorites = await response.json();
console.log(favorites);

// Display favorites
favorites.forEach(property => {
  console.log(`${property.name} - ${property.location}`);
  console.log(`Rating: ${property.rating}/5 (${property.reviews} reviews)`);
  console.log(`${property.bedrooms} bed, ${property.baths} bath, sleeps ${property.guests}`);
});
```

### cURL

```bash
curl -i --location --request POST 'https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/get-favorite' \
  --header 'Authorization: Bearer YOUR_SUPABASE_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{
    "guesty_user_id": "681a31ffe7bc0d02c5d57505"
  }'
```

### Python

```python
import requests
import json

url = 'https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/get-favorite'
headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_SUPABASE_TOKEN'
}
data = {
    'guesty_user_id': '681a31ffe7bc0d02c5d57505'
}

response = requests.post(url, headers=headers, data=json.dumps(data))
favorites = response.json()

for property in favorites:
    print(f"{property['name']} - {property['location']}")
    print(f"Rating: {property['rating']}/5 ({property['reviews']} reviews)")
    print(f"{property['bedrooms']} bed, {property['baths']} bath, sleeps {property['guests']}")
    print("---")
```

## Local Development

To test this function locally:

1. Start your local Supabase instance:
   ```bash
   supabase start
   ```

2. Make a test request to the local endpoint:
   ```bash
   curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-favorite' \
     --header 'Authorization: Bearer YOUR_LOCAL_TOKEN' \
     --header 'Content-Type: application/json' \
     --data '{
       "guesty_user_id": "USER_GUESTY_ID_HERE"
     }'
   ```

## Database Schema

This function interacts with two tables:

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  guesty_user_id TEXT UNIQUE NOT NULL,
  favorites TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Guesty Tokens Table
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
2. **Input Validation**: Validates that the guesty_user_id parameter is provided
3. **User Lookup**: Retrieves the user's favorites array from the database
4. **Empty Check**: Returns empty array if user has no favorites
5. **Token Retrieval**: Fetches the Guesty access token from the database
6. **Parallel Fetching**: Makes concurrent requests to fetch details for all favorite listings
7. **Data Transformation**: Transforms Guesty API responses into a consistent format
8. **Error Handling**: Gracefully handles individual listing fetch failures
9. **Response Filtering**: Filters out any listings that failed to fetch

## Error Handling

The function includes comprehensive error handling for:
- Missing required parameters
- User not found scenarios
- Token retrieval failures
- Individual listing fetch failures (logged but don't break the entire response)
- Network connectivity issues
- General server errors

## CORS Support

The function includes CORS headers to allow requests from any origin:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`

## API Integration

This function integrates with the Guesty API endpoint:
- **Endpoint**: `https://open-api.guesty.com/v1/listings/{listingId}`
- **Method**: `GET`
- **Authentication**: Bearer token from database

## Performance Considerations

- **Parallel Processing**: Uses `Promise.all()` to fetch all listings concurrently
- **Resilient Design**: Individual listing failures don't affect other listings
- **Fallback Values**: Provides default values for missing property data
- **Image Handling**: Provides placeholder images when property images are unavailable

## Notes

- The function uses Deno runtime with Supabase Edge Functions
- Environment variables `SUPABASE_URL` and `SUPABASE_ANON_KEY` must be configured
- Requires a valid Guesty access token stored in the database
- Returns empty array for users with no favorites (not an error condition)
- Failed individual listing fetches are logged but don't break the entire response
- Property images include fallback to placeholder when unavailable
- Location formatting removes leading/trailing commas for better display
