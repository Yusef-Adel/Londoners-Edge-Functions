# Delete Favorite Edge Function

## Overview

The `delete-favorite` Supabase Edge Function removes a specific listing from a user's favorites list. This function validates that the listing exists in the user's favorites before removing it, ensuring data integrity and providing appropriate feedback for both successful removals and cases where the listing wasn't favorited.

## Endpoint

```
POST https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/delete-favorite
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
  "guesty_user_id": "string",
  "listingId": "string"
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guesty_user_id` | string | Yes | The unique identifier for the user in the Guesty system |
| `listingId` | string | Yes | The unique identifier for the listing to be removed from favorites |

## Response Format

### Success Response

**Status Code:** `200 OK`

```json
{
  "message": "Listing removed from favorites successfully",
  "listingId": "listing_12345",
  "favorites": ["listing_67890", "listing_54321"]
}
```

### Listing Not in Favorites Response

**Status Code:** `404 Not Found`

```json
{
  "error": "Listing not found in user favorites",
  "favorites": ["listing_67890", "listing_54321"]
}
```

*Note: This response includes the current favorites array so the client can verify the current state.*

### Error Responses

#### Missing Required Parameters

**Status Code:** `400 Bad Request`

```json
{
  "error": "guesty_user_id is required"
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
  "error": "User not found or failed to fetch user data",
  "details": "Error message details"
}
```

#### Database Update Error

**Status Code:** `500 Internal Server Error`

```json
{
  "error": "Failed to update user favorites",
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
const response = await fetch('https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/delete-favorite', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_SUPABASE_TOKEN'
  },
  body: JSON.stringify({
    guesty_user_id: '681a31ffe7bc0d02c5d57505',
    listingId: 'listing_12345'
  })
});

const result = await response.json();

if (response.ok) {
  console.log('Listing removed successfully');
  console.log('Updated favorites:', result.favorites);
} else if (response.status === 404 && result.error.includes('not found in user favorites')) {
  console.log('Listing was not in favorites');
  console.log('Current favorites:', result.favorites);
} else {
  console.error('Error removing favorite:', result.error);
}
```

### React Hook Example

```javascript
import { useState } from 'react';

const useFavorites = () => {
  const [isLoading, setIsLoading] = useState(false);

  const removeFavorite = async (guestyUserId, listingId) => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/delete-favorite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer YOUR_SUPABASE_TOKEN'
        },
        body: JSON.stringify({
          guesty_user_id: guestyUserId,
          listingId: listingId
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        return { success: true, favorites: result.favorites };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  return { removeFavorite, isLoading };
};
```

### cURL

```bash
curl -i --location --request POST 'https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/delete-favorite' \
  --header 'Authorization: Bearer YOUR_SUPABASE_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{
    "guesty_user_id": "681a31ffe7bc0d02c5d57505",
    "listingId": "listing_12345"
  }'
```

### Python

```python
import requests
import json

url = 'https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/delete-favorite'
headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_SUPABASE_TOKEN'
}
data = {
    'guesty_user_id': '681a31ffe7bc0d02c5d57505',
    'listingId': 'listing_12345'
}

response = requests.post(url, headers=headers, data=json.dumps(data))
result = response.json()

if response.status_code == 200:
    print(f"Removed listing {result['listingId']} from favorites")
    print(f"Updated favorites: {result['favorites']}")
elif response.status_code == 404 and 'not found in user favorites' in result['error']:
    print("Listing was not in favorites")
    print(f"Current favorites: {result['favorites']}")
else:
    print(f"Error: {result['error']}")
```

## Local Development

To test this function locally:

1. Start your local Supabase instance:
   ```bash
   supabase start
   ```

2. Make a test request to the local endpoint:
   ```bash
   curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/delete-favorite' \
     --header 'Authorization: Bearer YOUR_LOCAL_TOKEN' \
     --header 'Content-Type: application/json' \
     --data '{
       "guesty_user_id": "USER_GUESTY_ID_HERE",
       "listingId": "LISTING_ID_TO_REMOVE"
     }'
   ```

## Database Schema

This function interacts with a `users` table that should have the following structure:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  guesty_user_id TEXT UNIQUE NOT NULL,
  favorites TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Function Behavior

1. **CORS Handling**: The function handles CORS preflight requests to allow cross-origin requests
2. **Input Validation**: Validates that both `guesty_user_id` and `listingId` are provided
3. **User Lookup**: Retrieves the user's current favorites from the database
4. **Array Initialization**: Safely handles null/undefined favorites arrays
5. **Existence Check**: Verifies the listing exists in the user's favorites before attempting removal
6. **Array Filtering**: Removes the specified listing from the favorites array
7. **Database Update**: Updates the user's favorites array in the database
8. **Response Generation**: Returns the updated favorites list or appropriate error messages

## Error Handling

The function includes comprehensive error handling for:
- Missing required parameters
- User not found scenarios
- Listing not in favorites (returned as structured response, not error)
- Database connection issues
- Database update failures
- General server errors
- Invalid data formats

## CORS Support

The function includes CORS headers to allow requests from any origin:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`

## Response Patterns

### Successful Removal
- **Status**: 200 OK
- **Includes**: Success message, removed listing ID, updated favorites array

### Listing Not Found in Favorites
- **Status**: 404 Not Found
- **Includes**: Descriptive error message, current favorites array for verification
- **Note**: This is not a system error but a business logic response

### System Errors
- **Status**: 400, 404, 500 (depending on error type)
- **Includes**: Error message and details where applicable

## Edge Cases Handled

1. **Null/Undefined Favorites**: Safely initializes empty array
2. **Non-Array Favorites**: Converts to empty array if data is corrupted
3. **Duplicate Removal Attempts**: Returns appropriate "not found" response
4. **Empty Favorites Array**: Handles gracefully without errors

## Notes

- The function uses Deno runtime with Supabase Edge Functions
- Environment variables `SUPABASE_URL` and `SUPABASE_ANON_KEY` must be configured
- The function only removes one instance of the listing ID (no duplicates expected)
- Returns updated favorites array for client state synchronization
- Treats "listing not in favorites" as a structured response rather than an error
- Safely handles edge cases with favorites array initialization
- Database operations use single() method expecting one user record per guesty_user_id
