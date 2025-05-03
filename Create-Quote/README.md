# Create-Quote Function Documentation

## Overview

The `Create-Quote` function is a Deno edge function that integrates with the Supabase and Guesty APIs to create a quote for a property listing. It performs the following tasks:

1. Validates the incoming HTTP POST request.
2. Retrieves an authorization token from the Supabase database.
3. Sends a quote creation request to the Guesty API.
4. Stores the quote details in the Supabase database.
5. Returns the created quote details along with the Guesty API response.

This function is designed to handle quote creation for vacation rental listings.

---

## Endpoints

### Function URL
`https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/Create-Quote`

---

## Method

- **POST**: This function only supports POST requests.

---

## Request Headers

- **Authorization**: A `Bearer` token is required in the `Authorization` header. This token should be your Supabase anonymous key or a valid token.

- **Content-Type**: Must be set to `application/json`.

---

## Request Body

The request body should be a JSON object with the following fields:

### Required Fields
- `check_in_date_localized` (string): The check-in date in a localized format (e.g., `2025-06-01`).
- `check_out_date_localized` (string): The check-out date in a localized format (e.g., `2025-06-07`).
- `listing_id` (string): The ID of the property listing.
- `source` (string): The source of the booking (e.g., `website`).
- `guests_count` (number): The number of guests (must be at least 1).

### Optional Fields
- `ignore_calendar` (boolean): Whether to ignore calendar availability. Default is `false`.
- `ignore_terms` (boolean): Whether to ignore terms and conditions. Default is `false`.
- `ignore_blocks` (boolean): Whether to ignore blocked dates. Default is `false`.
- `coupon_code` (string): A coupon code for discounts. Default is `null`.

---

## Response

The function returns a JSON object with the following structure:

### Success Response
```json
{
  "success": true,
  "quote_id": "quote_id_in_database",
  "guesty_quote": {
    "id": "guesty_quote_id",
    "pricing": {
      "total": 1000,
      "currency": "USD"
    }
  },
  "database_record": {
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
}
```

### Error Response
The function returns appropriate error messages when validation or processing fails. Example:

```json
{
  "error": "Missing required field: guests_count"
}
```

---

## Validation

### Request Method
Only POST requests are allowed. Requests using other methods will return:

```json
{
  "error": "Method not allowed"
}
```

### Required Fields
The function validates that all required fields are provided. Missing fields will result in:

```json
{
  "error": "Missing required field: <field_name>"
}
```

### Date Validation
- Check-in date must be before the check-out date.
- Dates must be in a valid format.
- Example error:

```json
{
  "error": "Check-in date must be before check-out date"
}
```

### Guests Count
The number of guests must be at least 1. Invalid values will result in:

```json
{
  "error": "guests_count must be at least 1"
}
```

---

## Curl Command to Test the Function

Use the following `curl` command to test the function:

```bash
curl -i --location --request POST 'https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/Create-Quote' \
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

Replace `YOUR_SUPABASE_ANON_KEY` with your actual Supabase anonymous key.

---

## Error Logging

The function logs errors using `console.error` for debugging purposes. Common errors include:
- Missing authorization headers.
- Invalid or missing required fields.
- Issues communicating with the Guesty API.
- Database errors when retrieving tokens or storing quotes.

---

## Environment Variables

The function relies on the following environment variables:
- `SUPABASE_URL`: The Supabase project URL.
- `SUPABASE_ANON_KEY`: The Supabase anonymous key for API interaction.

Ensure these variables are set in your environment before deploying or running the function.

---

## Local Testing

To test the function locally:
1. Start Supabase locally using the CLI: `supabase start`.
2. Execute the provided curl command with your local function URL (e.g., `http://localhost:54321/functions/v1/Create-Quote`).

---

## Dependencies

- **Deno Standard Library**: Used for the HTTP server.
- **Supabase JavaScript Client**: Used to interact with the Supabase database.
- **Guesty API**: External API for creating quotes.

---
