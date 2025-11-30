# Card Tokenize Edge Function

This Edge Function tokenizes credit card information using the Guesty Pay API. It retrieves the Guesty access token from the database and securely processes card tokenization requests.

## Overview

The function accepts card details and billing information, validates the input, retrieves a valid Guesty token from the database, and calls the Guesty tokenization endpoint to generate a secure payment token.

## Endpoint

```
POST /functions/v1/card-tokenize
```

## Authentication

Requires a valid Supabase authentication token in the `Authorization` header:

```
Authorization: Bearer YOUR_SUPABASE_ANON_KEY
```

## Request Body

```json
{
  "listingId": "679b0ea4cb8d6900130ed2c5",
  "card": {
    "number": "CARD-NUMBER",
    "exp_month": "",
    "exp_year": "",
    "cvc": ""
  },
  "billing_details": {
    "name": "Bishoy Osama",
    "address": {
      "line1": "Cairo Street",
      "city": "Alex",
      "postal_code": "21611",
      "country": "Egypt"
    }
  },
  "threeDS": {
    "amount": 1,
    "currency": "USD"
  }
}
```

### Required Fields

- `listingId` (string): The Guesty listing ID for which the card is being tokenized
- `card` (object): Credit card information
  - `number` (string): Card number
  - `exp_month` (string): Expiration month (2 digits)
  - `exp_year` (string): Expiration year (4 digits)
  - `cvc` (string): Card security code
- `billing_details` (object): Billing information
  - `name` (string): Cardholder name
  - `address` (object): Billing address
    - `line1` (string): Street address
    - `city` (string): City
    - `postal_code` (string): Postal/ZIP code
    - `country` (string): Country

### Optional Fields

- `threeDS` (object): 3D Secure authentication parameters
  - `amount` (number): Transaction amount
  - `currency` (string): Currency code (e.g., "USD", "EUR")

## Response

### Success Response (200)

```json
{
  "success": true,
  "message": "Card tokenized successfully",
  "data": {
    "token": "tok_xxxxxxxxxx",
    "card": {
      "brand": "visa",
      "last4": "6075",
      "exp_month": 12,
      "exp_year": 2029
    },
    "threeDS": {
      "status": "succeeded",
      "redirect_url": null
    }
  }
}
```

### Error Responses

#### 400 - Validation Error

```json
{
  "error": "Validation error",
  "message": "card must include number, exp_month, exp_year, and cvc"
}
```

#### 405 - Method Not Allowed

```json
{
  "error": "Method not allowed",
  "message": "This endpoint only accepts POST requests"
}
```

#### 500 - Token Retrieval Error

```json
{
  "error": "Internal server error",
  "message": "No Guesty token found in database. Please generate a token first."
}
```

```json
{
  "error": "Internal server error",
  "message": "Guesty token has expired. Please refresh the token."
}
```

#### 500 - Guesty API Error

```json
{
  "error": "Guesty API error",
  "message": "Failed to tokenize card",
  "details": {
    "error": "invalid_card",
    "message": "The card number is invalid"
  }
}
```

## How It Works

1. **Request Validation**: Validates all required fields (listingId, card details, billing information)
2. **Token Retrieval**: Fetches the latest valid Guesty access token from the `guesty_tokens` table
3. **Token Expiry Check**: Ensures the token is still valid (with 5-minute buffer)
4. **API Call**: Sends the card tokenization request to Guesty's tokenization endpoint
5. **Response Handling**: Returns the tokenization result or error details

## Database Dependencies

This function reads from the `guesty_tokens` table:

- **Table**: `guesty_tokens`
- **Columns used**: `access_token`, `expires_at`, `created_at`

Make sure a valid Guesty token exists in the database before using this function. You can generate a token using the `token-generator` Edge Function.

## Testing

### Using cURL

```bash
curl -i --location --request POST 'https://YOUR_PROJECT.supabase.co/functions/v1/card-tokenize' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "listingId": "679b0ea4cb8d6900130ed2c5",
    "card": {
      "number": "",
      "exp_month": "",
      "exp_year": "",
      "cvc": ""
    },
    "billing_details": {
      "name": "Bishoy Osama",
      "address": {
        "line1": "Cairo Street",
        "city": "Alex",
        "postal_code": "21611",
        "country": "Egypt"
      }
    },
    "threeDS": {
      "amount": 1,
      "currency": "USD"
    }
  }'
```

### Test Card Numbers

For testing purposes, use Guesty/Stripe test card numbers:

- **Visa**: `4242424242424424`
- **Visa (3D Secure required)**: `4000002500003155`
- **Mastercard**: `5555555555554444`
- **Amex**: `378282246310005`

All test cards use:
- Any future expiration date (e.g., `12/2029`)
- Any 3-digit CVC (4 digits for Amex)

## Security Notes

- **Never log sensitive card data** in production
- Card information is passed directly to Guesty's PCI-compliant tokenization endpoint
- The function does not store any card information in the database
- Ensure proper authentication and authorization before allowing access to this endpoint
- Use HTTPS/TLS for all requests in production

## Related Functions

- **token-generator**: Generates and stores Guesty access tokens
- **booking-engine-token-generator**: Generates Booking Engine tokens (if using separate tokens)

## Environment Variables

Required environment variables (automatically available in Supabase Edge Functions):

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for database access

## CORS Support

This function includes CORS headers to allow cross-origin requests from web applications:

- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`
- `Access-Control-Allow-Methods: POST, OPTIONS`

Adjust the `Access-Control-Allow-Origin` header in production to restrict access to your specific domain.


