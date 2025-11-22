# Booking Engine Create Reservation Quote

This edge function creates a reservation quote using the Guesty Booking Engine API. It retrieves a valid access token from the database and uses it to request pricing and availability information for a specific listing and date range.

## Features

- **Token Management**: Automatically retrieves valid access token from database
- **Quote Creation**: Creates reservation quotes with Guesty Booking Engine API
- **Validation**: Validates all required fields and date formats
- **Coupon Support**: Optional support for coupon codes
- **CORS Support**: Handles CORS preflight requests
- **Error Handling**: Comprehensive error handling and validation

## Prerequisites

1. **Token Generator**: The `booking-engine-token-generator` function must be set up and have generated at least one valid token
2. **Database Table**: The `guesty_booking_engine_tokens` table must exist with valid tokens
3. **Environment Variables**: Standard Supabase environment variables must be configured

## API Endpoint

```
POST https://your-project.supabase.co/functions/v1/booking-engine-create-reservation-quote
```

## Request Format

### Required Fields

- `guestsCount` (number): Number of guests for the reservation
- `checkInDateLocalized` (string): Check-in date in YYYY-MM-DD format
- `checkOutDateLocalized` (string): Check-out date in YYYY-MM-DD format
- `listingId` (string): The Guesty listing ID to create a quote for

### Optional Fields

- `coupons` (string): Comma-separated list of coupon codes (e.g., "coupon_1,coupon_2")

### Example Request

```bash
curl --location --request POST 'https://your-project.supabase.co/functions/v1/booking-engine-create-reservation-quote' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "guestsCount": 1,
    "checkInDateLocalized": "2026-11-01",
    "checkOutDateLocalized": "2026-11-10",
    "listingId": "679b0ea4cb8d6900130ed2c5",
    "coupons": "coupon_1,coupon_2"
  }'
```

## Response Format

### Success Response

```json
{
  "status": "success",
  "message": "Reservation quote created successfully",
  "data": {
    "_id": "691713f752501cc323d367ce",
    "createdAt": "2025-11-14T11:35:19.711Z",
    "expiresAt": "2025-11-15T11:35:19.711Z",
    "accountId": "679a424e85f74b5fe968cec2",
    "guestsCount": 1,
    "channel": "booking_engine",
    "source": "BE-API",
    "unitTypeId": "679b0ea4cb8d6900130ed2c5",
    "checkInDateLocalized": "2026-11-01",
    "checkOutDateLocalized": "2026-11-10",
    "rates": {
      "ratePlans": [
        {
          "ratePlan": {
            "_id": "67aa3c85546cbf6957c45820",
            "name": "The Rate Plan",
            "money": {
              "currency": "GBP",
              "fareAccommodation": 6464.75,
              "fareCleaning": 150,
              "subTotalPrice": 6614.75,
              "totalTaxes": 0,
              "invoiceItems": [...]
            }
          },
          "days": [...]
        }
      ]
    },
    "stay": [...],
    "status": "valid"
  }
}
```

### Error Responses

#### Missing Required Fields (400)
```json
{
  "status": "error",
  "message": "Missing required fields. Required: guestsCount, checkInDateLocalized, checkOutDateLocalized, listingId"
}
```

#### Invalid Date Format (400)
```json
{
  "status": "error",
  "message": "Invalid date format. Use YYYY-MM-DD format."
}
```

#### Invalid Date Range (400)
```json
{
  "status": "error",
  "message": "Check-out date must be after check-in date."
}
```

#### Token Not Found (500)
```json
{
  "status": "error",
  "message": "No booking engine token found. Please generate a token first."
}
```

#### Expired Token (500)
```json
{
  "status": "error",
  "message": "Booking engine token has expired. Please refresh the token."
}
```

#### Guesty API Error
```json
{
  "status": "error",
  "message": "Failed to create reservation quote",
  "details": {
    // Guesty API error details
  }
}
```

## How It Works

1. **Request Validation**: Validates all required fields and date formats
2. **Date Validation**: Ensures check-out date is after check-in date
3. **Token Retrieval**: Fetches the latest valid token from `guesty_booking_engine_tokens` table
4. **Token Validation**: Checks if the token has expired
5. **API Request**: Sends the quote request to Guesty Booking Engine API with the token
6. **Response Handling**: Returns the quote data or appropriate error message

## Important Notes

### Token Management
- The function retrieves the most recent token from the database
- If the token is expired, you'll receive an error and need to refresh it using the `booking-engine-token-generator` function
- Make sure your cron job is running to keep tokens fresh

### Date Format
- All dates must be in `YYYY-MM-DD` format (ISO 8601 date format)
- Dates are localized (no time zone information needed)

### Quote Expiration
- Quotes returned by Guesty typically expire after 24 hours (check the `expiresAt` field)
- You'll need to create a new quote if the previous one has expired

### Rate Information
- The response includes detailed pricing breakdown including:
  - Accommodation fare
  - Cleaning fees
  - Taxes (if applicable)
  - Daily rates for each night
  - Rate plan details and cancellation policies

## Integration Example

```javascript
// Example JavaScript/TypeScript integration
async function createReservationQuote(quoteData) {
  const response = await fetch(
    'https://your-project.supabase.co/functions/v1/booking-engine-create-reservation-quote',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        guestsCount: quoteData.guests,
        checkInDateLocalized: quoteData.checkIn,
        checkOutDateLocalized: quoteData.checkOut,
        listingId: quoteData.propertyId,
        coupons: quoteData.coupons // optional
      })
    }
  );

  const result = await response.json();
  
  if (result.status === 'success') {
    console.log('Quote ID:', result.data._id);
    console.log('Total Price:', result.data.rates.ratePlans[0].ratePlan.money.subTotalPrice);
    console.log('Currency:', result.data.rates.ratePlans[0].ratePlan.money.currency);
    return result.data;
  } else {
    throw new Error(result.message);
  }
}
```

## Testing

### Test with cURL

```bash
# Basic quote request
curl -X POST 'https://your-project.supabase.co/functions/v1/booking-engine-create-reservation-quote' \
  -H 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "guestsCount": 2,
    "checkInDateLocalized": "2026-12-01",
    "checkOutDateLocalized": "2026-12-07",
    "listingId": "your-listing-id"
  }'

# With coupons
curl -X POST 'https://your-project.supabase.co/functions/v1/booking-engine-create-reservation-quote' \
  -H 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "guestsCount": 4,
    "checkInDateLocalized": "2026-12-15",
    "checkOutDateLocalized": "2026-12-22",
    "listingId": "your-listing-id",
    "coupons": "WINTER2026,FAMILY10"
  }'
```

## Troubleshooting

### "No booking engine token found"
- Run the `booking-engine-token-generator` function to create a token
- Verify the `guesty_booking_engine_tokens` table exists and has data

### "Booking engine token has expired"
- Manually trigger the `booking-engine-token-generator` function
- Check that your cron job is running properly
- Verify the cron job schedule (should run at least once every 24 hours)

### "Failed to create reservation quote"
- Check that the `listingId` is valid and exists in your Guesty account
- Verify the dates are available for booking
- Ensure the dates are in the future
- Check if the listing has minimum night requirements

## Security

- Requires Supabase authentication (anon key or service role key)
- Token is securely retrieved from the database
- CORS configured to allow all origins (modify if needed for production)
- Sensitive credentials (client ID/secret) are stored as environment variables
