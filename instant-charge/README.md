# Instant Charge Reservation

This edge function creates an instant charge reservation using the Guesty Booking Engine API. It converts a quote into a confirmed reservation with immediate payment processing. This function supports both Stripe (using confirmation tokens) and other payment providers (using tokenized payment method IDs).

## Features

- **Token Management**: Automatically retrieves valid access token from database
- **Instant Charge**: Creates confirmed reservations with immediate payment
- **Dual Payment Support**: Handles both Stripe confirmation tokens and GuestyPay payment method IDs
- **Guest Information**: Processes comprehensive guest details
- **Flexible Reservation Hold**: Configure how long to hold the reservation
- **Payment Method Reuse**: Option to save payment method for future charges
- **CORS Support**: Full CORS compatibility with all browsers
- **Error Handling**: Comprehensive validation and error handling

## Prerequisites

1. **Token Generator**: The `booking-engine-token-generator` function must be running and maintaining valid tokens
2. **Quote Creation**: You must first create a quote using `booking-engine-create-reservation-quote` to get a `quoteId`
3. **Payment Method**: You need either:
   - **Stripe**: A confirmation token from Stripe's frontend embedded component
   - **Other Providers**: A payment method ID from Guesty's tokenization endpoint
4. **Database Table**: The `guesty_booking_engine_tokens` table must exist with valid tokens

## API Endpoint

```
POST https://your-project.supabase.co/functions/v1/instant-charge
```

## Request Format

### Required Fields

- `quoteId` (string): ID of the quote to convert to a reservation
- `ratePlanId` (string): Rate plan ID from the quote payload (must match one returned in the quote)
- `confirmationToken` (string) **OR** `initialPaymentMethodId` (string): 
  - Use `confirmationToken` for Stripe payments
  - Use `initialPaymentMethodId` for other payment providers (GuestyPay, etc.)
- `guest` (object): Guest information object with firstName, lastName, and email

### Optional Fields

- `reservedUntil` (integer): Time in hours to reserve the reservation. Default: 12
  - Valid values: `-1` (keep calendar reserved), `12`, `24`, `36`, `48`, `72`
- `reuse` (boolean): Whether to reuse the payment method for future charges. Default: false
- `policy` (object): Policy acceptance or terms
- `notes` (object): Additional notes for the reservation

### Guest Object Structure

The `guest` object **must** contain:
- `firstName` (string): Guest's first name
- `lastName` (string): Guest's last name
- `email` (string): Guest's email address

Optional guest fields:
- `phone` (string): Guest's phone number
- `address` (string): Guest's address
- Additional fields as required by Guesty API

### Policy Object Structure

The `policy` object (optional) can contain:
- Policy acceptance flags
- Terms and conditions acceptance
- Cancellation policy agreement
- Other policy-related fields

### Notes Object Structure

The `notes` object (optional) can contain:
- Special requests
- Additional instructions
- Guest preferences

## Example Requests

### Example 1: Using Stripe Confirmation Token

```bash
curl --location --request POST 'https://your-project.supabase.co/functions/v1/instant-charge' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "quoteId": "69908402555e669a2bf7ecab",
    "ratePlanId": "67aa3c85546cbf6957c45820",
    "confirmationToken": "seti_1234567890abcdef",
    "reservedUntil": 12,
    "reuse": false,
    "guest": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phone": "+1234567890"
    },
    "policy": {
      "agreedToTerms": true,
      "agreedToCancellationPolicy": true
    },
    "notes": {
      "specialRequests": "Early check-in if possible"
    }
  }'
```

### Example 2: Using GuestyPay Payment Method ID

```bash
curl --location --request POST 'https://your-project.supabase.co/functions/v1/instant-charge' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "quoteId": "69908402555e669a2bf7ecab",
    "ratePlanId": "67aa3c85546cbf6957c45820",
    "initialPaymentMethodId": "69908c379d3908ac6857db5f",
    "reservedUntil": 24,
    "reuse": true,
    "guest": {
      "firstName": "Bishoy",
      "lastName": "Osama",
      "email": "bisho@gensystem.net"
    }
  }'
```

