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

```json
{
  "success": true,
  "data": {
    "id": "679b2773da32a800107fc7c0",
    "title": "Diana's Hidden Gem",
    "description": "Discover a chic, brand-new studio in the heart of Central London...",
    "location": {
      "city": "Greater London",
      "country": "United Kingdom",
      "address": "Devonshire Place, W1G 6HY Greater London, United Kingdom",
      "neighborhood": "Marylebone",
      "coordinates": {
        "lat": 51.5227443,
        "lng": -0.1500186
      },
      "zipcode": "W1G 6HY",
      "state": "England",
      "timeZone": "Europe/London"
    },
    "pricing": {
      "basePrice": 200,
      "currency": "GBP",
      "cleaningFee": 100,
      "serviceFee": 0,
      "securityDeposit": 0
    },
    "capacity": {
      "bedrooms": 0,
      "bathrooms": 1,
      "beds": 2,
      "guests": 3
    },
    "amenities": [
      "Air conditioning",
      "Wifi",
      "Kitchen",
      "Parking"
    ],
    "pictures": [
      "https://assets.guesty.com/image/upload/...",
      "https://assets.guesty.com/image/upload/..."
    ],
    "ratings": {
      "rating": 4.8,
      "reviewCount": 156
    },
    "checkInOut": {
      "checkInTime": "16:00",
      "checkOutTime": "11:00"
    },
    "host": {
      "name": "John Doe",
      "phone": "+447425114904"
    },
    "policies": {
      "cancellationPolicy": "Flexible",
      "houseRules": ["No smoking", "No pets"]
    },
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
    ],
    "propertyType": "Serviced apartment",
    "roomType": "Entire home/apt",
    "listingType": "short_term_rental",
    "accommodates": 3,
    "publicDescription": {
      "summary": "...",
      "space": "...",
      "neighborhood": "...",
      "transit": "...",
      "notes": "...",
      "houseRules": "..."
    },
    "amenitiesNotIncluded": [],
    "taxes": [],
    "defaultCheckInTime": "16:00",
    "defaultCheckOutTime": "11:00",
    "isListed": true,
    "active": true,
    "integrations": [...],
    "nickname": "17A1 Devonshre Place",
    "accountId": "679a424e85f74b5fe968cec2",
    "createdAt": "2025-01-30T07:17:07.766Z",
    "lastUpdatedAt": "2025-05-19T08:56:59.114Z",
    "customFields": [...]
  }
}
```

### Error Responses

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
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' `
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
