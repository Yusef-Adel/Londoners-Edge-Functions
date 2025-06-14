# `add-payment` Edge Function

This Supabase Edge Function allows you to add a payment to a reservation in Guesty via API, handling payment method validation, CORS, and secure token fetching from your Supabase database.

---

## Features

- **Handles CORS**: Pre-configured for all browsers.
- **Validates Request Body**: Checks for required fields (`reservationId`, `paymentParams`, valid `amount`, and `paymentMethod`).
- **Fetches Guesty API Token**: Reads the Guesty API token from the `guesty_tokens` table in Supabase.
- **Calls Guesty Payments API**: Forwards the payment to Guesty for the specified reservation.
- **Comprehensive Error Responses**: Clear JSON errors for all failure cases.
- **Supports multiple payment methods**: Including credit card, cash, and others as supported by Guesty.
- **Ready for local or deployed use**: With detailed curl examples.

---

## API Endpoint

```
POST /functions/v1/add-payment
```

---

### CORS Support

- `OPTIONS` handled for preflight.
- CORS headers allow all origins and standard headers.

---

### Required Headers

| Header            | Value                                 |
|-------------------|---------------------------------------|
| Authorization     | Bearer {YOUR_SUPABASE_ANON_KEY or JWT}|
| Content-Type      | application/json                      |

---

### Request Body

```ts
interface PaymentMethod {
  method?: string;            // e.g., "CASH", "CREDIT_CARD", etc.
  id?: string;                // credit-card payment method ID, if needed
  saveForFutureUse?: boolean; // for cards
}

interface PaymentParams {
  paymentMethod: PaymentMethod; // Required
  amount: number;               // Required
  shouldBePaidAt?: string;      // Optional ISO string
  paidAt?: string;              // Optional ISO string
  note?: string;                // Optional
  isAuthorizationHold?: boolean;// Optional
}

interface RequestBody {
  reservationId: string;        // Required
  paymentParams: PaymentParams; // Required
}
```

#### Validation Rules

- `reservationId` is **required**.
- `paymentParams` must be provided and contain:
  - `paymentMethod`
  - `amount` (must be a number)

---

### Example Requests

#### Basic Example

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/add-payment' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "reservationId": "your-reservation-id",
    "paymentParams": {
      "paymentMethod": {
        "method": "CASH",
        "saveForFutureUse": false
      },
      "amount": 100.00,
      "note": "Payment for reservation",
      "isAuthorizationHold": false
    }
  }'
```

#### Credit Card Example

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/add-payment' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "reservationId": "your-reservation-id",
    "paymentParams": {
      "paymentMethod": {
        "method": "CREDIT_CARD",
        "id": "payment-method-id",
        "saveForFutureUse": true
      },
      "amount": 250.00,
      "shouldBePaidAt": "2025-06-15T10:00:00Z",
      "note": "Advance payment",
      "isAuthorizationHold": false
    }
  }'
```

---

## Success Response

```json
{
  "success": true,
  "data": {
    // ...Payment object returned by Guesty API
  },
  "message": "Payment added successfully"
}
```

---

## Error Responses

- **405 Method Not Allowed**: If request method is not POST/OPTIONS.
- **400 Bad Request**: If required fields are missing or invalid.
- **500 Internal Server Error**: If token fetch fails or there is an unexpected error.
- **4xx/5xx**: If Guesty API responds with an error; the response will include Guesty's error details.

Example:
```json
{
  "error": "Failed to add payment to Guesty",
  "details": "...Guesty error message...",
  "status": 422
}
```

---

## Environment Variables

You must set the following in your Deno environment:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

---

## Database Requirements

The function expects a `guesty_tokens` table in your Supabase database with an `access_token` column containing a valid Guesty API token.

---

## Local Development

1. Start Supabase locally:  
   ```bash
   supabase start
   ```
2. Deploy or run the function, and use the sample curl requests above.

---

## Related Links

- [Deno: Setup Your Environment](https://deno.land/manual/getting_started/setup_your_environment)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Guesty Open API: Payments](https://open-api.guesty.com/docs#/Reservations%20API/post_v1_reservations__reservationId__payments)
