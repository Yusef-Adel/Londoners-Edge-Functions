# Get Property Images Function

A Supabase Edge Function that retrieves and organizes property photos by room type, with bedrooms displayed first.

## Overview

This function fetches all classified photos for a property listing and returns them organized by room type (bedroom, bathroom, kitchen, etc.). It combines data from:
- Supabase `property_photos_classified` table (classified room photos)
- Guesty API (listing details and name)
- Supabase `reviews` table (average ratings)

Photos are automatically sorted with **bedrooms appearing first**, followed by living areas, kitchens, bathrooms, and outdoor spaces.

## Endpoint

```
POST /get-property-images
```

## Request Format

### Headers
```
Authorization: Bearer YOUR_SUPABASE_ANON_KEY
Content-Type: application/json
```

### Body
```json
{
  "listing_id": "string"
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `listing_id` | string | Yes | The Guesty listing/property ID to retrieve photos for |

## Response Format

### Success Response (200 OK)

Returns a structured object with listing details and rooms:

```json
{
  "listingName": "string",
  "rating": number,
  "rooms": [
    {
      "name": "string",
      "features": ["string"],
      "images": ["string"],
      "thumbnail": "string"
    }
  ]
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `listingName` | string | Property title or nickname |
| `rating` | number | Average rating from reviews (1 decimal place) |
| `rooms` | array | Array of room objects |

#### Room Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Room type from `classified_as` attribute |
| `features` | array | List of room features/amenities |
| `images` | array | Array of image URLs for this room |
| `thumbnail` | string | Primary image URL (first image) |

### Room Sorting Order

Rooms are automatically sorted in this priority:

1. **Bedrooms** (includes "bedroom" or "bed")
2. **Living areas** (includes "living")
3. **Kitchen** (includes "kitchen")
4. **Bathrooms** (includes "bathroom" or "bath")
5. **Outdoor spaces** (includes "garden", "outdoor", "patio", "terrace")
6. **Other rooms** (all remaining room types)

### Error Responses

#### 400 Bad Request
```json
{
  "error": "listing_id is required"
}
```

#### 404 Not Found
```json
{
  "message": "No images found for this listing"
}
```

#### 405 Method Not Allowed
```json
{
  "error": "Method not allowed. Only POST requests are supported."
}
```

#### 500 Internal Server Error
```json
{
  "error": "Failed to retrieve Guesty access token"
}
```

or

```json
{
  "error": "Failed to fetch listing details from Guesty: <error message>"
}
```

or

```json
{
  "error": "database error message"
}
```

## CORS

The function supports comprehensive CORS headers:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type, x-requested-with, accept, origin, referer, user-agent`
- `Access-Control-Max-Age: 86400` (24 hours)

## Dependencies

- `jsr:@supabase/functions-js/edge-runtime.d.ts` - Supabase Runtime types
- `jsr:@supabase/supabase-js@2` - Supabase client

## Environment Variables

The function requires the following environment variables:

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Your Supabase anonymous key |

## Database Schema

### Required Tables

#### `property_photos_classified`
- `id` (number) - Unique photo identifier
- `property_id` (string) - Associated listing/property ID
- `guesty_photo_id` (string) - Guesty photo identifier
- `guesty_photo_url` (string) - Photo URL
- `caption` (string) - Photo caption
- `classified_as` (string) - Room type classification (e.g., "bedroom", "bathroom")
- `features` (string) - JSON array or comma-separated features
- `created_at` (timestamp) - Photo creation timestamp
- `updated_at` (timestamp) - Last update timestamp

#### `guesty_tokens`
- `access_token` (string) - Guesty API access token

#### `reviews`
- `listing_id` (string) - Associated listing ID
- `overall_rating` (number) - Rating value

## Features Parsing

The function intelligently parses room features from the `features` field, supporting multiple formats:

1. **JSON Array**: `["King bed", "TV", "Heating"]`
2. **Comma-separated with quotes**: `"King bed", "TV", "Heating"`
3. **Comma-separated without quotes**: `King bed, TV, Heating`
4. **Single feature**: `King bed`

Features are extracted from the first image in each room that contains non-empty feature data.

## Local Testing

1. Start Supabase locally:
```bash
supabase start
```

2. Test the function:
```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-property-images' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{"listing_id":"YOUR_LISTING_ID"}'
```

## Deployment

Deploy the function to Supabase:

```bash
supabase functions deploy get-property-images
```

## Implementation Details

### Photo Organization
- Photos are grouped by the `classified_as` attribute
- Each room type gets its own section with all associated photos
- Photos within each room are sorted by creation date (oldest first)
- The first photo in each room becomes the thumbnail

### Rating Calculation
- Fetches all reviews for the listing from the `reviews` table
- Calculates average of `overall_rating` values
- Rounds to 1 decimal place
- Returns 0 if no reviews exist

### Performance
- Single query to fetch all photos for a listing
- Room grouping and sorting done in-memory
- Response includes cache headers (`Cache-Control: max-age=3600`)
- Extensive logging for debugging feature parsing

### Error Handling
- Validates required `listing_id` parameter
- Returns appropriate HTTP status codes
- Handles missing data gracefully (empty features, missing ratings)
- Logs detailed error information for debugging

## Example Usage

### JavaScript/TypeScript
```javascript
const response = await fetch('https://YOUR_PROJECT.supabase.co/functions/v1/get-property-images', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_SUPABASE_ANON_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    listing_id: '507f1f77bcf86cd799439011'
  })
});

