# Listing Search Edge Function

This Supabase Edge Function searches Guesty listings and returns structured property data, including accurate property details, real review/rating data from your review system, and **optional quote/pricing data** when dates are provided.

## Features

- **Accurate property details**: Returns correct values for bedrooms, beds, bathrooms, and guests using Guesty API fields.
- **Real review/rating integration**: Calls the `get-review` edge function for each listing to return:
  - `rating`: The real overall average rating from your review system
  - `reviews`: The real number of reviews (from review API, not Guesty stats)
- **Quote/Pricing integration** (NEW): When check-in and check-out dates are provided, automatically fetches detailed pricing quotes for each listing, including:
  - `invoiceItems`: Detailed pricing breakdown (base price, cleaning fee, taxes, etc.)
  - `hostPayout`: Total payout to host
  - `guestsCount`: Number of guests for the quote
  - `numberOfGuests`: Breakdown (adults, children, infants, pets)
  - Quote `_id` for reference
- **Rich property data**: Includes title, location, area, price, images, amenities, and more.
- **Pagination and filtering**: Supports search, city, occupancy, and more.
- **CORS support**: Handles cross-origin requests.
- **Error handling**: Proper error responses for missing data or failed API calls.
- **Circuit breaker**: Prevents cascading failures with automatic recovery

## Setup

1. **Database Requirements**:
   - A table called `guesty_tokens` with a column:
     - `access_token` (TEXT)

2. **Review Edge Function**:
   - The function calls `https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/get-review` for each listing, passing the listing ID and using the Supabase service role key for authentication.

3. **Quote/Pricing Integration**:
   - When `available.checkIn` and `available.checkOut` are provided, the function automatically fetches quotes from Guesty's multiple quotes API
   - Uses the same logic as the `create-multiple-quotes` function
   - Requires the query parameter `mergeAccommodationFarePriceComponents=true` for detailed pricing breakdown
   - Returns nested pricing data including `invoiceItems` and `hostPayout`

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
| `available.checkIn` | string | Check-in date (YYYY-MM-DD) - **Triggers quote fetching** | `"2025-07-01"` |
| `available.checkOut` | string | Check-out date (YYYY-MM-DD) - **Triggers quote fetching** | `"2025-07-07"` |
| `available.minOccupancy` | number | Minimum guest capacity | `2` |
| `guestsCount` | number | Number of guests for quote pricing (used when dates provided) | `2` |
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

### Success Response (Without Quotes)

When dates are **not** provided, listings are returned without quote data:

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

### Success Response (With Quotes)

When `available.checkIn` and `available.checkOut` are provided, each listing includes a `quote` object with detailed pricing:

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
      "amenities": ["WiFi", "Pool", "Kitchen"],
      "quote": {
        "_id": "quote_12345",
        "unitTypeId": "listing_id",
        "checkIn": "2025-07-01",
        "checkOut": "2025-07-07",
        "invoiceItems": [
          {
            "title": "Base price",
            "amount": 1200.00,
            "currency": "USD",
            "type": "BASE_RENT"
          },
          {
            "title": "Cleaning fee",
            "amount": 150.00,
            "currency": "USD",
            "type": "CLEANING_FEE"
          },
          {
            "title": "Service fee",
            "amount": 100.00,
            "currency": "USD",
            "type": "SERVICE_FEE"
          }
        ],
        "hostPayout": 1450.00,
        "guestsCount": 2,
        "numberOfGuests": {
          "numberOfAdults": 2,
          "numberOfChildren": 0,
          "numberOfInfants": 0,
          "numberOfPets": 0
        }
      }
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

## Property Details
- **bedroom**: Number of bedrooms (from Guesty `bedrooms` field)
- **beds**: Number of beds (from Guesty `beds` field)
- **bath**: Number of bathrooms (from Guesty `bathrooms` field)
- **guests**: Maximum guests (from Guesty `accommodates` field)
- **rating**: Real overall average rating from your review system (get-review edge function)
- **reviews**: Real number of reviews from your review system (get-review edge function)
- **quote** (optional): Detailed pricing information, only included when `available.checkIn` and `available.checkOut` are provided

### Quote Object Structure

When dates are provided, each listing includes a `quote` object with:

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Unique quote identifier from Guesty |
| `unitTypeId` | string | Listing ID this quote is for |
| `checkIn` | string | Check-in date (YYYY-MM-DD) |
| `checkOut` | string | Check-out date (YYYY-MM-DD) |
| `invoiceItems` | array | Detailed pricing breakdown (see below) |
| `hostPayout` | number | Total payout to the host |
| `guestsCount` | number | Number of guests for this quote |
| `numberOfGuests` | object | Guest breakdown (adults, children, infants, pets) |

### Invoice Items Structure

Each item in the `invoiceItems` array contains:

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `title` | string | Description of the charge | "Base price", "Cleaning fee" |
| `amount` | number | Amount in the specified currency | 150.00 |
| `currency` | string | Currency code | "USD", "GBP", "EUR" |
| `type` | string | Type of charge | "BASE_RENT", "CLEANING_FEE", "SERVICE_FEE" |

> **Note:** The `rating` and `reviews` fields are always sourced from your review system, not Guesty stats. All property details (bedroom, beds, bath, guests) are always accurate from Guesty API. The `quote` field is only present when check-in and check-out dates are provided in the request.

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

### Availability Search (With Quotes)

