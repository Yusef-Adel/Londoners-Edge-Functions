# Retrieve Listing by ID - Supabase Edge Function

## Overview

This Supabase Edge Function retrieves comprehensive listing data from the Guesty API by listing ID and returns it in a structured, frontend-friendly format. The function fetches detailed property information including location, pricing, amenities, pictures, rate plans, and all other relevant data from Guesty's listings endpoint.

## Endpoint

**URL:** `/functions/v1/Retrieve-listing-byID`  
**Method:** `POST`  
**Content-Type:** `application/json`

## Request Format

```json
{
  "id": "679b2773da32a800107fc7c0"
}
```

### Request Parameters

| Parameter | Type   | Required | Description           |
|-----------|--------|----------|-----------------------|
| `id`      | string | Yes      | The Guesty listing ID |

## Response Format

### Success Response (200)

```
[
  {
    "MaxNumofGuests": "3",
    "PricePerNight": "200",
    "whatsup": "+447425114904",
    "Cleaningfee": "100",
    "Servicefee": "0",
    "reviews": "4.8",
    "numReviews": "156",
    "minNights": "2",
    "defaultCheckInTime": "16:00",
    "defaultCheckOutTime": "11:00",
    "bedrooms": 0,
    "bathrooms": 1,
    "beds": 2,
    "guests": 3,
    "bookingWindow": { "defaultSettings": { "days": -1 }, "updatedAt": "2025-05-19T08:56:59.114Z", "updatedBy": "EdgeFunction" },
    "preparationTime": { "defaultSettings": { "days": 0 }, "updatedAt": "2025-05-19T08:56:59.114Z", "updatedBy": "EdgeFunction" },
    "weekendDays": ["Saturday", "Sunday"],
    "imagesDummy": [
      "https://assets.guesty.com/image/upload/...",
      "https://assets.guesty.com/image/upload/..."
    ]
  },
  {
    "dummyPropertyData": {
      "rating": 4.8,
      "reviewCount": 156,
      "location": "Greater London, United Kingdom",
      "description": [
        "Discover a chic, brand-new studio in the heart of Central London...",
        "Marylebone neighborhood, close to transport"
      ],
      "amenities": [
        { "icon": "Wifi", "name": "Fast wifi", "description": "Download speeds of 100+ Mbps" },
        { "icon": "Tv", "name": "Self check-in", "description": "Check yourself in with the smartlock" },
        { "icon": "AirVent", "name": "Air Conditioning", "description": "Air conditioning throughout the entire place" }
      ]
    }
  },
  {
    "amenityData": [
      { "icon": "Wifi", "name": "Wifi" },
      { "icon": "AirVent", "name": "Air conditioning" },
      { "icon": "Utensils", "name": "Kitchen" },
      { "icon": "Parking", "name": "Parking" }
    ]
  },
  {
    "transportData": [
      { "name": "Regent's Park Station (5-7 minute)", "icon": "/placeholder.svg?height=32&width=32&text=TFL", "alt": "London Underground" },
      { "name": "Baker Street Station (5-7 minute)", "icon": "/placeholder.svg?height=32&width=32&text=TFL", "alt": "London Underground" }
    ]
  },
  {
    "roomData": [
      { "image": "/bd1.png", "alt": "Bedroom 1", "name": "Bedroom 1", "description": "1 queen bed", "hasBed": true },
      { "image": "/bd1.png", "alt": "Living Room", "name": "Living Room", "description": "Spacious common area", "hasBed": false }
    ]
  },
  {
    "propertyReviews": {
      "ratingSummary": {
        "average": 4.8,
        "count": 156,
        "stars": 5,
        "ratingBars": [
          { "label": "5 star", "percentage": 85 },
          { "label": "4 star", "percentage": 60 },
          { "label": "3 star", "percentage": 35 },
          { "label": "2 star", "percentage": 10 },
          { "label": "1 star", "percentage": 5 }
        ],
        "categories": [
          { "label": "Cleanliness", "rating": 4.7 },
          { "label": "Accuracy", "rating": 4.6 },
          { "label": "Check-In", "rating": 4.8 },
          { "label": "Communication", "rating": 4.9 },
          { "label": "Location", "rating": 4.8 },
          { "label": "Value", "rating": 4.5 }
        ]
      },
      "reviews": [
        {
          "id": 1,
          "user": { "name": "Mary William", "initials": "MW", "avatar": "/placeholder.svg?height=40&width=40&text=MW" },
          "rating": 4.6,
          "date": "2025-07-01",
          "content": "Perfect base for exploring London...",
          "fullContent": "Perfect base for exploring London. Family of five fitted comfortably. Immaculately clean. Easy walk to multiple tube stations. Nice neighborhood and quiet street with very little traffic. Easy to find."
        }
      ]
    }
  },
  {
    "dummyLocationData": {
      "title": "Where you'll be",
      "description": "Marylebone, known for its charm and convenience.",
      "coordinates": "51.5227443,-0.1500186",
      "neighborhood": "Marylebone",
      "walkingDistances": [
        "5 min walk to transport",
        "10 min walk to city center",
        "15 min walk to shopping",
        "20 min walk to attractions",
        "25 min walk to dining"
      ]
    }
  },
  {
    "dummyThingsToKnowData": {
      "title": "Things to know",
      "sections": [
        {
          "title": "House Rules",
          "items": [
            "Check-in after 16:00",
            "Checkout before 11:00",
            "3 guests maximum"
          ],
          "hasButton": true
        },
        {
          "title": "Safety & Property",
          "items": [
            "Carbon monoxide alarm",
            "Smoke alarm",
            "Security camera/recording device"
          ],
          "hasButton": true
        },
        {
          "title": "Cancellation Policy",
          "items": [
            "Flexible"
          ],
          "hasButton": true,
          "isParagraph": true
        }
      ]
    }
  },
  {
    "rates": [
      {
        "platform": "bookingCom",
        "internalRatePlanId": "67aa3c85546cbf6957c45820",
        "externalRatePlanId": "52337718",
        "status": "ACTIVE",
        "rateName": "Guesty - 5820 - The Rate Plan",
        "currency": "GBP",
        "hotelId": 9849029
      }
    ]
  },
  {
    "dummyNearby": [
      { "id": 1, "imageUrl": "/dt2.png", "title": "Nearby Property 1", "rating": 4.9, "reviewCount": 42, "details": { "beds": 2, "baths": 1, "kitchens": 1 } },
      { "id": 2, "imageUrl": "/dt2.png", "title": "Nearby Property 2", "rating": 4.8, "reviewCount": 36, "details": { "beds": 1, "baths": 1, "kitchens": 1 } },
      { "id": 3, "imageUrl": "/dt2.png", "title": "Nearby Property 3", "rating": 4.7, "reviewCount": 28, "details": { "beds": 3, "baths": 2, "kitchens": 1 } }
    ]
  }
]
```

