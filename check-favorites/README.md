# Check Favorites Edge Function

A Supabase Edge Function that checks whether a specific listing is marked as a favorite by a user.

## Overview

This function queries the user's favorites list in the database to determine if a specific listing ID is marked as a favorite. It's designed to work with the favorites system where user preferences are stored as an array of listing IDs in the user's profile.

## API Endpoint

- **Method:** POST
- **Local URL:** `http://127.0.0.1:54321/functions/v1/check-favorites`
- **Production URL:** `https://your-project-ref.supabase.co/functions/v1/check-favorites`

## Authentication

This function requires Supabase authentication. Include the authorization header with a valid JWT token.

## Request Format

Send a POST request with a JSON body containing the required parameters:

```json
{
  "guesty_user_id": "user_123",
  "listing_id": "listing_456"
}
```

## Request Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `guesty_user_id` | string | Yes | The Guesty user ID to check favorites for | `"user_123"` |
| `listing_id` | string | Yes | The listing ID to check in favorites | `"listing_456"` |

## Response Format

### Success Response

```json
{
  "isFavorite": true
}
```

or

```json
{
  "isFavorite": false
}
```

### Error Responses

#### Missing Required Parameters

```json
{
  "error": "guesty_user_id is required"
}
```

```json
{
  "error": "listing_id is required"
}
```

#### User Not Found

```json
{
  "error": "User not found or failed to fetch user data",
  "details": "Error details from database",
  "isFavorite": false
}
```

#### Internal Server Error

```json
{
  "error": "Internal server error",
  "details": "Error details",
  "isFavorite": false
}
```

## Usage Examples

### Using cURL

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/check-favorites' \
  --header 'Authorization: Bearer YOUR_JWT_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{
    "guesty_user_id": "user_123",
    "listing_id": "listing_456"
  }'
```

### JavaScript/TypeScript

#### Basic Fetch Example

```javascript
const checkFavorite = async (guestyUserId, listingId, authToken) => {
  const response = await fetch('http://127.0.0.1:54321/functions/v1/check-favorites', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      guesty_user_id: guestyUserId,
      listing_id: listingId
    })
  });
  
  const data = await response.json();
  return data.isFavorite;
};

// Usage
const isFavorite = await checkFavorite('user_123', 'listing_456', 'your_jwt_token');
console.log('Is favorite:', isFavorite);
```

#### With Error Handling

```javascript
const checkFavoriteWithErrorHandling = async (guestyUserId, listingId, authToken) => {
  try {
    const response = await fetch('http://127.0.0.1:54321/functions/v1/check-favorites', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        guesty_user_id: guestyUserId,
        listing_id: listingId
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      return { success: true, isFavorite: data.isFavorite };
    } else {
      return { success: false, error: data.error, isFavorite: false };
    }
  } catch (error) {
    return { success: false, error: 'Network error', isFavorite: false };
  }
};

// Usage
const result = await checkFavoriteWithErrorHandling('user_123', 'listing_456', 'token');
if (result.success) {
  console.log('Is favorite:', result.isFavorite);
} else {
  console.error('Error:', result.error);
}
```

### React Hook Example

```javascript
import { useState, useEffect } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';

const useFavoriteStatus = (listingId) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const supabase = useSupabaseClient();
  const user = useUser();

  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!user || !listingId) return;

      setLoading(true);
      setError(null);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch('/api/check-favorites', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            guesty_user_id: user.user_metadata.guesty_user_id,
            listing_id: listingId
          })
        });

        const data = await response.json();
        
        if (response.ok) {
          setIsFavorite(data.isFavorite);
        } else {
          setError(data.error);
        }
      } catch (err) {
        setError('Failed to check favorite status');
      } finally {
        setLoading(false);
      }
    };

    checkFavoriteStatus();
  }, [user, listingId, supabase]);

  return { isFavorite, loading, error };
};

// Usage in component
const ListingCard = ({ listing }) => {
  const { isFavorite, loading, error } = useFavoriteStatus(listing.id);

  return (
    <div className="listing-card">
      <h3>{listing.title}</h3>
      {loading ? (
        <span>Checking favorite status...</span>
      ) : error ? (
        <span>Error: {error}</span>
      ) : (
        <span>{isFavorite ? '❤️ Favorited' : '🤍 Not favorited'}</span>
      )}
    </div>
  );
};
```

### TypeScript Interfaces

```typescript
interface CheckFavoriteRequest {
  guesty_user_id: string;
  listing_id: string;
}

