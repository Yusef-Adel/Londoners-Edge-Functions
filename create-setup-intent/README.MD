# Supabase Edge Function: Create Setup Intent (Stripe)

This Edge Function creates a [Stripe Setup Intent](https://stripe.com/docs/api/setup_intents) for securely saving a payment method for later use. It is designed to be deployed on [Supabase Edge Functions](https://supabase.com/docs/guides/functions) and interacts with the Stripe API.

**Function URL:**  
[`https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/create-setup-intent`](https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/create-setup-intent)

---

## Overview

- **Language/Runtime:** Deno (TypeScript/JavaScript)
- **Purpose:** Create a Stripe Setup Intent for collecting and saving customer payment methods.
- **Authentication:** Requires Supabase JWT (Bearer token) in the `Authorization` header.
- **Environment Variable:**  
  - `STRIPE_SECRET_KEY` (must be set in Supabase project secrets)

---

## Usage

### HTTP Request

**Endpoint:**  
`POST /functions/v1/create-setup-intent`

**Headers:**
- `Authorization: Bearer <your_supabase_jwt>`
- `Content-Type: application/json`

**Request Body (JSON):**
- `customer_id` (string, optional): Stripe Customer ID to associate with the setup intent.
- `usage` (string, optional): How the setup intent will be used. Defaults to `"off_session"`.
- `payment_method_types` (array of strings, optional): Payment method types. Defaults to `["card"]`.

**Example:**
```bash
curl -i --location --request POST 'https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/create-setup-intent' \
  --header 'Authorization: Bearer <your_supabase_jwt>' \
  --header 'Content-Type: application/json' \
  --data '{
    "customer_id": "cus_example123",
    "usage": "off_session",
    "payment_method_types": ["card"]
  }'
```

---

## Example Response

```json
{
  "client_secret": "seti_1234567890_secret_abcdef",
  "setup_intent_id": "seti_1234567890",
  "status": "requires_payment_method"
}
```

---

## Parameters

| Parameter             | Type     | Required | Default         | Description                                                      |
|-----------------------|----------|----------|-----------------|------------------------------------------------------------------|
| `customer_id`         | string   | No       | (none)          | Stripe customer ID to attach the payment method to               |
| `usage`               | string   | No       | `"off_session"` | Describes how the SetupIntent will be used                       |
| `payment_method_types`| string[] | No       | `["card"]`      | Array of allowed payment method types (e.g., `["card"]`, etc.)   |

---

## Error Handling

- Returns `500` if the Stripe secret key is not configured or for internal server errors.
- Returns the Stripe API error and status code if the creation of the setup intent fails.

**Example Error Response:**
```json
{
  "error": "Failed to create setup intent",
  "details": {
    "error": {
      "message": "Invalid customer ID",
      ...
    }
  }
}
```

---

## Local Development

1. **Start Supabase local development environment:**
   ```bash
   supabase start
   ```
2. **Invoke the function locally:**
   ```bash
   curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/create-setup-intent' \
     --header 'Authorization: Bearer <your_supabase_jwt>' \
     --header 'Content-Type: application/json' \
     --data '{"customer_id":"cus_example123","usage":"off_session","payment_method_types":["card"]}'
   ```

---

## Prerequisites

- Set your Stripe secret key as a Supabase secret:
  ```bash
  supabase secrets set STRIPE_SECRET_KEY=sk_test_...
  ```

- Deploy the function to your Supabase project for production.

---

## Security

- **Never expose your Stripe secret key.**  
  The secret key should be stored using [Supabase secrets](https://supabase.com/docs/guides/functions/secrets-management).
- The endpoint must be protected and should not be called directly from the client unless you have proper authentication and authorization in place.

---

## References

- [Stripe Setup Intents API Docs](https://stripe.com/docs/api/setup_intents)
- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Supabase CLI](https://supabase.com/docs/reference/cli/introduction)

---
