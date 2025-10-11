# Create Payment Method Edge Function

## Overview
This edge function creates payment methods for guests in Guesty, supporting both **Stripe** and **GuestyPay** payment processors. The function automatically detects the payment processor type based on the listing's payment provider and handles the payment method creation accordingly.

## Features
- ✅ **Dual Payment Processor Support**: Handles both Stripe and GuestyPay
- ✅ **Automatic Detection**: Identifies payment processor type from listing data
- ✅ **Auto-fetch Payment Provider**: Can retrieve payment provider ID from listing ID
- ✅ **CORS Enabled**: Full cross-origin support
- ✅ **Comprehensive Error Handling**: Clear error messages for debugging

## API Endpoint
```
POST /functions/v1/create-payment-method
```

## Request Headers
```
Authorization: Bearer <your_supabase_jwt>
Content-Type: application/json
```

## Request Body Parameters

### Required Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `guestId` | string | Guest ID from Guesty |

### Payment Token (One Required)
| Parameter | Type | Description |
|-----------|------|-------------|
| `stripeCardToken` | string | Stripe payment method token (for Stripe processors) |
| `guestyPayToken` | string | GuestyPay token (for GuestyPay processors) |

### Payment Provider (One Required)
| Parameter | Type | Description |
|-----------|------|-------------|
| `paymentProviderId` | string | Direct payment provider ID |
| `listingId` | string[] | Array with listing ID to auto-fetch provider |

### Optional Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `skipSetupIntent` | boolean | false | TRUE if card was collected with setup_intent |
| `reservationId` | string | - | Associated reservation ID |
| `reuse` | boolean | false | Allow reuse in other guest reservations |

## Usage Examples

### Example 1: Stripe Payment Method (with listing ID)
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/create-payment-method' \
  --header 'Authorization: Bearer YOUR_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{
    "guestId": "6543210abcdef",
    "stripeCardToken": "pm_1234567890abcdef",
    "listingId": ["listing_abc123"],
    "skipSetupIntent": true,
    "reuse": false
  }'
```

### Example 2: GuestyPay Payment Method (with provider ID)
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/create-payment-method' \
  --header 'Authorization: Bearer YOUR_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{
    "guestId": "6543210abcdef",
    "guestyPayToken": "gpy_token_xyz789",
    "paymentProviderId": "680e6bf2d92c3400119938b8",
    "reservationId": "res_123456",
    "reuse": true
  }'
```

### Example 3: Auto-detect Payment Processor
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/create-payment-method' \
  --header 'Authorization: Bearer YOUR_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{
    "guestId": "6543210abcdef",
    "stripeCardToken": "pm_1234567890abcdef",
    "listingId": ["listing_abc123"]
  }'
```
*The function will automatically fetch the payment provider and determine if it's Stripe or GuestyPay*

## Response Format

### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "payment_method_id",
    "type": "card",
    "brand": "visa",
    "last4": "4242",
    "expiryMonth": 12,
    "expiryYear": 2025
  },
  "paymentProcessor": "Stripe",
  "paymentProviderId": "680e6bf2d92c3400119938b7"
}
```

### Error Responses

#### Missing Required Field (400)
```json
{
  "error": "guestId is required"
}
```

#### Missing Payment Token (400)
```json
{
  "error": "For GuestyPay listings, either guestyPayToken or stripeCardToken is required",
  "paymentProvider": "GuestyPay"
}
```

#### Payment Provider Not Found (400)
```json
{
  "error": "No payment provider found for the specified listing",
  "details": { ... }
}
```

#### Guesty API Error (varies)
```json
{
  "error": "Failed to create payment method",
  "details": {
    "message": "Invalid token",
    "code": "INVALID_TOKEN"
  }
}
```

## Payment Processor Detection

The function automatically detects GuestyPay processors by checking:
1. `accountName` contains "guestypay" or "guesty pay"
2. `type` field equals "guestyPay"
3. `connectedBy` field equals "guestyPay"

### Stripe Processors
- Uses `stripeCardToken` field
- Requires Stripe payment method token
- Standard Stripe flow

### GuestyPay Processors
- Uses `token` or `guestyPayToken` field
- Native GuestyPay integration
- No external Stripe dependency

## Error Codes

| Status | Description |
|--------|-------------|
| 200 | Payment method created successfully |
| 400 | Missing required parameters or invalid input |
| 405 | Method not allowed (only POST accepted) |
| 500 | Internal server error or Guesty API failure |

## Environment Variables Required

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
```

## Database Requirements

The function requires a `guesty_tokens` table with:
- `access_token` column (Guesty API token)
- `created_at` column for sorting

## Flow Diagram

```
┌─────────────────┐
│   Client Call   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ Validate guestId        │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Get Guesty Token        │
└────────┬────────────────┘
         │
         ├──── Has paymentProviderId? ───No──┐
         │                                    │
        Yes                                   ▼
         │                        ┌───────────────────────┐
         │                        │ Fetch from Guesty API │
         │                        │ using listingId       │
         │                        └──────────┬────────────┘
         │                                   │
         ▼                                   │
┌────────────────────────────────────────────┘
│ Check Payment Processor Type              │
│ (GuestyPay vs Stripe)                     │
└────────┬──────────────────────────────────┘
         │
    ┌────┴────┐
    │         │
GuestyPay   Stripe
    │         │
    ▼         ▼
┌────────┐ ┌──────────────┐
│ token  │ │stripeCardToken│
└───┬────┘ └──────┬────────┘
    │             │
    └──────┬──────┘
           │
           ▼
    ┌─────────────────┐
    │ Create Payment  │
    │ Method in Guesty│
    └─────────┬───────┘
              │
              ▼
       ┌─────────────┐
       │   Success   │
       └─────────────┘
```

## Notes

1. **Automatic Provider Detection**: When you provide a `listingId`, the function automatically fetches the payment provider details from Guesty
2. **Token Flexibility**: Use `stripeCardToken` for Stripe or `guestyPayToken` for GuestyPay
3. **Backward Compatible**: Existing Stripe integrations continue to work without changes
4. **Logging**: Comprehensive console logging for debugging payment processor detection

## Testing

### Test with Stripe
```javascript
const response = await fetch('YOUR_FUNCTION_URL', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    guestId: 'test_guest_123',
    stripeCardToken: 'pm_test_123',
    listingId: ['stripe_listing_id']
  })
});
```

### Test with GuestyPay
```javascript
const response = await fetch('YOUR_FUNCTION_URL', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    guestId: 'test_guest_123',
    guestyPayToken: 'gpy_test_token',
    listingId: ['guestypay_listing_id']
  })
});
```

## Troubleshooting

### Issue: "stripeCardToken is required"
**Solution**: Verify the payment processor type. For Stripe processors, you must provide `stripeCardToken`.

### Issue: "For GuestyPay listings, either guestyPayToken or stripeCardToken is required"
**Solution**: Provide the appropriate token for GuestyPay listings.

### Issue: "No payment provider found"
**Solution**: Ensure the listing has a configured payment provider in Guesty.

### Issue: Payment method creation fails
**Solution**: Check the error details in the response. Common issues:
- Invalid token format
- Expired payment method
- Guest doesn't exist
- Payment provider misconfigured

## Related Functions
- `Create-Payment` - Full payment processing with Stripe integration
- `get-payment-methods` - Retrieve existing payment methods
- `create-setup-intent` - Create Stripe setup intents

## Support
For issues or questions, check the console logs for detailed error information.
