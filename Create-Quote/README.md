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

If `number_of_adults` is not provided, it defaults to the full `guests_count`.

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
  "quote_id": "local_quote_id_123",
  "guesty_quote": {
    "id": "guesty_quote_id",
    "_id": "guesty_internal_id",
    "pricing": {
      "total": 500.00,
      "currency": "USD"
    }
  },
  "database_record": {
    "quote_id": "local_quote_id_123",
    "check_in_date_localized": "2025-07-15",
    "check_out_date_localized": "2025-07-20",
    "listing_id": "abc123",
    "source": "website",
    "guests_count": 4,
    "number_of_adults": 2,
    "number_of_children": 1,
    "number_of_infants": 1,
    "number_of_pets": 1,
    "guesty_quote_id": "guesty_internal_id",
    "created_at": "2025-07-01T10:00:00Z"
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

## CORS Support

The function includes comprehensive CORS headers to support cross-origin requests:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type, x-requested-with, accept, origin, referer, user-agent
```

## Database Integration

The function stores quote information in the `quotes` table with the following fields:
- Local quote tracking information
- Guest breakdown details
- Guesty quote ID for reference
- Request parameters for audit trail

## Guesty API Integration

The function communicates with the Guesty API at:
```
POST https://open-api.guesty.com/v1/quotes
```

The request includes detailed guest breakdown information as required by the Guesty API specification.

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
