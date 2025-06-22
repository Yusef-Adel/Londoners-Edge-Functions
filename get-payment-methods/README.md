# Get Payment Methods Edge Function

## Overview

The `get-payment-methods` Supabase Edge Function retrieves payment methods for a specific guest from the Guesty API. This function serves as a proxy to fetch payment method information including card details, payment method types, and other relevant payment attributes associated with a guest.

## Endpoint

```
POST https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/get-payment-methods
```

## Authentication

This function requires proper authentication headers. Include your Supabase API key in the request headers.

## Request Format

### Headers

```
Content-Type: application/json
Authorization: Bearer <your-supabase-token>
```

### Request Body

```json
{
  "guestId": "string"
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guestId` | string | Yes | The unique identifier for the guest in the Guesty system |

## Response Format

### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "pm_1234567890",
      "type": "card",
      "brand": "visa",
      "last4": "4242",
      "expiryMonth": 12,
      "expiryYear": 2025,
      "isDefault": true,
      "fingerprint": "fingerprint_value",
      "billingDetails": {
        "name": "John Doe",
        "address": {
          "line1": "123 Main St",
          "city": "Anytown",
          "state": "CA",
          "postalCode": "12345",
          "country": "US"
        }
      }
    }
  ]
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Indicates if the request was successful |
| `data` | array | Array of payment method objects |
| `data[].id` | string | Unique identifier for the payment method |
| `data[].type` | string | Type of payment method (card, bank_account, etc.) |
| `data[].brand` | string | Card brand (visa, mastercard, amex, etc.) |
| `data[].last4` | string | Last 4 digits of the card number |
| `data[].expiryMonth` | number | Card expiry month |
| `data[].expiryYear` | number | Card expiry year |
| `data[].isDefault` | boolean | Whether this is the default payment method |
| `data[].fingerprint` | string | Unique fingerprint for the card |
| `data[].billingDetails` | object | Billing information associated with the payment method |

### Error Responses

#### Missing Required Parameters

**Status Code:** `400 Bad Request`

```json
{
  "error": "guestId is required"
}
```

#### Authentication Error

**Status Code:** `500 Internal Server Error`

```json
{
  "error": "Failed to retrieve Guesty access token"
}
```

#### Guest Not Found

**Status Code:** `404 Not Found`

```json
{
  "error": "Failed to fetch payment methods from Guesty",
  "details": "Guest not found",
  "status": 404
}
```

#### Guesty API Error

**Status Code:** `4xx/5xx` (matches Guesty response)

```json
{
  "error": "Failed to fetch payment methods from Guesty",
  "details": "Error details from Guesty API",
  "status": 400
}
```

#### General Server Error

**Status Code:** `500 Internal Server Error`

```json
{
  "error": "Internal server error",
  "details": "Error message details"
}
```

## Usage Examples

### Basic Request

```bash
curl -i --location --request POST 'https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/get-payment-methods' \
  --header 'Authorization: Bearer YOUR_SUPABASE_TOKEN' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "guestId": "guest_1234567890abcdef"
  }'
```

### JavaScript/TypeScript Example

```typescript
const getPaymentMethods = async (guestId: string) => {
  try {
    const response = await fetch('https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/get-payment-methods', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${YOUR_SUPABASE_TOKEN}`
      },
      body: JSON.stringify({
        guestId: guestId
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log('Payment methods:', result.data);
      return result.data;
    } else {
      console.error('Failed to fetch payment methods:', result.error);
      return null;
    }
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return null;
  }
};

// Usage
const paymentMethods = await getPaymentMethods('guest_1234567890abcdef');
```

### Next.js API Route Example

```typescript
// pages/api/payment-methods.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { guestId } = req.body;

  if (!guestId) {
    return res.status(400).json({ error: 'guestId is required' });
  }

  try {
    const response = await fetch('https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/get-payment-methods', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ guestId })
    });

    const result = await response.json();

    if (response.ok) {
      res.status(200).json(result);
    } else {
      res.status(response.status).json(result);
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}
```

## Function Behavior

1. **CORS Handling**: The function handles CORS preflight requests to allow cross-origin requests
2. **Input Validation**: Validates that the guestId parameter is provided
3. **Token Retrieval**: Fetches the Guesty access token from the database
4. **Guesty API Call**: Makes a GET request to the Guesty Payment Methods API
5. **Response Handling**: Returns the payment methods data or appropriate error messages
6. **Error Forwarding**: Forwards Guesty API error responses with their original status codes

## Error Handling

The function includes comprehensive error handling for:
- Missing required parameters
- Token retrieval failures
- Guesty API errors (guest not found, unauthorized, etc.)
- Network connectivity issues
- General server errors

## CORS Support

The function includes CORS headers to allow requests from any origin:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`

## API Integration

This function integrates with the Guesty API endpoint:
- **Endpoint**: `https://open-api.guesty.com/v1/guests/{id}/payment-methods`
- **Method**: `GET`
- **Authentication**: Bearer token from database

## Security Considerations

1. **Token Security**: The function securely retrieves Guesty tokens from the database
2. **Guest Privacy**: Payment method information is sensitive - ensure proper access controls
3. **PCI Compliance**: Be aware that payment card data may be included in responses
4. **Rate Limiting**: Consider implementing rate limiting for production use

## Local Development

To test this function locally:

1. Start Supabase locally:
   ```bash
   supabase start
   ```

2. Test with curl:
   ```bash
   curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-payment-methods' \
     --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
     --header 'Content-Type: application/json' \
     --data '{"guestId":"GUEST_ID_HERE"}'
   ```

## Dependencies

- `@supabase/functions-js`: For Supabase Edge Runtime types
- `@supabase/supabase-js`: For Supabase client functionality

## Environment Variables

The function requires the following environment variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key

## Database Requirements

The function expects a `guesty_tokens` table in your Supabase database with:
- `access_token` column containing valid Guesty API tokens
- Proper access permissions for the function to read tokens

## Notes

- The function uses Deno runtime with Supabase Edge Functions
- Response data structure depends on the Guesty API response format
- Payment method information may include sensitive financial data
- The function acts as a proxy to the Guesty API, forwarding error responses with their original status codes
- Consider implementing caching for frequently accessed payment methods to improve performance
