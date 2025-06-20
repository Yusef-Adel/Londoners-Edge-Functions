# Get Calendar Edge Function

## Overview

The `get-calendar` Supabase Edge Function retrieves availability calendar data for a specific listing from the Guesty API. This function fetches calendar information for a dynamic date range (from today until the end of next year) and filters to return only available dates, making it ideal for booking systems and availability checks.

## Endpoint

```
POST https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/get-calender
```

*Note: The endpoint URL contains "calender" (as shown in the local development example)*

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
  "listingId": "string",
  "includeAllotment": "boolean",
  "ignoreInactiveChildAllotment": "boolean",
  "ignoreUnlistedChildAllotment": "boolean"
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `listingId` | string | Yes | The unique identifier for the listing in the Guesty system |
| `includeAllotment` | boolean | No | Whether to include allotment data in the response |
| `ignoreInactiveChildAllotment` | boolean | No | Whether to ignore inactive child allotment data |
| `ignoreUnlistedChildAllotment` | boolean | No | Whether to ignore unlisted child allotment data |

## Date Range

The function automatically generates a dynamic date range:
- **Start Date**: Current date (today)
- **End Date**: December 31st of next year

For example, if called on 2025-06-20, the date range would be:
- Start: `2025-06-20`
- End: `2026-12-31`

## Response Format

### Success Response

**Status Code:** `200 OK`

```json
[
  {
    "date": "2025-06-21",
    "status": "available"
  },
  {
    "date": "2025-06-22",
    "status": "available"
  },
  {
    "date": "2025-06-25",
    "status": "available"
  },
  {
    "date": "2025-07-01",
    "status": "available"
  }
]
```

*Note: The response only includes dates with `status: "available"`. Blocked, booked, or unavailable dates are filtered out.*

### Empty Response

**Status Code:** `200 OK`

```json
[]
```

*Returns an empty array when no dates are available in the specified range.*

### Error Responses

#### Missing Required Parameters

**Status Code:** `400 Bad Request`

```json
{
  "error": "listingId is required"
}
```

#### Authentication Error

**Status Code:** `500 Internal Server Error`

```json
{
  "error": "Failed to retrieve Guesty access token"
}
```

#### Listing Not Found

**Status Code:** `404 Not Found`

```json
{
  "error": "Failed to fetch calendar data from Guesty",
  "details": "Listing not found",
  "status": 404
}
```

#### Guesty API Error

**Status Code:** `4xx/5xx` (matches Guesty response)

```json
{
  "error": "Failed to fetch calendar data from Guesty",
  "details": "Error details from Guesty API",
  "status": 400
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
const response = await fetch('https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/get-calender', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_SUPABASE_TOKEN'
  },
  body: JSON.stringify({
    listingId: 'listing_12345',
    includeAllotment: true,
    ignoreInactiveChildAllotment: false
  })
});

const availableDates = await response.json();
console.log('Available dates:', availableDates);

// Check if a specific date is available
const isDateAvailable = (targetDate) => {
  return availableDates.some(day => day.date === targetDate);
};

console.log('Is 2025-07-01 available?', isDateAvailable('2025-07-01'));
```

### cURL

```bash
curl -i --location --request POST 'https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/get-calender' \
  --header 'Authorization: Bearer YOUR_SUPABASE_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{
    "listingId": "listing_12345",
    "includeAllotment": true,
    "ignoreInactiveChildAllotment": false,
    "ignoreUnlistedChildAllotment": true
  }'
```

### Python

```python
import requests
import json
from datetime import datetime

url = 'https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/get-calender'
headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_SUPABASE_TOKEN'
}
data = {
    'listingId': 'listing_12345',
    'includeAllotment': True,
    'ignoreInactiveChildAllotment': False
}

response = requests.post(url, headers=headers, data=json.dumps(data))
available_dates = response.json()

print(f"Found {len(available_dates)} available dates")
for date_info in available_dates[:5]:  # Show first 5 dates
    print(f"Available: {date_info['date']}")
```

## Local Development

To test this function locally:

1. Start your local Supabase instance:
   ```bash
   supabase start
   ```

2. Make a test request to the local endpoint:
   ```bash
   curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-calender' \
     --header 'Authorization: Bearer YOUR_LOCAL_TOKEN' \
     --header 'Content-Type: application/json' \
     --data '{
       "listingId": "LISTING_ID_HERE"
     }'
   ```

## Database Schema

This function interacts with a `guesty_tokens` table that should have the following structure:

```sql
CREATE TABLE guesty_tokens (
  id SERIAL PRIMARY KEY,
  access_token TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Function Behavior

1. **CORS Handling**: The function handles CORS preflight requests to allow cross-origin requests
2. **Input Validation**: Validates that the listingId parameter is provided
3. **Dynamic Date Range**: Automatically calculates date range from today to end of next year
4. **Token Retrieval**: Fetches the Guesty access token from the database
5. **Query Building**: Constructs URL with required and optional parameters
6. **API Integration**: Makes GET request to Guesty Calendar API
7. **Data Filtering**: Filters response to include only available dates
8. **Response Simplification**: Returns simplified structure with only date and status

## Error Handling

The function includes comprehensive error handling for:
- Missing required parameters
- Token retrieval failures
- Guesty API errors (listing not found, unauthorized, etc.)
- Network connectivity issues
- General server errors

## CORS Support

The function includes CORS headers to allow requests from any origin:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`

## API Integration

This function integrates with the Guesty API endpoint:
- **Endpoint**: `https://open-api.guesty.com/v1/availability-pricing/api/calendar/listings/{listingId}`
- **Method**: `GET`
- **Authentication**: Bearer token from database

## Response Filtering

The function filters the Guesty API response to:
- Include only dates with `status: "available"`
- Simplify the response structure to include only `date` and `status` fields
- Remove blocked, booked, or unavailable dates from the response

## Use Cases

This function is ideal for:
- **Booking Systems**: Check availability before allowing reservations
- **Calendar Widgets**: Display available dates in a calendar interface
- **Availability Searches**: Filter properties by available dates
- **Rate Shopping**: Combined with pricing data for availability-based pricing

## Notes

- The function uses Deno runtime with Supabase Edge Functions
- Environment variables `SUPABASE_URL` and `SUPABASE_ANON_KEY` must be configured
- Requires a valid Guesty access token stored in the database
- Date range is automatically calculated based on current date
- Only available dates are returned in the response
- Optional parameters are only included in the API request if explicitly provided
- The endpoint URL in the code comment uses "calender" instead of "calendar"
