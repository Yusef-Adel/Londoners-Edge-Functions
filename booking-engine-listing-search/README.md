# Booking Engine - Listing Search Function

## Overview

This Supabase Edge Function provides a comprehensive interface to search for property listings using the **Guesty Booking Engine API**. It retrieves available properties based on various search criteria including dates, location, amenities, price range, and more.

**API Reference**: [Guesty Booking Engine - Get Listings](https://booking-api-docs.guesty.com/reference/getapplicationlistingslist)

**Base Endpoint**: `https://booking.guesty.com/api/listings`

---

## Features

- ✅ **Date-based availability search** - Find properties available for specific dates
- ✅ **Location filtering** - Search by city, country, or geo-coordinates (lat/lng)
- ✅ **Guest capacity filtering** - Filter by number of guests, bedrooms, bathrooms
- ✅ **Price range filtering** - Set minimum and maximum price per night
- ✅ **Amenity filtering** - Filter by specific amenities
- ✅ **Property type filtering** - Filter by property type (apartment, house, etc.)
- ✅ **Sorting options** - Sort by price, rating, or other criteria
- ✅ **Rating integration** - Automatically fetches and includes ratings/reviews for each listing
- ✅ **Favorites support** - Checks if listings are in user's favorites
- ✅ **Pagination** - Supports page-based navigation with customizable limits
- ✅ **Resilient architecture** - Includes retry logic, circuit breaker, and timeout handling
- ✅ **CORS enabled** - Ready for frontend integration

---

## Authentication

This function uses **Booking Engine tokens** stored in the `guesty_booking_engine_tokens` database table. Tokens are automatically retrieved and validated before each API call.

### Token Requirements:
- Token must be valid (not expired)
- Token is stored via the `booking-engine-token-generator` function
- Token is automatically refreshed if expired

---

## Request Format

### HTTP Method
```
POST
```

### Endpoint
```
/functions/v1/booking-engine-listing-search
```

### Headers
```json
{
  "Content-Type": "application/json"
}
```

### Request Body Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `checkIn` | string | No | Check-in date (ISO 8601: YYYY-MM-DD) | `"2026-07-01"` |
| `checkOut` | string | No | Check-out date (ISO 8601: YYYY-MM-DD) | `"2026-07-07"` |
| `guests` | number | No | Number of guests | `2` |
| `bedrooms` | number | No | Minimum number of bedrooms | `2` |
| `bathrooms` | number | No | Minimum number of bathrooms | `1` |
| `city` | string | No | Filter by city name | `"Miami"` |
| `country` | string | No | Filter by country code | `"US"` |
| `lat` | number | No | Latitude for geo-search | `25.7617` |
| `lng` | number | No | Longitude for geo-search | `-80.1918` |
| `radius` | number | No | Search radius in km (used with lat/lng) | `10` |
| `minPrice` | number | No | Minimum price per night | `100` |
| `maxPrice` | number | No | Maximum price per night | `500` |
| `amenities` | string | No | Comma-separated amenity IDs | `"wifi,pool,parking"` |
| `tags` | string | No | Comma-separated tags | `"beachfront,luxury"` |
| `propertyType` | string | No | Property type filter | `"apartment"` |
| `sort` | string | No | Sort order | `"price"` or `"-price"` |
| `offset` | number | No | Offset for pagination (0-indexed) | `0` |
| `limit` | number | No | Results per page (max 100) | `25` |
| `guesty_user_id` | string | No | User ID to check favorites | `"user123"` |

---

## Response Format

### Success Response (200 OK)

```json
{
  "status": "success",
  "message": "Listings retrieved successfully",
  "data": [
    {
      "id": "listing_id_123",
      "title": "Luxury Beachfront Apartment",
      "location": "Ocean Drive, South Beach, Miami",
      "area": "South Beach",
      "rating": 4.8,
      "reviews": 127,
      "bedroom": 2,
      "beds": 3,
      "bath": 2,
      "guests": 4,
      "dateRange": "Jul 1 - Jul 7",
      "pricePerNight": 250,
      "totalPrice": 1550,
      "images": [
        "https://example.com/image1.jpg",
        "https://example.com/image2.jpg"
      ],
      "isFavorite": false,
      "amenities": ["wifi", "pool", "parking", "air_conditioning"],
      "propertyType": "apartment",
      "description": "Beautiful oceanfront property with stunning views..."
    }
  ],
  "totalCount": 45,
  "offset": 0,
  "limit": 25
}
```

### Error Response (4xx/5xx)

```json
{
  "status": "error",
  "message": "Error description",
  "details": "Detailed error message",
  "timestamp": "2026-03-02T10:30:00.000Z"
}
```

---

## Usage Examples

### Example 1: Basic Search (All Listings)

Retrieve all available listings without any filters:

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/booking-engine-listing-search' \
  --header 'Content-Type: application/json' \
  --data-raw '{}'
```

### Example 2: Search with Availability Dates

Find properties available for specific dates with guest count:

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/booking-engine-listing-search' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "checkIn": "2026-07-01",
    "checkOut": "2026-07-07",
    "guests": 2,
    "limit": 25
  }'
```

### Example 3: Advanced Filtering (City, Bedrooms, Price Range)

Search for properties in Miami with specific requirements:

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/booking-engine-listing-search' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "city": "Miami",
    "bedrooms": 2,
    "bathrooms": 1,
    "minPrice": 100,
    "maxPrice": 500,
    "checkIn": "2026-08-01",
    "checkOut": "2026-08-07",
    "guests": 4
  }'
