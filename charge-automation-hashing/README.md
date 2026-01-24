# Charge Automation Hashing Function

## Overview

This Supabase Edge Function generates a secure SHA-256 hash required for integrating Charge Automation's payment iframe. The hash is generated server-side to protect sensitive API credentials and ensures secure payment processing.

## Purpose

When integrating Charge Automation's payment iframe, you need to provide a `data-hash` attribute that validates the payment request. This hash must be generated on the server-side using your Charge Automation API key to prevent exposure of sensitive credentials.

## How It Works

The function:
1. Receives payment parameters from the frontend
2. Retrieves sensitive credentials from Supabase secrets (API key and user account ID)
3. Generates a SHA-256 hash by concatenating: `userAccountId + orderId + amount + currency + chargebackProtection + apiKey`
4. Returns the hash and user account ID to configure the Charge Automation iframe

## Required Environment Variables

Set these secrets in your Supabase project:

```bash
supabase secrets set USER_ACCOUNT_ID_CHARGE_AUTOMATION=16001
supabase secrets set CHARGE_AUTOMATION_API_KEY=00f9d7a0-ebbf-11f0-a4b8-ffa61d9d1e80
```

## API Specification

### Endpoint
```
POST /functions/v1/charge-automation-hashing
```

### Request Headers
```
Content-Type: application/json
Authorization: Bearer <your-supabase-anon-key>
```