When dates are provided, the function automatically fetches detailed pricing quotes:

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/listing-search' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "available": {
      "checkIn": "2025-07-01",
      "checkOut": "2025-07-07", 
      "minOccupancy": 2
    },
    "guestsCount": 2,
    "limit": 20
  }'
```

### Simple Search With Quotes (Dates Only)

Get quotes without other filters:

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/listing-search' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "available": {
      "checkIn": "2025-11-20",
      "checkOut": "2025-11-25"
    },
    "guestsCount": 3,
    "limit": 10
  }'
```

### Advanced Search (With Quotes and Filters)

Combine availability, city filter, and other parameters:

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
    "guestsCount": 4,
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

// Usage - Without quotes
const basicResults = await searchListings({
  city: "Miami",
  limit: 10
});

// Usage - With quotes (dates provided)
const resultsWithQuotes = await searchListings({
  city: "Miami",
  available: {
    checkIn: "2025-07-01",
    checkOut: "2025-07-07"
  },
  guestsCount: 2,
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

### Quote/Pricing Integration

- **Automatic Quote Fetching**: When you provide `available.checkIn` and `available.checkOut`, the function automatically fetches detailed pricing quotes from Guesty
- **Quote Response Structure**: Each listing gets an optional `quote` field with:
  - Detailed `invoiceItems` array (base price, cleaning fee, taxes, etc.)
  - `hostPayout` (total payout to host)
  - `guestsCount` and `numberOfGuests` breakdown
  - Quote `_id` for reference
- **Without Dates**: If you don't provide dates, listings are returned without the `quote` field
- **Guest Count**: Use `guestsCount` parameter to specify the number of guests for quote pricing (defaults to `minOccupancy` or 1)
- **Same Logic as create-multiple-quotes**: Uses the exact same quote fetching logic with `mergeAccommodationFarePriceComponents=true`

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
- **Quote Fetching**: When dates are provided, an additional API call is made to Guesty's quotes endpoint
- **Batched Processing**: Ratings are fetched in batches of 5 to avoid overwhelming the rating API
- **Circuit Breaker**: Automatic failure detection and recovery (5 failures trigger 60-second cooldown)
- **Timeouts**: 
  - Guesty API: 30 seconds
  - Rating API: 5 seconds per listing
- **Retry Logic**: Up to 3 retries with exponential backoff for failed requests

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
- `get-review` edge function for rating/review data
- Guesty Multiple Quotes API for pricing data (when dates provided)

## Troubleshooting

### Empty Results

1. Check if listings are available for your specified dates
2. Try removing date restrictions with `testOccupancyOnly: true`
3. Verify occupancy requirements aren't too restrictive
4. Check console logs for API debugging information
5. If quotes are not appearing, verify that `available.checkIn` and `available.checkOut` are provided

### Quote-Related Issues

1. **No quote field in response**: Ensure both `available.checkIn` and `available.checkOut` are provided
2. **Empty quote data**: Check if listings have pricing configured in Guesty
3. **Quote fetch failures**: Check function logs for Guesty API errors
4. **Missing invoiceItems**: Verify `mergeAccommodationFarePriceComponents=true` is being used (handled automatically)

### Authentication Errors

1. Ensure Guesty token exists in the database
2. Verify token hasn't expired
3. Check database connection and permissions

### Rate Limiting

The Guesty API may have rate limits. If you encounter rate limiting:
1. Implement request delays in your application
2. Use pagination to reduce large requests
3. Cache results when possible
4. Circuit breaker automatically handles repeated failures (5 failures = 60-second cooldown)

### Error Codes

The function includes comprehensive error handling:
- **503 - Circuit Breaker Open**: Too many recent failures, service temporarily unavailable
- **504 - Gateway Timeout**: Request took longer than 30 seconds
- **429 - Too Many Requests**: Guesty API rate limit exceeded
- **401/403 - Authentication Error**: Invalid or expired Guesty token

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
  "details": "...",
  "timestamp": "2025-10-24T12:00:00.000Z"
}
```

### 503 - Service Unavailable
```json
{
  "status": "error",
  "message": "Service temporarily unavailable - too many recent failures",
  "details": "Circuit breaker is open, please try again later"
}
```

### 504 - Gateway Timeout
```json
{
  "status": "error",
  "message": "Request timeout - please try again",
  "details": "Request timeout after 30000ms"
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
- **Quote/Pricing Data**: When you provide `available.checkIn` and `available.checkOut`, the function automatically fetches detailed pricing quotes including invoice items breakdown, host payout, and guest details.
- **Without Dates**: If dates are not provided, only listing data is returned without the `quote` field.
- The Authorization header is not required for the client; the function handles Guesty and review API authentication internally.
- Circuit breaker protection prevents cascading failures and automatically recovers after cooldown period.
- All API calls include retry logic (up to 3 attempts) and timeout protection (30 seconds for Guesty, 5 seconds for ratings).

## Example Response Comparison

### Without Dates (No Quotes)
```json
{
  "data": [{
    "id": "123",
    "title": "Beach House",
    "bedroom": 3,
    // ... other listing fields
    // NO quote field
  }]
}
```

### With Dates (Includes Quotes)
```json
{
  "data": [{
    "id": "123",
    "title": "Beach House",
    "bedroom": 3,
    // ... other listing fields
    "quote": {
      "_id": "quote_456",
      "invoiceItems": [...],
      "hostPayout": 1450.00,
      // ... quote details
    }
  }]
}
```
