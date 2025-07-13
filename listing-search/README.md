# Listing Search Edge Function

This Supabase Edge Function searches Guesty listings and returns structured property data, including accurate property details and real review/rating data from your review system.

## Features

- **Accurate property details**: Returns correct values for bedrooms, beds, bathrooms, and guests using Guesty API fields.
- **Real review/rating integration**: Calls the `get-review` edge function for each listing to return:
  - `rating`: The real overall average rating from your review system
  - `reviews`: The real number of reviews (from review API, not Guesty stats)
- **Rich property data**: Includes title, location, area, price, images, amenities, and more.
- **Pagination and filtering**: Supports search, city, occupancy, and more.
- **CORS support**: Handles cross-origin requests.
- **Error handling**: Proper error responses for missing data or failed API calls.

## Setup

1. **Database Requirements**:
   - A table called `guesty_tokens` with a column:
     - `access_token` (TEXT)

2. **Review Edge Function**:
   - The function calls `https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/get-review` for each listing, passing the listing ID and using the Supabase service role key for authentication.

## API Endpoint

- **Method:** POST
- **Local URL:** `http://127.0.0.1:54321/functions/v1/listing-search`
- **Production URL:** `https://your-project-ref.supabase.co/functions/v1/listing-search`

## Request Format

Send a POST request with a JSON body containing search parameters:

```json
{
  "parameter": "value",
  "available": {
    "checkIn": "2025-07-01",
    "checkOut": "2025-07-07",
    "minOccupancy": 2
  }
}
```

## Supported Parameters

### Basic Search Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `q` | string | Search query for title, internal notes, or address | `"beach house"` |
| `city` | string | Filter by city name | `"Miami"` |
| `ids` | string | Comma-separated list of specific listing IDs | `"id1,id2,id3"` |
| `nids` | string | Comma-separated list of listing IDs to exclude | `"id4,id5"` |
| `tags` | string | Filter by listing tags | `"pool,wifi"` |

### Availability & Occupancy

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `available` | object | Availability and occupancy filter | See below |
| `available.checkIn` | string | Check-in date (YYYY-MM-DD) | `"2025-07-01"` |
| `available.checkOut` | string | Check-out date (YYYY-MM-DD) | `"2025-07-07"` |
| `available.minOccupancy` | number | Minimum guest capacity | `2` |
| `ignoreFlexibleBlocks` | boolean | Include listings with flexible booking blocks | `false` |

### Status Filters

| Parameter | Type | Description | Default | Example |
|-----------|------|-------------|---------|---------|
| `active` | boolean | Filter by active status | `true` | `true` |
| `listed` | boolean | Filter by listed status | `true` | `true` |
| `pmsActive` | boolean | Filter by PMS active status | `true` | `true` |

### Advanced Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `viewId` | string | Use a specific saved view | `"view123"` |
| `integrationId` | string | Filter by integration ID | `"integration456"` |
| `fields` | string | Specify fields to return (space-separated) | `"title address pricing"` |
| `sort` | string | Sort field (use `-` for descending) | `"title"` or `"-title"` |

### Pagination

| Parameter | Type | Description | Default | Max | Example |
|-----------|------|-------------|---------|-----|---------|
| `limit` | number | Number of results to return | `25` | `100` | `50` |
| `skip` | number | Number of results to skip | `0` | - | `25` |

### Testing Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `testOccupancyOnly` | boolean | Test occupancy filtering without date restrictions | `true` |

## Response Format

### Success Response

```json
{
  "status": "success",
  "message": "Listings retrieved successfully",
  "data": [
    {
      "id": "listing_id",
      "title": "Beautiful Beach House",
      "location": "Miami, United States",
      "area": "South Beach",
      "rating": 4.8,
      "reviews": 127,
      "bedroom": 3,
      "beds": 4,
      "bath": 2,
      "guests": 6,
      "dateRange": "Available Now",
      "pricePerNight": 250,
      "totalPrice": 1750,
      "images": ["url1", "url2", "url3"],
      "isFavorite": false,
      "amenities": ["WiFi", "Pool", "Kitchen"]
    }
  ],
  "totalCount": 42,
  "page": 1,
  "limit": 25
}
```

### Error Response

```json
{
  "status": "error",
  "message": "Error description",
  "details": "Detailed error information"
}
```

## Usage Examples

### Basic Search

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/listing-search' \
  --header 'Content-Type: application/json' \
  --data-raw '{}'
```

### Search by Query

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/listing-search' \
  --header 'Content-Type: application/json' \
  --data-raw '{"q":"beach house","limit":10}'
```

### Search by City

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/listing-search' \
  --header 'Content-Type: application/json' \
  --data-raw '{"city":"Miami","limit":15}'
