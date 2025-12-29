# Get Nearby Listings Function

This Supabase Edge Function finds nearby listings within a specified radius (default 2km) using the Guesty API. It fetches all listings from Guesty, calculates distances based on coordinates, and enriches the results with property details and overall average ratings from the reviews edge function.

## Setup

1. **Database Requirements**: 
   - A table called `guesty_tokens` with a column:
     - `access_token` (TEXT) - Contains the Guesty API access token
   - A table called `users` with columns (optional, for favorites functionality):
     - `guesty_user_id` (TEXT)
     - `favorites` (JSONB array)

2. **Guesty API Access**:
   - Requires a valid Guesty API access token stored in the `guesty_tokens` table
   - The function calls the Guesty API endpoint: `https://open-api.guesty.com/v1/listings`

## Usage

### Request
```bash
POST /functions/v1/get-coords
```

**Body:**
```json
{
  "listing_id": "your-listing-id-here",
  "guesty_user_id": "optional-user-id-for-favorites"
}
```

**Parameters:**
- `listing_id` (required): The Guesty listing ID to find nearby listings for
- `guesty_user_id` (optional): User ID to check if listings are in user's favorites

### Response
```json
{
  "target_listing": {
    "listing_id": "your-listing-id-here",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "title": "Sample Property Title",
    "location": {
      "full_address": "123 Main St, New York, NY, USA",
      "city": "New York",
      "country": "USA"
    },
    "bedrooms": 2,
    "bathrooms": 1,
    "beds": 2,
    "guests": 4,
    "price_per_night": {
      "base_price": 120,
      "base_price_usd": 120,
      "currency": "USD"
    },
    "isFavorite": false,
    "overall_average_rating": 4.5
  },
  "nearby_listings": [
    {
      "listing_id": "nearby-listing-1",
      "latitude": 40.7589,
      "longitude": -73.9851,
      "distance_km": 2.1,
      "title": "Nearby Property 1",
      "location": {
        "full_address": "456 Broadway, New York, NY, USA",
        "city": "New York",
        "country": "USA",
        "published_address": "456 Broadway, New York, NY, USA"
      },
      "bedrooms": 1,
      "bathrooms": 1,
      "beds": 1,
      "guests": 2,
      "price_per_night": {
        "base_price": 100,
        "base_price_usd": 100,
        "currency": "USD",
        "cleaning_fee": 20,
        "extra_person_fee": 10,
        "guests_included": 2
      },
      "property_type": "Apartment",
      "room_type": "Entire home/apt",
      "overall_average_rating": 4.3,
      "isFavorite": true,
      "pictures": [
        {
          "original": "https://...",
          "thumbnail": "https://...",
          "regular": "https://...",
          "caption": "Living Room"
        }
      ],
      "images": [
        "https://...",
        "https://...",
        "https://..."
      ]
    }
    // ... more listings ...
  ],
  "count": 1,
  "search_radius_km": 2,
  "method_used": "guesty_api_with_distance_calculation"
}
```

## Features

- **2km radius search**: Finds all listings within 2 kilometers (easily configurable in code)
- **Guesty API integration**: Fetches all listings directly from Guesty API with coordinates from `address.lat` and `address.lng`
- **Distance calculation**: Uses Haversine formula for accurate distance calculation between listings
- **Review API integration**: Adds `overall_average_rating` for each listing by calling the reviews edge function
- **Favorites support**: Checks if listings are in user's favorites (requires `guesty_user_id` parameter)
- **Rich property data**: Returns comprehensive listing details including:
  - Title, location (street and neighborhood)
  - Bedrooms, bathrooms, beds, and guest capacity
  - Pricing information (base price, cleaning fee, extra person fee)
  - Property type and room type
  - Up to 5 pictures with thumbnails and captions
  - Image URLs for quick access
- **Sorted results**: Returns listings sorted by distance (closest first)
- **Optimized performance**: Batch processing with controlled concurrency and timeouts
- **CORS support**: Handles cross-origin requests
- **Error handling**: Proper error responses for missing data or failed API calls

## Configuring Search Radius

To change the search radius, edit line ~91 in `index.ts`:

```typescript
const SEARCH_RADIUS_KM = 2 // ← Change this value to adjust search radius
```

## Error Responses

### 400 - Bad Request
```json
{
  "error": "listing_id is required"
}
```

### 404 - Not Found
```json
{
  "error": "Listing not found in Guesty",
  "debug_info": {
    "searched_listing_id": "invalid-id",
    "status": 404,
    "note": "Check if the listing ID exists in Guesty"
  }
}
```

or

```json
{
  "error": "Coordinates not available for this listing",
  "debug_info": {
    "searched_listing_id": "some-id",
    "note": "The listing exists but doesn't have coordinates in the address field"
  }
}
```

### 500 - Internal Server Error
```json
{
  "error": "Internal server error"
}
```

### 500 - Guesty Token Error
```json
{
  "error": "Failed to fetch Guesty access token"
}
```

### 500 - Guesty API Error
```json
{
  "error": "Failed to fetch listings from Guesty"
}
```

## Testing

You can test the function using curl:

```bash
curl -i --location --request POST 'https://YOUR_PROJECT.supabase.co/functions/v1/get-coords' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"listing_id":"679b27aefabe790013d94352"}'
```

With user favorites:
```bash
curl -i --location --request POST 'https://YOUR_PROJECT.supabase.co/functions/v1/get-coords' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"listing_id":"679b27aefabe790013d94352","guesty_user_id":"user-123"}'
```

## Performance Notes

- **Direct Guesty API integration**: Fetches all listings in a single API call, then calculates distances locally
- **Optimized batch processing**: Processes rating requests in batches of 5 with controlled delays to respect rate limits
- **Timeout handling**: All API calls have configurable timeouts (8s for Guesty, 5s for ratings)
- **Concurrent operations**: Uses Promise.allSettled for fault-tolerant parallel processing
- **No database dependency for listings**: All listing data comes directly from Guesty API
- **Efficient filtering**: Filters listings by distance before fetching additional data (ratings)

## Data Flow

1. Fetch target listing from Guesty API → Extract coordinates from `address.lat/lng`
2. Fetch all listings from Guesty API in one call
3. Calculate distances using Haversine formula → Filter by radius
4. For nearby listings: Fetch ratings in batches (Guesty data already available)
5. Check favorites status for all listings (if `guesty_user_id` provided)
6. Return enriched results sorted by distance