```

### Example 4: Geo-Location Search

Find properties within a specific radius from coordinates:

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/booking-engine-listing-search' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "lat": 25.7617,
    "lng": -80.1918,
    "radius": 10,
    "guests": 2,
    "checkIn": "2026-09-01",
    "checkOut": "2026-09-05"
  }'
```

### Example 5: Search with Amenities and Property Type

Filter by amenities and property type:

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/booking-engine-listing-search' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "propertyType": "apartment",
    "amenities": "wifi,pool,parking",
    "checkIn": "2026-06-15",
    "checkOut": "2026-06-22",
    "guests": 3,
    "sort": "price"
  }'
```

### Example 6: Pagination

Navigate through pages of results using offset:

```bash
# First page (0-20)
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/booking-engine-listing-search' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "city": "Miami",
    "offset": 0,
    "limit": 20
  }'

# Second page (20-40)
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/booking-engine-listing-search' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "city": "Miami",
    "offset": 20,
    "limit": 20
  }'
```

### Example 7: With User Favorites

Include user's favorite status for listings:

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/booking-engine-listing-search' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "guesty_user_id": "user_12345",
    "checkIn": "2026-07-01",
    "checkOut": "2026-07-07",
    "guests": 2
  }'
```

---

## JavaScript/TypeScript Frontend Integration

### Using Fetch API

```typescript
async function searchListings(searchParams: {
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  offset?: number;
  limit?: number;
}) {
  try {
    const response = await fetch(
      'https://your-project.supabase.co/functions/v1/booking-engine-listing-search',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchParams)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch listings');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error searching listings:', error);
    throw error;
  }
}

// Usage example
const results = await searchListings({
  checkIn: '2026-07-01',
  checkOut: '2026-07-07',
  guests: 2,
  city: 'Miami',
  minPrice: 100,
  maxPrice: 500,
  offset: 0,
  limit: 25
});

console.log(`Found ${results.totalCount} listings`);
results.data.forEach(listing => {
  console.log(`${listing.title} - $${listing.pricePerNight}/night`);
});
```

---

## Key Differences from Open API Version

| Feature | Open API (listing-search) | Booking Engine (this function) |
|---------|--------------------------|-------------------------------|
| **Endpoint** | `https://open-api.guesty.com/v1/listings` | `https://booking.guesty.com/api/listings` |
| **Token Table** | `guesty_tokens` | `guesty_booking_engine_tokens` |
| **Token Scope** | `open-api` | `booking_engine:api` |
| **Pagination** | `skip` + `limit` (offset-based) | `offset` + `limit` (offset-based) |
| **Geo-Search** | Not available | `lat`, `lng`, `radius` supported |
| **Quote Integration** | Fetches quotes separately | Direct availability filtering |

