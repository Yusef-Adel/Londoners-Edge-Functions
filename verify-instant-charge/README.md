# Verify Instant Charge

This edge function verifies payment for an instant charge reservation created through the Guesty Booking Engine API. It is used to complete the payment verification process, especially when 3D Secure (3DS) authentication is required.

## Features

- **Token Management**: Automatically retrieves valid access token from database
- **Payment Verification**: Verifies pending payments from instant-charge reservations
- **3DS Support**: Handles 3D Secure challenge verification
- **Payment Status**: Returns complete payment and reservation status
- **CORS Support**: Full CORS compatibility with all browsers
- **Error Handling**: Comprehensive error handling and validation

## Prerequisites

1. **Token Generator**: The `booking-engine-token-generator` function must be running and maintaining valid tokens
2. **Instant Charge**: You must first create an instant charge reservation using the `instant-charge` function
3. **Payment ID**: You need the payment ID from the PENDING_AUTH payment created during instant-charge
4. **3DS Result** (if applicable): For 3DS challenges, you need the result from the SDK's handle3DSChallenge function
5. **Database Table**: The `guesty_booking_engine_tokens` table must exist with valid tokens

## When to Use This Function

This function is required when:

1. An `instant-charge` call returns a payment with `PENDING_AUTH` status
2. The payment processor requires 3D Secure authentication
3. You need to verify and complete the payment after the customer has completed 3DS authentication
4. You want to confirm the final payment status of a reservation

## API Endpoint

```
POST https://your-project.supabase.co/functions/v1/verify-instant-charge
```

## Request Format

### Required Fields

- `reservationId` (string): ID of the reservation created by instant-charge
- `paymentId` (string): The payment ID from the PENDING_AUTH payment created in the instant-charge endpoint

### Optional Fields

- `threeDSResult` (object): The threeDSResult object returned from the SDK handle3DSChallenge function
  - Required for 3DS challenge verification
  - Not necessary if using GuestyPay in EU/UK regions

### threeDSResult Object Structure

When 3DS authentication is required, include the result from your payment SDK:

```javascript
{
  "threeDSResult": {
    // Fields returned from SDK's handle3DSChallenge function
    // Structure varies by payment processor
  }
}
```

## Example Requests

### Example 1: Verify Payment Without 3DS

```bash
curl --location --request POST 'https://your-project.supabase.co/functions/v1/verify-instant-charge' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "reservationId": "691713f752501cc323d367ce",
    "paymentId": "691713f752501cc323d36800"
  }'
```

### Example 2: Verify Payment With 3DS Challenge Result

```bash
curl --location --request POST 'https://your-project.supabase.co/functions/v1/verify-instant-charge' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "reservationId": "691713f752501cc323d367ce",
    "paymentId": "691713f752501cc323d36800",
    "threeDSResult": {
      "transactionId": "3ds-trans-123",
      "authenticationValue": "auth-value-xyz",
      "eci": "05",
      "version": "2.1.0"
    }
  }'
```

### Example 3: Verify GuestyPay Payment (EU/UK)

```bash
curl --location --request POST 'https://your-project.supabase.co/functions/v1/verify-instant-charge' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "reservationId": "691713f752501cc323d367ce",
    "paymentId": "691713f752501cc323d36800"
  }'
```

## Response Format

### Success Response

```json
{
  "status": "success",
  "message": "Payment verified successfully",
  "data": {
    "reservation": {
      "id": "691713f752501cc323d367ce",
      "status": "confirmed",
      "confirmationCode": "ABC123XYZ",
      "platform": "direct",
      "confirmedAt": "2026-02-15T10:30:00.000Z",
      "createdAt": "2026-02-15T10:25:00.000Z",
      "checkInDateLocalized": "2026-03-15",
      "checkOutDateLocalized": "2026-03-20",
      "guestsCount": 2,
      "unitId": "5e8f9a1b2c3d4e5f6g7h8i9j",
      "guestId": "691713f752501cc323d367cf"
    },
    "payment": {
      "id": "691713f752501cc323d36800",
      "status": "paid",
      "amount": 850.00,
      "currency": "USD",
      "paidAt": "2026-02-15T10:30:00.000Z",
      "confirmationCode": "PAY-CONF-456",
      "paymentMethodId": "pm_1234567890",
      "error": null
    },
    "fullResponse": {
      // Complete response from Guesty API including all fields
    }
  }
}
```

