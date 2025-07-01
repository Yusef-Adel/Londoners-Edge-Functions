# Create-Quote Edge Function

## Overview

The Create-Quote edge function creates a price quote for a reservation through the Guesty API. It handles detailed guest breakdowns, validates input data, and stores the quote information in the database.

## Endpoint

```
POST /functions/v1/Create-Quote
```

## Authentication

Requires a valid Supabase authorization token in the `Authorization` header:

```
Authorization: Bearer <your-supabase-token>
```

## Request Body

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `check_in_date_localized` | string | Check-in date in YYYY-MM-DD format |
| `check_out_date_localized` | string | Check-out date in YYYY-MM-DD format |
| `listing_id` | string | Unique identifier for the listing |
| `source` | string | Source of the reservation (e.g., "website", "app") |
| `guests_count` | number | Total number of guests (must be ≥ 1) |

### Optional Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `number_of_adults` | number | `guests_count` | Number of adults (must be ≥ 1) |
| `number_of_children` | number | 0 | Number of children (must be ≥ 0) |
| `number_of_infants` | number | 0 | Number of infants (must be ≥ 0) |
| `number_of_pets` | number | 0 | Number of pets (must be ≥ 0) |
| `ignore_calendar` | boolean | false | Whether to ignore calendar availability |
| `ignore_terms` | boolean | false | Whether to ignore terms and conditions |
| `ignore_blocks` | boolean | false | Whether to ignore booking blocks |
| `coupon_code` | string | null | Promotional coupon code |

## Guest Count Validation

The function validates that the total guest count equals the sum of adults, children, and infants:

```
guests_count = number_of_adults + number_of_children + number_of_infants
```

**Important Notes:**
- If `number_of_adults` is not provided, it defaults to the full `guests_count`
- The validation only applies when detailed guest breakdown fields are explicitly provided
- Pets are not included in the total guest count calculation
- Only non-zero guest breakdown values are sent to the Guesty API for optimal performance

## API Request Structure

The function transforms your input into the Guesty API's expected nested format:

**Your Input:**
```json
{
  "guests_count": 4,
  "number_of_adults": 2,
  "number_of_children": 1,
  "number_of_infants": 1,
  "number_of_pets": 0
}
```

**Sent to Guesty API:**
```json
{
  "guestsCount": 4,
  "numberOfGuests": {
    "numberOfAdults": 2,
    "numberOfChildren": 1,
    "numberOfInfants": 1
    // numberOfPets omitted since it's 0
  }
}
```

## Request Examples

### Basic Request

```json
{
  "check_in_date_localized": "2025-07-15",
  "check_out_date_localized": "2025-07-20",
  "listing_id": "abc123",
  "source": "website",
  "guests_count": 2
}
```

### Detailed Request with Guest Breakdown

```json
{
  "check_in_date_localized": "2025-07-15",
  "check_out_date_localized": "2025-07-20",
  "listing_id": "abc123",
  "source": "mobile_app",
  "guests_count": 4,
  "number_of_adults": 2,
  "number_of_children": 1,
  "number_of_infants": 1,
  "number_of_pets": 1,
  "ignore_calendar": false,
  "ignore_terms": false,
  "ignore_blocks": false,
  "coupon_code": "SUMMER25"
}
```

## Response Format

### Success Response (200)

```json
{
  "success": true,
  "guesty_quote": {
    "id": "guesty_quote_id",
    "_id": "guesty_internal_id",
    "numberOfGuests": {
      "numberOfAdults": 2,
      "numberOfChildren": 1,
      "numberOfInfants": 1
    },
    "pricing": {
      "total": 500.00,
      "currency": "USD",
      "basePrice": 400.00,
      "cleaningFee": 50.00,
      "serviceFee": 30.00,
      "taxes": 20.00
    },
    "checkInDateLocalized": "2025-07-15",
    "checkOutDateLocalized": "2025-07-20",
    "listingId": "abc123",
    "guestsCount": 4
  }
}
```

### Error Responses

#### 400 - Bad Request

```json
{
  "error": "Missing required field: check_in_date_localized"
}
```

```json
{
  "error": "Total guest count must equal sum of adults, children, and infants",
  "details": "Expected: 4, Got: 3"
}
```

```json
{
  "error": "Check-in date must be before check-out date"
}
```

#### 401 - Unauthorized

```json
{
  "error": "Missing authorization header"
}
```

#### 500 - Internal Server Error

```json
{
  "error": "Failed to retrieve Guesty API token"
}
```

```json
{
  "error": "Guesty API error: 400",
  "details": "Invalid listing ID"
}
```