### Example 3: Hold Reservation Indefinitely

```bash
curl --location --request POST 'https://your-project.supabase.co/functions/v1/instant-charge' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "quoteId": "69908402555e669a2bf7ecab",
    "ratePlanId": "67aa3c85546cbf6957c45820",
    "confirmationToken": "seti_1234567890abcdef",
    "reservedUntil": -1,
    "reuse": false,
    "guest": {
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane.smith@example.com"
    }
  }'
```

## Response Format

### Success Response

```json
{
  "status": "success",
  "message": "Instant charge reservation created successfully",
  "data": {
    "reservationId": "691713f752501cc323d367ce",
    "status": "confirmed",
    "platform": "direct",
    "confirmationCode": "ABC123XYZ",
    "createdAt": "2025-11-14T11:35:19.711Z",
    "guestId": "691713f752501cc323d367cf",
    "listingId": "5e8f9a1b2c3d4e5f6g7h8i9j",
    "checkIn": "2026-03-15T15:00:00.000Z",
    "checkOut": "2026-03-20T11:00:00.000Z",
    "pricing": {
      "invoiceItems": [],
      "currency": "USD",
      "hostPayout": 850.00,
      "hostPayoutUsd": 850.00,
      "channelCommission": 0,
      "basePrice": 750.00,
      "cleaningFee": 100.00,
      "totalPaid": 850.00
    },
    "fullResponse": {
      // Complete response from Guesty API
    }
  }
}
```

### Error Response Examples

#### Missing Required Field

```json
{
  "status": "error",
  "message": "Missing required field: quoteId"
}
```

#### Invalid Payment Method Configuration

```json
{
  "status": "error",
  "message": "Either confirmationToken (for Stripe) or initialPaymentMethodId (for other providers) is required"
}
```

#### Invalid reservedUntil Value

```json
{
  "status": "error",
  "message": "reservedUntil must be one of: -1, 12, 24, 36, 48, 72"
}
```

#### Guesty API Error

```json
{
  "status": "error",
  "message": "Failed to create instant charge reservation",
  "details": {
    "error": "Invalid rate plan ID",
    "code": "INVALID_RATE_PLAN"
  }
}
```

## Field Validation

### Required Validations

1. **quoteId**: Must be a valid quote ID from a previously created quote
2. **ratePlanId**: Must match one of the rate plan IDs returned in the quote payload
3. **Payment Method**: Either `confirmationToken` OR `initialPaymentMethodId` (not both)
4. **guest**: Must include `firstName`, `lastName`, and `email`

### Optional Field Validations

1. **reservedUntil**: If provided, must be one of: `-1`, `12`, `24`, `36`, `48`, `72`
2. **reuse**: If provided, must be a boolean value

### Mutual Exclusivity

- You **cannot** provide both `confirmationToken` and `initialPaymentMethodId`
- The function will return an error if both are present

## Payment Methods

### Stripe Payment (confirmationToken)

When using Stripe as your payment provider:

1. Use Stripe's frontend embedded payment component to collect payment details
2. Obtain a `confirmationToken` (typically starts with `seti_`)
3. Pass this token in the `confirmationToken` field
4. Do **not** include `initialPaymentMethodId`

**Example:**
```json
{
  "confirmationToken": "seti_1PQrS2TuVwXyZ34567890abc"
}
```

### Other Payment Providers (initialPaymentMethodId)

When using GuestyPay or other payment providers:

1. Use Guesty's tokenization endpoint to create a payment method
2. Obtain the payment method ID from the tokenization response
3. Pass this ID in the `initialPaymentMethodId` field
4. Do **not** include `confirmationToken`

**Example:**
```json
{
  "initialPaymentMethodId": "69908c379d3908ac6857db5f"
}
```