const propertyPhotos = await response.json();

// Access bedroom photos
const bedrooms = propertyPhotos.rooms.filter(room => 
  room.name.toLowerCase().includes('bedroom')
);

console.log(`Property: ${propertyPhotos.listingName}`);
console.log(`Rating: ${propertyPhotos.rating}/5`);
console.log(`Number of rooms: ${propertyPhotos.rooms.length}`);
```

### Python
```python
import requests

response = requests.post(
    'https://YOUR_PROJECT.supabase.co/functions/v1/get-property-images',
    headers={
        'Authorization': 'Bearer YOUR_SUPABASE_ANON_KEY',
        'Content-Type': 'application/json'
    },
    json={'listing_id': '507f1f77bcf86cd799439011'}
)

property_photos = response.json()

# Display all rooms
for room in property_photos['rooms']:
    print(f"{room['name']}: {len(room['images'])} photos")
    print(f"Features: {', '.join(room['features'])}")
```

### React Component Example
```tsx
import { useState, useEffect } from 'react';

function PropertyGallery({ listingId }) {
  const [propertyData, setPropertyData] = useState(null);

  useEffect(() => {
    async function fetchPhotos() {
      const response = await fetch(
        'https://YOUR_PROJECT.supabase.co/functions/v1/get-property-images',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer YOUR_SUPABASE_ANON_KEY',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ listing_id: listingId })
        }
      );
      const data = await response.json();
      setPropertyData(data);
    }
    
    fetchPhotos();
  }, [listingId]);

  if (!propertyData) return <div>Loading...</div>;

  return (
    <div>
      <h1>{propertyData.listingName}</h1>
      <p>Rating: {propertyData.rating}/5</p>
      
      {propertyData.rooms.map((room, idx) => (
        <div key={idx}>
          <h2>{room.name}</h2>
          <p>Features: {room.features.join(', ')}</p>
          <div className="image-grid">
            {room.images.map((img, imgIdx) => (
              <img key={imgIdx} src={img} alt={`${room.name} ${imgIdx + 1}`} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

## Response Caching

The function sets a 1-hour cache header (`max-age=3600`). Consider:
- Implementing CDN caching for frequently accessed listings
- Invalidating cache when photos are updated
- Using shorter cache times for listings with frequent updates

## Debugging

The function includes extensive console logging for debugging:
- Room processing steps
- Feature parsing attempts and results
- Image counts per room
- Final response data structure

Check your Supabase function logs to troubleshoot issues with feature parsing or room organization.

## Notes

- Photos are sorted by `created_at` timestamp within each room
- Feature parsing handles malformed JSON gracefully with fallback parsing
- Empty feature arrays are returned if no features are found
- Bedrooms always appear first in the response regardless of database order
- The function uses the first non-empty feature field found in each room's photos