> **Note:**
> - The response is an array of objects, each representing a section of the listing data.
> - Ratings, review counts, and review content are always sourced from your review system (get-review edge function).
> - Bedrooms, beds, bathrooms, and guests are always sourced from the Guesty API.
> - The structure and field names match the actual function output for frontend consumption.

## Error Responses

#### 400 - Bad Request
```json
{
  "error": "Listing ID is required"
}
```

#### 500 - Server Error
```json
{
  "error": "Failed to retrieve Guesty access token"
}
```

```json
{
  "error": "Failed to fetch listing from Guesty",
  "details": "Error details from Guesty API",
  "status": 404
}
```

```json
{
  "error": "Internal server error",
  "details": "Error message"
}
```

## Response Data Structure

### Core Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique listing identifier |
| `title` | string | Listing title/name |
| `description` | string | Property description |
| `location` | object | Complete location information |
| `pricing` | object | Pricing details including fees |
| `capacity` | object | Property capacity (bedrooms, bathrooms, etc.) |
| `amenities` | array | List of available amenities |
| `pictures` | array | Array of image URLs |
| `ratings` | object | Rating and review count |
| `checkInOut` | object | Check-in and check-out times |
| `host` | object | Host information |
| `policies` | object | Cancellation policy and house rules |

### Rate Plans