```

### Availability Search

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/listing-search' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "available": {
      "checkIn": "2025-07-01",
      "checkOut": "2025-07-07", 
      "minOccupancy": 2
    },
    "limit": 20
  }'
```

### Advanced Search

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/listing-search' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "city": "Miami",
    "active": true,
    "listed": true,
    "pmsActive": true,
    "available": {
      "checkIn": "2025-07-15",
      "checkOut": "2025-07-20",
      "minOccupancy": 4
    },
    "ignoreFlexibleBlocks": false,
    "tags": "pool,wifi",
    "sort": "title",
    "limit": 25,
    "skip": 0
  }'
```

### Test Occupancy Only (No Date Restrictions)

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/listing-search' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "available": {
      "minOccupancy": 2
    },
    "testOccupancyOnly": true
  }'
```

### Pagination Example

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/listing-search' \
  --header 'Content-Type: application/json' \
  --data-raw '{"limit":10,"skip":20}'
```

### Custom Fields

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/listing-search' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "fields": "title address accommodationDetails pricing pictures",
    "limit": 10
  }'
```

## JavaScript/TypeScript Usage

### Basic Fetch Example

```javascript
const searchListings = async (params = {}) => {
  const response = await fetch('http://127.0.0.1:54321/functions/v1/listing-search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params)
  });
  
  return await response.json();
};

// Usage
const results = await searchListings({
  city: "Miami",
  available: {
    checkIn: "2025-07-01",
    checkOut: "2025-07-07",
    minOccupancy: 2
  },
  limit: 10
});
```

### React Hook Example

```javascript
import { useState, useEffect } from 'react';

const useListingSearch = (searchParams) => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const searchListings = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch('http://127.0.0.1:54321/functions/v1/listing-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(searchParams)
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
          setListings(data.data);
        } else {
          setError(data.message);
        }
      } catch (err) {
        setError('Failed to fetch listings');
      } finally {
        setLoading(false);
      }
    };

    if (searchParams) {
      searchListings();
    }
  }, [searchParams]);

  return { listings, loading, error };
};
```

## Important Notes

### Availability Filtering

- The `available` parameter filters listings that are actually available during the specified dates
- If no listings are available for the specified dates, you may get empty results even if listings exist
- Use `testOccupancyOnly: true` to test occupancy filtering without date restrictions

### Occupancy Logic

- `minOccupancy` filters for listings that can accommodate **at least** the specified number of guests
- For example, `minOccupancy: 2` will return listings for 2, 3, 4+ guests but not 1-guest listings
- Client-side filtering is applied after the API call to ensure accurate guest capacity matching

### Performance Considerations

- Default pagination limit is 25, maximum is 100
- Use pagination (`skip` and `limit`) for large result sets
- Consider using specific `fields` parameter to reduce response size
- Empty parameter object `{}` returns all listings with default pagination

### Error Handling

The function handles various error scenarios:
- Invalid Guesty API responses
- Missing authentication tokens
- Network timeouts
- Invalid parameter formats

Always check the `status` field in the response to determine success or failure.

## Development

### Local Testing

1. Start Supabase locally: `supabase start`
2. Use the provided curl examples or integrate with your frontend application
3. Monitor logs for debugging information

### Environment Variables

Ensure these environment variables are set:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your service role key

### Dependencies

- Deno runtime
- Supabase Edge Functions
- Valid Guesty API token stored in `guesty_tokens` table

## Troubleshooting

### Empty Results

1. Check if listings are available for your specified dates
2. Try removing date restrictions with `testOccupancyOnly: true`
3. Verify occupancy requirements aren't too restrictive
4. Check console logs for API debugging information

### Authentication Errors

1. Ensure Guesty token exists in the database
2. Verify token hasn't expired
3. Check database connection and permissions

### Rate Limiting

The Guesty API may have rate limits. If you encounter rate limiting:
1. Implement request delays in your application
2. Use pagination to reduce large requests
3. Cache results when possible

## Error Responses

### 400 - Bad Request
```json
{
  "status": "error",
  "message": "Missing required parameters"
}
```

### 500 - Internal Server Error
```json
{
  "status": "error",
  "message": "Internal server error",
  "details": "..."
}
```

## Testing

You can test the function using curl:

```bash
curl -i --location --request POST 'https://YOUR_PROJECT.supabase.co/functions/v1/listing-search' \
  --header 'Content-Type: application/json' \
  --data-raw '{"q":"beach","limit":10}'
```

## Notes
- The function always returns the most accurate and up-to-date property and review data by combining Guesty and your review system.
- The Authorization header is not required for the client; the function handles Guesty and review API authentication internally.