### Request Body
```json
{
  "orderId": "6969338497c852001531245",
  "amount": 28.00,
  "currency": "GBP",
  "chargebackProtection": "No"
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `orderId` | string | Yes | Guest reservation ID from Guesty |
| `amount` | number | Yes | Total amount to be charged (e.g., 28.00) |
| `currency` | string | Yes | Three-letter currency code (e.g., "GBP", "USD") |
| `chargebackProtection` | string | Yes | Whether chargeback protection is enabled ("Yes" or "No") |

### Success Response

**Status Code:** `200 OK`

```json
{
  "hash": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2",
  "userAccountId": "16001",
  "success": true
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `hash` | string | SHA-256 hash to use in the iframe `data-hash` attribute |
| `userAccountId` | string | Account ID to use in the iframe `data-userAccountId` attribute |
| `success` | boolean | Indicates successful hash generation |

### Error Response

**Status Code:** `400 Bad Request` (Missing parameters)

```json
{
  "error": "Missing required parameters",
  "required": ["orderId", "amount", "currency", "chargebackProtection"],
  "success": false
}
```

**Status Code:** `500 Internal Server Error` (Server error or missing env variables)

```json
{
  "error": "Missing required environment variables: USER_ACCOUNT_ID_CHARGE_AUTOMATION or CHARGE_AUTOMATION_API_KEY",
  "success": false
}
```

## Frontend Integration Example

### Step 1: Call the Edge Function

```javascript
async function getChargeAutomationHash(paymentData) {
  const response = await fetch(
    'https://your-project.supabase.co/functions/v1/charge-automation-hashing',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        orderId: paymentData.reservationId,
        amount: paymentData.totalAmount,
        currency: paymentData.currency,
        chargebackProtection: "No"
      })
    }
  );

  const result = await response.json();
  
  if (result.success) {
    return {
      hash: result.hash,
      userAccountId: result.userAccountId
    };
  } else {
    throw new Error(result.error);
  }
}
```

### Step 2: Load Charge Automation iframe

```javascript
async function loadPaymentIframe(paymentConfig, optionalConfig) {
  // Get hash from backend
  const { hash, userAccountId } = await getChargeAutomationHash({
    reservationId: paymentConfig.orderId,
    totalAmount: paymentConfig.amount,
    currency: paymentConfig.currency
  });

  // Create script element with all configuration
  const script = document.createElement('script');
  script.id = 'ca-iFrame';
  script.src = 'https://app.chargeautomation.com/assets/v2/js/checkout-iframe.js';
  
  // Mandatory attributes
  script.setAttribute('data-userAccountId', userAccountId);
  script.setAttribute('data-orderId', paymentConfig.orderId);
  script.setAttribute('data-amount', paymentConfig.amount.toFixed(2));
  script.setAttribute('data-currency', paymentConfig.currency);
  script.setAttribute('data-chargebackProtection', paymentConfig.chargebackProtection);
  script.setAttribute('data-hash', hash);
  
  // Optional attributes
  if (optionalConfig) {
    script.setAttribute('data-generateButton', optionalConfig.generateButton || 'Yes');
    script.setAttribute('data-externalId', optionalConfig.externalId || '');
    script.setAttribute('data-description', optionalConfig.description || '');
    script.setAttribute('data-payerEmail', optionalConfig.payerEmail || '');
    script.setAttribute('data-successMsg', optionalConfig.successMsg || 'Payment successful!');
  }
  
  // Append to document
  document.body.appendChild(script);
}

// Usage example
const paymentConfig = {
  orderId: "6969338497c852001531245",
  amount: 28.00,
  currency: "GBP",
  chargebackProtection: "No"
};

const optionalConfig = {
  generateButton: "No",
  externalId: "my-external-id",
  description: "Luxury apartment reservation",
  payerEmail: "guest@example.com",
  successMsg: "Thank you! Your payment was successful."
};

await loadPaymentIframe(paymentConfig, optionalConfig);
```

## Local Testing

### Prerequisites
1. Supabase CLI installed
2. Local Supabase instance running

### Steps

1. **Start Supabase locally:**
   ```bash
   supabase start
   ```

2. **Set environment variables for local testing:**
   Create a `.env` file or use `--env-file`:
   ```
   USER_ACCOUNT_ID_CHARGE_AUTOMATION=16001
   CHARGE_AUTOMATION_API_KEY=00f9d7a0-ebbf-11f0-a4b8-ffa61d9d1e80
   ```

3. **Test the function:**
   ```bash
   curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/charge-automation-hashing' \
     --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
     --header 'Content-Type: application/json' \
     --data '{"orderId":"6969338497c852001531245","amount":28.00,"currency":"GBP","chargebackProtection":"No"}'
   ```

4. **Expected response:**
   ```json
   {
     "hash": "generated-sha256-hash-here",
     "userAccountId": "16001",
     "success": true
   }
   ```

## Deployment

Deploy the function to your Supabase project:

```bash
supabase functions deploy charge-automation-hashing
```

Make sure to set the required secrets in your production environment before deployment.

## Payment Flow

1. **User initiates payment** on your frontend
2. **Frontend calls this Edge Function** with payment parameters
3. **Edge Function generates secure hash** using server-side secrets
4. **Frontend receives hash and userAccountId** in response
5. **Frontend loads Charge Automation iframe** with all required attributes including the hash
6. **User completes payment** through the iframe
7. **On successful payment:**
   - Reservation status automatically changes to "confirmed" in Guesty
8. **On failed payment:**
   - Calendar remains blocked until `reservedUntil` time expires
   - User can retry payment or create new reservation (based on your business logic)

## Security Notes

- ✅ API key is never exposed to the frontend
- ✅ Hash generation happens server-side only
- ✅ CORS is configured for cross-origin requests
- ✅ All secrets are stored in Supabase environment variables
- ✅ Request validation ensures all required parameters are present

## Troubleshooting

### "Missing required environment variables"
- Ensure secrets are set in Supabase: `supabase secrets list`
- Set missing secrets using: `supabase secrets set KEY=value`

### "Missing required parameters"
- Verify all required fields are included in the request body
- Check that `amount` is a valid number
- Ensure `currency` is a valid 3-letter code

### Hash validation fails in Charge Automation
- Verify the amount is formatted with 2 decimal places (e.g., "28.00")
- Ensure all parameters sent to this function match exactly what you're using in the iframe
- Check that the API key is correct

## Related Documentation

- [Charge Automation API Documentation](https://app.chargeautomation.com/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Guesty API Documentation](https://developers.guesty.com/)