The `rates` array contains booking platform rate plan information:

| Field | Type | Description |
|-------|------|-------------|
| `platform` | string | Always "bookingCom" |
| `internalRatePlanId` | string | Internal Guesty rate plan ID |
| `externalRatePlanId` | string | External platform rate plan ID |
| `status` | string | Rate plan status (ACTIVE, INACTIVE) |
| `rateName` | string | Human-readable rate plan name |
| `currency` | string | Rate plan currency |
| `hotelId` | number | Hotel ID on the booking platform |

### Additional Guesty Fields

The response includes comprehensive Guesty-specific data:
- `propertyType`: Type of property (apartment, house, etc.)
- `roomType`: Room type (entire place, private room, etc.)
- `integrations`: Array of platform integrations
- `customFields`: Custom property fields
- `publicDescription`: Detailed description sections
- `calendarRules`: Booking and availability rules

## Usage Examples

### cURL (Local Development)

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/Retrieve-listing-byID' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{"id":"679b2773da32a800107fc7c0"}'
```

### cURL (Production)

```bash
curl -i --location --request POST 'https://your-project.supabase.co/functions/v1/Retrieve-listing-byID' \
  --header 'Authorization: Bearer YOUR_SUPABASE_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{"id":"679b2773da32a800107fc7c0"}'
```

### PowerShell

```powershell
curl.exe -i --location --request POST 'http://127.0.0.1:54321/functions/v1/Retrieve-listing-byID' `
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9zZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' `
  --header 'Content-Type: application/json' `
  --data '{"id":"679b2773da32a800107fc7c0"}'
```

### JavaScript/TypeScript

```typescript
const response = await fetch('/functions/v1/Retrieve-listing-byID', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    id: '679b2773da32a800107fc7c0'
  })
});

const data = await response.json();
console.log(data);
```

## Prerequisites

1. **Guesty Access Token**: The function requires a valid Guesty access token stored in the `guesty_tokens` table in your Supabase database.

2. **Database Setup**: Ensure the `guesty_tokens` table exists with the following structure:
   ```sql
   CREATE TABLE guesty_tokens (
     access_token TEXT NOT NULL
   );
   ```

3. **Environment Variables**: Ensure `SUPABASE_URL` and `SUPABASE_ANON_KEY` are properly configured.

## Dependencies

- `@supabase/functions-js` - Supabase Edge Runtime
- `@supabase/supabase-js` - Supabase client library

## Local Development

1. Start Supabase locally:
   ```bash
   supabase start
   ```

2. Deploy the function:
   ```bash
   supabase functions deploy Retrieve-listing-byID
   ```

3. Test the function using the provided cURL examples.

## Deployment

Deploy to production:
```bash
supabase functions deploy Retrieve-listing-byID --project-ref YOUR_PROJECT_ID
```

## Error Handling

The function includes comprehensive error handling for:
- Missing listing ID in request
- Invalid or expired Guesty tokens
- Network errors when calling Guesty API
- Invalid listing IDs
- General server errors

All errors are returned with appropriate HTTP status codes and descriptive error messages.

## Rate Limiting

This function is subject to:
- Supabase Edge Functions rate limits
- Guesty API rate limits

Ensure your usage patterns comply with both platforms' rate limiting policies.

## Security

- All requests require valid Supabase authentication
- Guesty tokens are securely stored in the database
- CORS headers are properly configured
- No sensitive data is logged or exposed

## Changelog

### v1.0.0
- Initial implementation with comprehensive Guesty data mapping
- Support for bookingCom rate plan extraction
- Full CORS support
- Comprehensive error handling