Refer to the `card-tokenize` function for creating payment method IDs.

## Reserved Until Options

The `reservedUntil` field controls how long the calendar is blocked:

| Value | Description |
|-------|-------------|
| `-1`  | Keep calendar reserved indefinitely |
| `12`  | Reserve for 12 hours (default) |
| `24`  | Reserve for 24 hours |
| `36`  | Reserve for 36 hours |
| `48`  | Reserve for 48 hours |
| `72`  | Reserve for 72 hours |

## Payment Method Reuse

Set `reuse: true` to save the payment method for future charges:

```json
{
  "reuse": true
}
```

This allows you to charge the same payment method for additional fees, damages, or future reservations without requiring the guest to re-enter payment details.

## Workflow

1. **Create Quote**: Use `booking-engine-create-reservation-quote` to get a quote
2. **Get Rate Plan**: Extract the `ratePlanId` from the quote response
3. **Tokenize Payment**: 
   - For Stripe: Use Stripe's component to get confirmation token
   - For others: Use `card-tokenize` to get payment method ID
4. **Create Reservation**: Call this function with all required data
5. **Receive Confirmation**: Get reservation ID and confirmation code

## Common Use Cases

### Standard Reservation (12 hours hold)

```json
{
  "quoteId": "abc123",
  "ratePlanId": "xyz789",
  "confirmationToken": "seti_token",
  "guest": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com"
  }
}
```

### Long-term Hold with Payment Reuse

```json
{
  "quoteId": "abc123",
  "ratePlanId": "xyz789",
  "initialPaymentMethodId": "pm_id",
  "reservedUntil": 72,
  "reuse": true,
  "guest": {
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@example.com"
  }
}
```

### Permanent Calendar Block

```json
{
  "quoteId": "abc123",
  "ratePlanId": "xyz789",
  "confirmationToken": "seti_token",
  "reservedUntil": -1,
  "guest": {
    "firstName": "Bob",
    "lastName": "Johnson",
    "email": "bob@example.com"
  }
}
```

## Database Requirements

### Table: `guesty_booking_engine_tokens`

The function requires a table to store booking engine tokens:

```sql
CREATE TABLE guesty_booking_engine_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  access_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

Tokens should be refreshed regularly by the `booking-engine-token-generator` function.

## Error Handling

The function provides detailed error messages for:

- Missing required fields
- Invalid field values
- Token expiration or absence
- Guesty API errors
- Payment method validation errors
- Rate plan validation errors

All errors include a `status: "error"` field and descriptive `message`.

## Related Functions

- **booking-engine-token-generator**: Generates and maintains booking engine tokens
- **booking-engine-create-reservation-quote**: Creates quotes (prerequisite)
- **card-tokenize**: Tokenizes payment methods for non-Stripe providers
- **create-payment-method**: Alternative payment method creation
- **update-reservation-status**: Update reservation status after creation

## Security Notes

1. **Never** expose Supabase service role keys in client code
2. **Always** use the `Authorization` header with proper Supabase keys
3. Payment tokens (confirmationToken) are single-use and should not be reused
4. Payment method IDs (initialPaymentMethodId) can be reused if `reuse: true`
5. Validate all input on both client and server side

## Testing

Use the Guesty sandbox environment for testing:

1. Create test quotes in sandbox
2. Use test payment methods
3. Verify reservation creation
4. Check calendar blocking behavior
5. Test payment method reuse functionality

## Support

For issues or questions:

- Check Guesty API documentation: https://booking-api-docs.guesty.com/reference/createinstantchargereservationfromquote
- Verify token validity in database
- Check function logs for detailed error messages
- Ensure quote exists and is valid before charging

## API Reference

**Guesty Documentation**: [Create Instant Charge Reservation from Quote](https://booking-api-docs.guesty.com/reference/createinstantchargereservationfromquote)

**Endpoint Used**: 
```
POST https://booking.guesty.com/api/reservations/quotes/{quoteId}/instant-charge
```