---

## Error Handling

The function includes comprehensive error handling:

### Circuit Breaker
- Opens after 5 consecutive failures
- Resets after 1 minute
- Prevents cascading failures

### Retry Logic
- Maximum 3 retry attempts
- Exponential backoff for server errors
- Special handling for rate limits (429)

### Common Error Codes

| Status Code | Description | Solution |
|-------------|-------------|----------|
| `400` | Invalid JSON request | Check request body format |
| `401/403` | Authentication error | Refresh booking engine token |
| `429` | Rate limit exceeded | Wait before retrying |
| `503` | Service unavailable | Token expired or unavailable |
| `504` | Request timeout | Retry request |

---

## Performance Optimizations

1. **Batched Processing**: Listings processed in batches of 5 to avoid overwhelming rating API
2. **Parallel Favorites Check**: All favorites checked in a single database query
3. **Timeout Protection**: All external calls have timeouts (30s for listings, 5s for ratings)
4. **Circuit Breaker**: Prevents repeated failures from degrading service
5. **Caching-Ready**: Response format supports caching strategies

---

## Database Dependencies

### Required Tables:
- `guesty_booking_engine_tokens` - Stores Booking Engine API tokens
- `users` - Stores user favorites (optional)

### Related Functions:
- `booking-engine-token-generator` - Generates and refreshes tokens
- `get-review` - Fetches rating data for listings

---

## Deployment

### Local Testing

1. Start Supabase locally:
```bash
supabase start
```

2. Test the function:
```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/booking-engine-listing-search' \
  --header 'Content-Type: application/json' \
  --data-raw '{"limit": 10}'
```

### Production Deployment

Deploy to Supabase:
```bash
supabase functions deploy booking-engine-listing-search
```

---

## Environment Variables

Required environment variables (automatically available in Supabase Edge Functions):
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for database access

---

## Monitoring & Logs

Monitor function execution in Supabase Dashboard:
1. Go to **Edge Functions** section
2. Select `booking-engine-listing-search`
3. View logs, errors, and performance metrics

Common log entries:
- "Booking Engine Listing Search Function initialized" - Function started
- "Successfully retrieved Booking Engine token" - Token fetched successfully
- "Found X listings in Booking Engine response" - Results received
- "Circuit breaker opened" - Too many failures detected

---

## Best Practices

1. **Always include dates** (`checkIn`/`checkOut`) for accurate availability and pricing
2. **Use pagination** with `offset` and `limit` for better performance with large result sets
3. **Implement client-side caching** to reduce API calls
4. **Handle errors gracefully** in your frontend
5. **Monitor token expiration** and refresh proactively
6. **Use appropriate timeouts** when calling from frontend

---

## Troubleshooting

### No results returned
- Check if dates are in valid ISO 8601 format (YYYY-MM-DD)
- Verify search parameters aren't too restrictive
- Check if token is valid and not expired

### Slow response times
- Reduce `limit` parameter (default 25 is optimal)
- Consider implementing frontend caching
- Check if external rating API is responsive

### Authentication errors
- Run `booking-engine-token-generator` to refresh token
- Verify `guesty_booking_engine_tokens` table has valid entries

---

## Support & Resources

- **API Documentation**: [Guesty Booking Engine Docs](https://booking-api-docs.guesty.com/reference/getapplicationlistingslist)
- **Supabase Docs**: [Edge Functions Guide](https://supabase.com/docs/guides/functions)
- **Related Functions**: 
  - `booking-engine-token-generator`
  - `get-review`
  - `add-favorite` / `delete-favorite`

---

## Version History

- **v1.0.0** (2026-03-02) - Initial release
  - Full Booking Engine API integration
  - Circuit breaker implementation
  - Rating and favorites support
  - Comprehensive error handling

---

## License

This function is part of the Gensystem Supabase Functions project.