### Payment Status Values

- `paid`: Payment completed successfully
- `failed`: Payment verification failed
- `pending`: Payment still pending (may require additional action)
- `canceled`: Payment was canceled

### Error Response Examples

#### Missing Required Field

```json
{
  "status": "error",
  "message": "Missing required field: reservationId"
}
```

#### Payment Verification Failed

```json
{
  "status": "error",
  "message": "Failed to verify payment",
  "details": {
    "error": "3DS authentication failed",
    "code": "3DS_AUTH_FAILED"
  }
}
```

#### Expired Token

```json
{
  "status": "error",
  "message": "Booking engine token has expired. Please refresh the token."
}
```

## Complete Workflow

### Standard Instant Charge with 3DS Flow

1. **Create Quote**: Use `booking-engine-create-reservation-quote` to get a quote
   ```json
   Response: { "_id": "quote123", "ratePlanId": "rp456", ... }
   ```

2. **Create Instant Charge**: Use `instant-charge` with payment details
   ```json
   Request: {
     "quoteId": "quote123",
     "ratePlanId": "rp456",
     "confirmationToken": "seti_token",
     "guest": { ... }
   }
   Response: {
     "reservationId": "res789",
     "payment": {
       "_id": "pay101",
       "status": "PENDING_AUTH",
       "threeDSChallenge": { ... }
     }
   }
   ```

3. **Handle 3DS Challenge**: Use payment SDK to handle 3DS authentication
   ```javascript
   const threeDSResult = await sdk.handle3DSChallenge(threeDSChallenge);
   ```

4. **Verify Payment**: Use this function to verify and complete payment
   ```json
   Request: {
     "reservationId": "res789",
     "paymentId": "pay101",
     "threeDSResult": { ... }
   }
   Response: {
     "payment": { "status": "paid" },
     "reservation": { "status": "confirmed" }
   }
   ```

### GuestyPay EU/UK Flow (No 3DS Result Needed)

1. Create quote → Create instant charge with `initialPaymentMethodId`
2. Get `PENDING_AUTH` payment status
3. Call verify-instant-charge (no `threeDSResult` needed)
4. Payment automatically verified

## Field Validation

### Required Validations

1. **reservationId**: Must be a valid reservation ID from instant-charge
2. **paymentId**: Must be a valid payment ID from the PENDING_AUTH payment

### Optional Field Validations

1. **threeDSResult**: If provided, must be a valid object from payment SDK
   - Required for Stripe and some other processors when 3DS is enforced
   - Not required for GuestyPay in EU/UK

## 3D Secure (3DS) Authentication

### What is 3DS?

3D Secure is an additional layer of security for online credit card transactions. It may require the cardholder to complete an additional verification step with their card issuer.

### When is 3DS Required?

- Strong Customer Authentication (SCA) in the European Economic Area
- High-value transactions
- Card issuer settings require it
- Risk-based authentication triggers

### 3DS Flow

1. **Instant Charge Returns PENDING_AUTH**: Payment requires 3DS authentication
2. **Challenge Presented**: Customer completes authentication (e.g., SMS code, app approval)
3. **SDK Returns Result**: Payment SDK provides `threeDSResult` object
4. **Verify Payment**: Pass `threeDSResult` to this function for verification

### Payment Processors

| Processor | Requires threeDSResult? | Notes |
|-----------|------------------------|-------|
| Stripe | Yes | When 3DS is required |
| GuestyPay (EU/UK) | No | Handled automatically |
| GuestyPay (Other) | May vary | Check with Guesty support |
| PayPal | Depends | Varies by configuration |

## Response Data

### Reservation Object

Contains complete reservation details including:
- Reservation ID and status
- Confirmation code
- Check-in and check-out dates
- Guest count and unit information
- Creation and confirmation timestamps

### Payment Object

Contains complete payment details including:
- Payment ID and status
- Amount and currency
- Payment date
- Processor confirmation code
- Payment method ID
- Any error messages

## Error Handling

The function provides detailed error messages for:

- Missing required fields (reservationId, paymentId)
- Invalid reservation or payment IDs
- 3DS authentication failures
- Payment processing errors
- Token expiration or absence
- Guesty API errors

All errors include a `status: "error"` field and descriptive `message`.

## Common Use Cases

### Use Case 1: Standard 3DS Verification