interface CheckFavoriteResponse {
  isFavorite: boolean;
}

interface CheckFavoriteErrorResponse {
  error: string;
  details?: string;
  isFavorite: false;
}

const checkFavorite = async (
  request: CheckFavoriteRequest,
  authToken: string
): Promise<CheckFavoriteResponse | CheckFavoriteErrorResponse> => {
  const response = await fetch('http://127.0.0.1:54321/functions/v1/check-favorites', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request)
  });
  
  return await response.json();
};
```

## Database Schema

This function expects the following database structure:

### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guesty_user_id TEXT UNIQUE NOT NULL,
  favorites TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

The `favorites` column should be an array of listing IDs (strings).

## Business Logic

1. **Input Validation**: Checks that both `guesty_user_id` and `listing_id` are provided
2. **User Lookup**: Queries the `users` table for the specified `guesty_user_id`
3. **Favorites Check**: Examines the user's `favorites` array to see if it contains the `listing_id`
4. **Response**: Returns a boolean indicating whether the listing is favorited

## Error Handling

The function handles several error scenarios:

- **Missing Parameters**: Returns 400 status with specific error message
- **User Not Found**: Returns 404 status with error details
- **Database Errors**: Returns 500 status with error information
- **Invalid JSON**: Returns 500 status with parsing error

All error responses include `isFavorite: false` for consistent client-side handling.

## Response Status Codes

| Status Code | Description | Response Body |
|-------------|-------------|---------------|
| 200 | Success | `{"isFavorite": boolean}` |
| 400 | Bad Request (missing parameters) | `{"error": "parameter is required"}` |
| 404 | User Not Found | `{"error": "User not found...", "details": "...", "isFavorite": false}` |
| 500 | Internal Server Error | `{"error": "Internal server error", "details": "...", "isFavorite": false}` |

## Security Considerations

- **Authentication Required**: Function requires valid JWT token
- **User Isolation**: Only checks favorites for the specified user
- **Input Validation**: Validates required parameters before database operations
- **CORS Enabled**: Supports cross-origin requests with proper headers

## Integration with Other Functions

This function is typically used in conjunction with:

- **add-favorite**: To add listings to favorites
- **delete-favorite**: To remove listings from favorites  
- **get-favorite**: To retrieve all user favorites
- **listing-search**: To mark search results with favorite status

## Performance Considerations

- **Single Query**: Makes only one database query per request
- **Indexed Lookup**: Uses `guesty_user_id` which should be indexed
- **Array Operations**: PostgreSQL array operations are generally efficient
- **Lightweight Response**: Returns minimal data for fast processing

## Development

### Local Testing

1. Start Supabase locally: `supabase start`
2. Ensure the `users` table exists with proper schema
3. Create test data with sample users and favorites
4. Use the provided curl examples for testing

### Environment Variables

Required environment variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key

### Dependencies

- Deno runtime
- Supabase client library
- Valid JWT authentication token

## Troubleshooting

### Common Issues

#### "User not found" Error
- Verify the `guesty_user_id` exists in the database
- Check that the `users` table has the correct schema
- Ensure the user record has been created properly

#### Authentication Errors
- Verify the JWT token is valid and not expired
- Check that the authorization header is properly formatted
- Ensure the user has proper permissions

#### Database Connection Issues
- Verify Supabase environment variables are set correctly
- Check database connectivity and permissions
- Ensure the `users` table exists and is accessible

### Debugging

Enable detailed logging by checking the Supabase Edge Functions logs:

```bash
supabase functions logs check-favorites
```

The function includes comprehensive error logging to help identify issues.

## Example Responses

### Successful Check (Favorited)

```json
{
  "isFavorite": true
}
```

### Successful Check (Not Favorited)

```json
{
  "isFavorite": false
}
```

### Missing User ID

```json
{
  "error": "guesty_user_id is required"
}
```

### User Not Found

```json
{
  "error": "User not found or failed to fetch user data",
  "details": "No rows returned",
  "isFavorite": false
}
```
