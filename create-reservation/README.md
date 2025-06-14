# `create-reservation` Edge Function

This edge function creates a reservation in Guesty from a quote, handling both new and existing guests. It is designed to be deployed in a Deno-compatible environment (such as [Supabase Edge Functions](https://supabase.com/docs/guides/functions)) and communicates with both Supabase (for token management) and the Guesty API.

---

## Features

- **Validates incoming reservation requests**: Ensures required fields are present and properly formatted.
- **Handles both new and existing guests**: Accepts either a `guestId` (for existing guests) or a `guest` object (for new guests).
- **Integrates with Supabase**: Fetches the Guesty API token from your Supabase database table (`guesty_tokens`).
- **Creates confirmed reservations in Guesty**: Forwards reservation data to Guesty with a status of `confirmed`.
- **Comprehensive error handling**: Returns clear JSON error messages for common failure modes.
- **CORS, Auth, and method safety**: Only allows POST requests and requires an Authorization header.

---

## API Endpoint

```
POST /functions/v1/create-reservation
```

---

### Required Headers

| Header            | Value                                 |
|-------------------|---------------------------------------|
| Authorization     | Bearer {YOUR_SUPABASE_ANON_KEY or JWT}|
| Content-Type      | application/json                      |

---

### Request Body

The endpoint accepts a JSON object matching the following TypeScript interface:

```ts
interface ReservationRequest {
  quoteId: string;                   // Required
  ratePlanId?: string;
  reservedUntil?: number;            // Defaults to -1 if omitted
  guestId?: string;                  // Required if 'guest' is not provided
  guest?: {                          // Required if 'guestId' is not provided
    firstName: string;
    lastName: string;
    phones: string[];                // Must be a non-empty array
    email: string;
    address?: object;
  };
  ignoreCalendar?: boolean;
  ignoreTerms?: boolean;
  ignoreBlocks?: boolean;
  confirmedAt?: string;
  confirmationCode?: string;
  origin?: string;
  originId?: string;
}
```

#### **Validation Rules**
- You must provide either `guestId` **or** a complete `guest` object.
- If a `guest` object is provided, all its required fields must be present and `phones` must be a non-empty array.
- `quoteId` is always required.

---

### Example Requests

#### Existing Guest

```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/create-reservation' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "quoteId": "your-quote-id-here",
    "guestId": "existing-guest-id",
    "ratePlanId": "optional-rate-plan-id",
    "reservedUntil": -1,
    "ignoreCalendar": false,
    "ignoreTerms": false,
    "ignoreBlocks": false,
    "confirmationCode": "CONF123",
    "origin": "website",
    "originId": "web-001"
  }'
```

#### New Guest

```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/create-reservation' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "quoteId": "your-quote-id-here",
    "guest": {
      "firstName": "John",
      "lastName": "Doe",
      "phones": ["+1234567890"],
      "email": "john.doe@example.com",
      "address": {
        "street": "123 Main St",
        "city": "Anytown",
        "state": "CA",
        "zipCode": "12345"
      }
    },
    "ratePlanId": "optional-rate-plan-id",
    "reservedUntil": -1,
    "ignoreCalendar": false,
    "ignoreTerms": false,
    "ignoreBlocks": false,
    "confirmationCode": "CONF123",
    "origin": "website",
    "originId": "web-001"
  }'
```

---

## Success Response

```json
{
  "success": true,
  "reservation": {
    "_id": "guesty-reservation-id",
    "reservationId": "guesty-reservation-id",
    "status": "confirmed",
    "confirmationCode": "CONF123"
    // ...other fields from Guesty API
  },
  "message": "Reservation created successfully with confirmed status"
}
```

---

## Error Responses

- **405 Method Not Allowed**: If request method is not POST.
- **401 Unauthorized**: If the authorization header is missing.
- **400 Bad Request**: If required fields are missing or invalid in the request body.
- **500 Internal Server Error**: If token fetch fails or there is an unexpected error.
- **4xx/5xx**: If Guesty API responds with an error; the response will include the error details from Guesty.

Example:
```json
{
  "error": "Guesty Reservation API error: 422",
  "details": "Detailed error returned by Guesty"
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

## Logging

- Logs initialization, API requests to Guesty, and reservation creation results.
- Errors are logged with details for debugging.

---

## Related Links

- [Deno: Setup Your Environment](https://deno.land/manual/getting_started/setup_your_environment)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Guesty Open API: Reservations](https://open-api.guesty.com/docs)