After instant-charge returns PENDING_AUTH with a 3DS challenge:

```javascript
// 1. Customer completes 3DS challenge
const threeDSResult = await paymentSDK.handle3DSChallenge(challenge);

// 2. Verify payment
const response = await fetch('/verify-instant-charge', {
  method: 'POST',
  body: JSON.stringify({
    reservationId: reservation._id,
    paymentId: payment._id,
    threeDSResult: threeDSResult
  })
});
```

### Use Case 2: GuestyPay Auto-Verification

For GuestyPay in EU/UK regions:

```javascript
// Simply verify without 3DS result
const response = await fetch('/verify-instant-charge', {
  method: 'POST',
  body: JSON.stringify({
    reservationId: reservation._id,
    paymentId: payment._id
  })
});
```

### Use Case 3: Checking Payment Status

Verify the current status of a payment:

```javascript
const response = await fetch('/verify-instant-charge', {
  method: 'POST',
  body: JSON.stringify({
    reservationId: reservation._id,
    paymentId: payment._id
  })
});

if (response.data.payment.status === 'paid') {
  // Payment successful
} else if (response.data.payment.status === 'failed') {
  // Payment failed - handle error
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

## Troubleshooting

### Payment Shows PENDING_AUTH After Verification

**Possible Causes:**
- 3DS authentication not completed correctly
- Wrong threeDSResult object passed
- Payment processor rejected the verification

**Solution:**
- Check that customer completed 3DS challenge
- Verify threeDSResult structure matches processor requirements
- Check payment.error field for specific error message

### Payment Failed After Verification

**Possible Causes:**
- Insufficient funds
- Card declined by issuer
- 3DS authentication failed
- Expired payment session

**Solution:**
- Check payment.error field for details
- Request customer to retry with different payment method
- Create new instant-charge for fresh payment attempt

### Missing threeDSResult

**Possible Causes:**
- Using GuestyPay in EU/UK (not required)
- 3DS not enforced for this transaction
- Using a payment method that doesn't require 3DS

**Solution:**
- Try verification without threeDSResult first
- Only include threeDSResult if payment processor explicitly requires it

## Security Notes

1. **Never** expose Supabase service role keys in client code
2. **Always** use the `Authorization` header with proper Supabase keys
3. Payment verification should happen server-side
4. Store sensitive payment data securely
5. Log payment verification attempts for audit purposes
6. Handle 3DS results securely - don't log sensitive authentication data

## Testing

### Test in Sandbox Environment

1. Create test instant-charge in Guesty sandbox
2. Get test payment ID with PENDING_AUTH status
3. Use test 3DS challenges provided by payment processor
4. Verify payment with test threeDSResult
5. Confirm payment status changes to paid

### Test Cards for 3DS

Most payment processors provide test cards that trigger 3DS:

- **Stripe**: Use test cards that require authentication
- **GuestyPay**: Contact Guesty for test credentials

## Related Functions

- **instant-charge**: Creates instant charge reservations (prerequisite)
- **booking-engine-create-reservation-quote**: Creates quotes for reservations
- **booking-engine-token-generator**: Generates and maintains booking engine tokens
- **card-tokenize**: Tokenizes payment methods
- **update-reservation-status**: Update reservation status if needed

## API Reference

**Guesty Documentation**: [Verify Charge for Reservation from Quote](https://booking-api-docs.guesty.com/reference/verifychargeforreservationfromquote)

**Endpoint Used**: 
```
POST https://booking.guesty.com/api/reservations/{reservationId}/verify-payment
```

## Support

For issues or questions:

- Check Guesty API documentation for 3DS handling
- Verify payment status in Guesty dashboard
- Check function logs for detailed error messages
- Ensure booking engine tokens are valid
- Contact your payment processor for 3DS-specific issues

## Payment Status Monitoring

After verification, monitor the payment status:

```javascript
const { data } = await verifyPayment(...);

switch (data.payment.status) {
  case 'paid':
    // Success - reservation confirmed
    showConfirmation(data.reservation.confirmationCode);
    break;
  
  case 'failed':
    // Failed - show error
    showError(data.payment.error);
    break;
  
  case 'pending':
    // Still pending - may need additional action
    checkAgainLater();
    break;
  
  case 'canceled':
    // Canceled - handle accordingly
    handleCancellation();
    break;
}
```
