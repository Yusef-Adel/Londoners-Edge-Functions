# Supabase Edge Function: Create Payment Method (Guesty + Stripe)

This Edge Function integrates with [Guesty](https://docs.guesty.com/reference/introduction) and Stripe to create and save a new payment method for a guest. It is built for [Supabase Edge Functions](https://supabase.com/docs/guides/functions), fetches the required Guesty API token from your Supabase database, and calls the Guesty Open API.

**Function URL:**  
[`https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/create-payment-method`](https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/create-payment-method)

---

## Overview

- **Language/Runtime:** Deno (TypeScript/JavaScript)
- **Purpose:** Create a new payment method for a Guesty guest using a Stripe card token.
- **Authentication:** Requires Supabase JWT (Bearer token) in the `Authorization` header.
- **CORS:** Supports CORS preflight and allows cross-origin POST requests.
- **Environment Variables:**
  - `SUPABASE_URL` (Supabase project URL)
  - `SUPABASE_ANON_KEY` (Supabase anon/public API key)

---

## Usage

### HTTP Request

**Endpoint:**  
`POST /functions/v1/create-payment-method`

**Headers:**
- `Authorization: Bearer <your_supabase_jwt>`
- `Content-Type: application/json`

**Request Body (JSON):**
| Field              | Type      | Required | Default | Description                                                                   |
|--------------------|-----------|----------|---------|-------------------------------------------------------------------------------|
| `guestId`          | string    | Yes      | —       | Guest ID from Guesty.                                                          |
| `stripeCardToken`  | string    | Yes      | —       | Stripe card token (from Stripe Elements or SetupIntent, etc).                  |
| `skipSetupIntent`  | boolean   | No       | false   | TRUE if credit card was collected with setup_intent.                           |
| `paymentProviderId`| string    | No       | null    | Payment processing account Id, if required by Guesty.                          |
| `reservationId`    | string    | No       | null    | Reservation ID, if the payment method should be attached to a reservation.     |
| `reuse`            | boolean   | No       | false   | Set `true` to allow usage in other guest reservations.                         |

**Example:**
```bash
curl -i --location --request POST 'https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/create-payment-method' \
  --header 'Authorization: Bearer <your_supabase_jwt>' \
  --header 'Content-Type: application/json' \
  --data '{
    "guestId": "your-guest-id",
    "stripeCardToken": "your-stripe-card-token",
    "skipSetupIntent": false,
    "paymentProviderId": "your-payment-provider-id",
    "reservationId": "your-reservation-id",
    "reuse": false
  }'
```

---

## Example Response

```json
{
  "success": true,
  "data": {
    // Guesty API response object for the new payment method
  }
}
```

**Error Response Example:**
```json
{
  "error": "Failed to create payment method",
  "details": {
    // Raw error from Guesty API
  }
}
```

---

## Error Handling

- Returns `400` if required fields (`guestId` or `stripeCardToken`) are missing.
- Returns `405` if the method is not POST.
- Returns `500` if unable to retrieve Guesty API token or for internal server errors.
- Returns the Guesty API error and status code if the payment method creation fails.

---

## CORS

- Handles `OPTIONS` preflight requests.
- Allows all origins (`*`).
- Allows headers: `authorization`, `x-client-info`, `apikey`, `content-type`.

---

## Local Development

1. **Start Supabase local development environment:**
   ```bash
   supabase start
   ```
2. **Ensure your Guesty API token is stored in your local Supabase `guesty_tokens` table**  
   (`access_token` column, latest token used)
3. **Invoke the function locally:**
   ```bash
   curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/create-payment-method' \
     --header 'Authorization: Bearer <your_supabase_jwt>' \
     --header 'Content-Type: application/json' \
     --data '{
       "guestId": "your-guest-id",
       "stripeCardToken": "your-stripe-card-token"
     }'
   ```

---

## Prerequisites

- Store your Guesty API token in the `guesty_tokens` Supabase table:
  - Table: `guesty_tokens`
  - Column: `access_token`
  - The latest (most recently created) token will be used for API calls.

- Set the following environment variables in your Supabase project:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`

---

## Security

- Never expose your Supabase anon key or Guesty tokens in client-side code.
- Protect this endpoint using authentication (Authorization header required).
- Only allow trusted clients to call this function.

---

## References

- [Guesty Open API Docs](https://docs.guesty.com/reference/introduction)
- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Supabase CLI](https://supabase.com/docs/reference/cli/introduction)

---