## Validation Rules

### Date Validation
- Check-in date must be before check-out date
- Dates must be in valid YYYY-MM-DD format

### Guest Count Validation
- Total guests must be at least 1
- Adults must be at least 1
- Children, infants, and pets must be non-negative
- Sum of adults + children + infants must equal total guests

### Required Fields
- All required fields must be present and non-empty
- String fields cannot be empty or null

## Features

- **Comprehensive Guest Breakdown**: Supports detailed guest composition (adults, children, infants, pets)
- **Smart Field Optimization**: Only sends non-zero guest breakdown values to the API
- **Flexible Input Validation**: Validates guest totals only when detailed breakdown is provided
- **Proper API Structure**: Transforms flat input into Guesty's required nested `numberOfGuests` format
- **Comprehensive Error Handling**: Detailed validation and error reporting
- **CORS Support**: Full cross-origin request support
- **Debug Logging**: Request/response logging for troubleshooting

## Debugging

The function includes comprehensive logging to help troubleshoot issues:

```javascript
// Logs the exact request being sent to Guesty API
console.log("Sending to Guesty API:", JSON.stringify(guestyQuoteRequest, null, 2));

// Logs the response received from Guesty API  
console.log("Guesty API response:", JSON.stringify(guestyData, null, 2));
```

Check your function logs to see the actual request/response data when troubleshooting.

## Database Integration

The function currently does not store quote information in the local database. It only interacts with the Guesty API to create quotes and returns the response directly to the client.

## Architecture

```
Client Request → Edge Function → Guesty API → Response to Client
      ↓              ↓              ↓
  Validation   Transform to    Return Quote
  & Cleanup    Nested Format      Data
```

The function acts as a smart proxy that:
1. Validates and cleans input data
2. Transforms flat guest data into Guesty's nested format
3. Optimizes the request by excluding zero values
4. Returns the complete quote response

## Guesty API Integration

The function communicates with the Guesty API at:
```
POST https://open-api.guesty.com/v1/quotes
```

The request includes detailed guest breakdown information nested under the `numberOfGuests` object as required by the Guesty API specification:

```json
{
  "listingId": "abc123",
  "checkInDateLocalized": "2025-07-15",
  "checkOutDateLocalized": "2025-07-20",
  "guestsCount": 4,
  "numberOfGuests": {
    "numberOfAdults": 2,
    "numberOfChildren": 1,
    "numberOfInfants": 1,
    "numberOfPets": 1
  },
  "source": "website",
  "ignoreCalendar": false,
  "ignoreTerms": false,
  "ignoreBlocks": false,
  "couponCode": "SUMMER25"
}
```

**Note**: Only non-zero guest breakdown fields are included in the `numberOfGuests` object to optimize the request payload.

## Local Development

### Prerequisites
- Supabase CLI installed
- Local Supabase instance running
- Valid Guesty API token in the database

### Testing

```bash
# Start local Supabase
supabase start

# Test the function
curl -i --location --request POST 'http://localhost:54321/functions/v1/Create-Quote' \
--header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
--header 'Content-Type: application/json' \
--data-raw '{
  "check_in_date_localized": "2025-07-15",
  "check_out_date_localized": "2025-07-20",
  "listing_id": "abc123",
  "source": "website",
  "guests_count": 4,
  "number_of_adults": 2,
  "number_of_children": 1,
  "number_of_infants": 1,
  "number_of_pets": 0,
  "ignore_calendar": false,
  "ignore_terms": false,
  "ignore_blocks": false,
  "coupon_code": "SUMMER25"
}'
```

## Error Handling

The function includes comprehensive error handling for:
- Missing or invalid input data
- Authentication failures
- Guesty API errors
- Database connection issues
- Unexpected server errors

All errors are returned with appropriate HTTP status codes and descriptive error messages.

## Security Considerations

- All requests require valid Supabase authentication
- Input validation prevents injection attacks
- Error messages don't expose sensitive system information
- CORS headers are configured for secure cross-origin access

## Dependencies

- Deno Standard Library HTTP Server
- Supabase JavaScript Client
- Guesty Open API (external)

## Version History

- **v1.0.0**: Initial implementation with basic quote creation
- **v1.1.0**: Added detailed guest breakdown support (adults, children, infants, pets)
- **v1.1.1**: Enhanced validation and error handling
- **v1.2.0**: Fixed guest breakdown structure to use nested `numberOfGuests` object
- **v1.2.1**: Added smart field optimization (only send non-zero values)
- **v1.2.2**: Added comprehensive debugging and logging
