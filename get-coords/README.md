# Get Nearby Listings Function

This Supabase Edge Function finds nearby listings within a specified radius (default 3km) based on coordinates stored in the `property_coordinates` table, and enriches the results with property details from the Guesty API and overall average rating from the reviews edge function.

## Setup

1. **Database Requirements**: 
   - A table called `property_coordinates` with columns:
     - `listingId` (TEXT)
     - `latitude` (FLOAT)
     - `longitude` (FLOAT)
   - A table called `guesty_tokens` with a column:
     - `access_token` (TEXT)

2. **Optional SQL Function** (for better performance):
   - Run the SQL in `nearby_listings.sql` in your Supabase SQL Editor
   - This creates a PostgreSQL function that efficiently calculates distances

## Usage

### Request
```bash
POST /functions/v1/get-coords
```

**Body:**
```json
{
  "listing_id": "your-listing-id-here"
}
```

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
      "pictures": [
        {
          "thumbnail": "https://...",
          "regular": "https://...",
          "caption": "Living Room"
        }
      ]
    }
    // ... more listings ...
  ],
  "count": 1,
  "search_radius_km": 3,
  "method_used": "javascript_calculation_with_guesty_api"
}
```

## Features

- **3km radius search**: Finds all listings within 3 kilometers (configurable)
- **Distance calculation**: Uses Haversine formula for accurate distance calculation
- **Guesty API integration**: Enriches each listing with title, address, bedrooms, bathrooms, beds, guests, price, property type, room type, amenities, and up to 3 pictures
- **Review API integration**: Adds `overall_average_rating` for each listing and the target listing by calling the reviews edge function
- **Sorted results**: Returns listings sorted by distance (closest first)
- **CORS support**: Handles cross-origin requests
- **Error handling**: Proper error responses for missing data or failed API calls

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
  "error": "Listing not found or coordinates not available"
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

## Testing

You can test the function using curl:

```bash
curl -i --location --request POST 'https://YOUR_PROJECT.supabase.co/functions/v1/get-coords' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"listing_id":"test-listing-123"}'
```

## Performance Notes

- The function first tries to use the PostgreSQL RPC function for optimal performance
- If the RPC function is not available, it falls back to JavaScript calculation
- For best performance, ensure you have an index on the `property_coordinates` table:
  ```sql
  CREATE INDEX idx_property_coordinates_lat_lng ON property_coordinates (latitude, longitude);
  ```
