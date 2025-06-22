# Quote Creator Edge Function

## Overview

The Quote Creator Edge Function is a serverless function designed to handle quote requests for listings. It interacts with Guesty and Supabase to fetch pricing details and persist quotes in the database. It supports CORS and includes robust error handling.

### Key Features:
- Validates input for required fields and proper formats.
- Generates quotes using Guesty API.
- Stores quotes in Supabase database.
- Comprehensive CORS headers for cross-origin requests.
- Handles preflight requests for OPTIONS.

---

## Setup Guide

### Prerequisites
1. **Deno Environment**: Set up the Deno language server for your editor. Follow the [Deno setup guide](https://deno.land/manual/getting_started/setup_your_environment).
2. **Supabase**: Ensure Supabase is running locally. Refer to the [Supabase CLI documentation](https://supabase.com/docs/reference/cli/supabase-start).

### Environment Variables
Define the following environment variables:
- `SUPABASE_URL`: The base URL for your Supabase instance.
- `SUPABASE_ANON_KEY`: The Supabase anonymous key for authentication.

---

## How It Works

### Request Structure
**Endpoint**: `http://localhost:54321/functions/v1/Create-Quote`  
**Method**: `POST`  

#### Request Body
```json
{
  "check_in_date_localized": "2025-06-01",
  "check_out_date_localized": "2025-06-07",
  "listing_id": "abc123",
  "source": "website",
  "guests_count": 2,
  "ignore_calendar": false,
  "ignore_terms": false,
  "ignore_blocks": false,
  "coupon_code": "SUMMER10"
}
```

#### Headers
- `Authorization`: Bearer token for Supabase authentication.
- `Content-Type`: `application/json`.

### Response Structure
#### Success Response
```json
{
  "success": true,
  "quote_id": "unique_quote_id",
  "guesty_quote": {
    "id": "guesty_quote_id",
    "pricing": {
      "total": 500,
      "currency": "USD"
    }
  },
  "database_record": {
    "check_in_date_localized": "2025-06-01",
    "check_out_date_localized": "2025-06-07",
    "listing_id": "abc123",
    "source": "website",
    "guests_count": 2,
    "coupon_code": "SUMMER10",
    "guesty_quote_id": "guesty_quote_id"
  }
}
```

#### Error Response
```json
{
  "error": "An unexpected error occurred",
  "details": "Error message"
}
```

---

## Example Usage

### Curl Command
```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/Create-Quote' \
--header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
--header 'Content-Type: application/json' \
--data-raw '{
  "check_in_date_localized": "2025-06-01",
  "check_out_date_localized": "2025-06-07",
  "listing_id": "abc123",
  "source": "website",
  "guests_count": 2,
  "ignore_calendar": false,
  "ignore_terms": false,
  "ignore_blocks": false,
  "coupon_code": "SUMMER10"
}'
```

---

## Notes

1. **Error Handling**:
   - Missing required fields.
   - Invalid date formats.
   - Check-in date must precede the check-out date.
   - Failed Guesty API or database operations.

2. **CORS**:
   - Allows requests from any origin.
   - Handles preflight OPTIONS requests.

3. **Supabase Database**:
   - Stores Guesty token.
   - Persists quotes after successful creation.

---

## Development

### Local Testing
1. Start Supabase locally using `supabase start`.
2. Use the provided curl command to test the function.

### Logs
Check logs for debugging:
```bash
tail -f supabase/logs/functions.log
```

---

## External References
- [Deno Setup Guide](https://deno.land/manual/getting_started/setup_your_environment)
- [Supabase CLI Documentation](https://supabase.com/docs/reference/cli/supabase-start)
