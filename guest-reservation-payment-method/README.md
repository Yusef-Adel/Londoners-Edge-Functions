# Guest Reservation Payment Method

This edge function retrieves payment methods associated with a specific guest and reservation from the Guesty API.

## Features

- **Token Management**: Automatically retrieves valid access token from database
- **Payment Method Retrieval**: Fetches payment methods for a guest's reservation
- **Data Extraction**: Returns key payment information in a structured format
- **CORS Support**: Full CORS compatibility with all browsers
- **Error Handling**: Comprehensive error handling and validation

## Prerequisites

1. **Token Generator**: The `token-generator` function must be running and maintaining valid Guesty tokens
2. **Database Table**: The `guesty_tokens` table must exist with valid tokens
3. **Guest & Reservation IDs**: You need valid Guesty guest ID and reservation ID

## API Endpoint

```
POST https://your-project.supabase.co/functions/v1/guest-reservation-payment-method
```

## Request Format

### Required Fields

- `guestId` (string): The Guesty guest ID
- `reservationId` (string): The Guesty reservation ID

### Example Request

```bash
curl --location --request POST 'https://your-project.supabase.co/functions/v1/guest-reservation-payment-method' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "guestId": "692366fc1d40cdd6bfd6bb08",
    "reservationId": "692366fc7049b7482b97f672"
  }'
```

## Response Format

### Success Response (200 OK)

```json
{
  "status": "success",
  "message": "Retrieved 1 payment method(s)",
  "data": {
    "paymentMethods": [
      {
        "paymentMethodId": "692366fae56cc7bb03a029bd",
        "accountId": "679a424e85f74b5fe968cec2",
        "paymentProviderId": "67d998fcf13760001195e7db",
        "status": "ACTIVE",
        "guestId": "692366fc1d40cdd6bfd6bb08",
        "confirmationCode": "GY-PNsfS8tY",
        "method": "AMARYLLIS",
        "last4": "6075",
        "brand": "Visa",
        "type": "PHYSICAL",
        "createdAt": "2025-11-23T19:56:45.258Z",
        "updatedAt": "2025-11-23T19:56:42.563Z",
        "saveForFutureUse": true,
        "reuse": false
      }
    ],
    "count": 1,
    "fullDetails": [
      {
        "_id": "692366fae56cc7bb03a029bd",
        "accountId": "679a424e85f74b5fe968cec2",
        "paymentProviderId": "67d998fcf13760001195e7db",
        "method": "AMARYLLIS",
        "payload": {
          "PaymentToken": "fab8e688-46e3-468d-9618-c0e5c8fd58ff",
          "TransactionId": "3114003370206966468",
          "ResponseCode": 0,
          "ResponseDescription": "OK",
          "billing_details": {
            "name": "TAREK AMER",
            "address": {
              "line1": "DAMAM",
              "city": "DAMAM",
              "postal_code": "02",
              "country": "SA",
              "state": "NA"
            },
            "email": "admin0@gmail.com"
          },
          "card": {
            "bin": "405433",
            "last4": "6075",
            "exp_month": 12,
            "exp_year": 2029,
            "brand": "Visa"
          }
        },
        "saveForFutureUse": true,
        "reuse": false,
        "createdAt": "2025-11-23T19:56:45.258Z",
        "last4": "6075",
        "brand": "Visa",
        "status": "ACTIVE",
        "type": "PHYSICAL",
        "updatedAt": "2025-11-23T19:56:42.563Z",
        "confirmationCode": "GY-PNsfS8tY",
        "guestId": "692366fc1d40cdd6bfd6bb08"
      }
    ]
  }
}
```

### Success Response - No Payment Methods (200 OK)

```json
{
  "status": "success",
  "message": "No payment methods found for this guest and reservation",
  "data": {
    "paymentMethods": [],
    "count": 0
  }
}
```

### Error Responses

#### Missing Guest ID (400)
```json
{
  "status": "error",
  "message": "Missing required field: guestId"
}
```

#### Missing Reservation ID (400)
```json
{
  "status": "error",
  "message": "Missing required field: reservationId"
}
```

#### Token Not Found (500)
```json
{
  "status": "error",
  "message": "No Guesty token found. Please generate a token first."
}
```

#### Guesty API Error
```json
{
  "status": "error",
  "message": "Failed to fetch payment methods",
  "details": {
    // Guesty API error details
  }
}
```

## Response Data Structure

### Payment Method Object

| Field              | Type    | Description                                    |
|--------------------|---------|------------------------------------------------|
| paymentMethodId    | string  | Unique payment method ID (_id from Guesty)    |
| accountId          | string  | Guesty account ID                             |
| paymentProviderId  | string  | Payment provider ID                           |
| status             | string  | Payment method status (e.g., "ACTIVE")        |
| guestId            | string  | Guest ID                                      |
| confirmationCode   | string  | Confirmation code                             |
| method             | string  | Payment method type (e.g., "AMARYLLIS")       |
| last4              | string  | Last 4 digits of card                         |
| brand              | string  | Card brand (e.g., "Visa", "Mastercard")       |
| type               | string  | Type of payment method (e.g., "PHYSICAL")     |
| createdAt          | string  | Creation timestamp                            |
| updatedAt          | string  | Last update timestamp                         |
| saveForFutureUse   | boolean | Whether to save for future use                |
| reuse              | boolean | Whether the payment method can be reused      |

## How It Works

1. **Request Validation**: Validates required fields (guestId, reservationId)
2. **Token Retrieval**: Fetches the latest valid token from `guesty_tokens` table
3. **API Request**: Sends GET request to Guesty API with `reuse=false` parameter
4. **Data Processing**: Extracts key payment information from the response
5. **Response**: Returns structured payment method data

## Query Parameters

The function automatically sets the following query parameters:
- `reservationId`: Passed from request body
- `reuse`: Always set to `false` (as per requirement)

## Important Notes

### Reuse Parameter
- The `reuse` parameter is **always set to `false`** in the API request
- This ensures payment methods are not reused across different transactions

### Payment Method Status
Common status values:
- `ACTIVE` - Payment method is active and can be used
- `INACTIVE` - Payment method is inactive
- `EXPIRED` - Payment method has expired

### Full Details
The response includes both:
- **Extracted data** (`paymentMethods` array) - Clean, structured information
- **Full details** (`fullDetails` array) - Complete Guesty API response including payload, billing details, card info, etc.

## Integration Example

```javascript
async function getGuestPaymentMethods(guestId, reservationId) {
  try {
    const response = await fetch(
      'https://your-project.supabase.co/functions/v1/guest-reservation-payment-method',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          guestId: guestId,
          reservationId: reservationId
        })
      }
    );

    const result = await response.json();
    
    if (result.status === 'success') {
      console.log('Payment methods:', result.data.paymentMethods);
      
      // Access specific fields
      result.data.paymentMethods.forEach(pm => {
        console.log('Payment Method ID:', pm.paymentMethodId);
        console.log('Account ID:', pm.accountId);
        console.log('Provider ID:', pm.paymentProviderId);
        console.log('Status:', pm.status);
        console.log('Confirmation Code:', pm.confirmationCode);
        console.log('Card:', pm.brand, '****' + pm.last4);
      });
      
      return result.data.paymentMethods;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Failed to fetch payment methods:', error);
    throw error;
  }
}

// Usage
const paymentMethods = await getGuestPaymentMethods(
  '692366fc1d40cdd6bfd6bb08',
  '692366fc7049b7482b97f672'
);
```

## Use Cases

### 1. Display Payment Methods to Guest
```javascript
const methods = await getGuestPaymentMethods(guestId, reservationId);
methods.forEach(method => {
  displayPaymentCard({
    brand: method.brand,
    last4: method.last4,
    status: method.status
  });
});
```

### 2. Verify Active Payment Method
```javascript
const methods = await getGuestPaymentMethods(guestId, reservationId);
const activeMethod = methods.find(m => m.status === 'ACTIVE');
if (!activeMethod) {
  throw new Error('No active payment method found');
}
```

### 3. Get Payment Provider Info
```javascript
const methods = await getGuestPaymentMethods(guestId, reservationId);
const paymentProviderId = methods[0]?.paymentProviderId;
const accountId = methods[0]?.accountId;
```

## Testing

### Test with cURL

```bash
# Get payment methods
curl -X POST 'https://your-project.supabase.co/functions/v1/guest-reservation-payment-method' \
  -H 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "guestId": "692366fc1d40cdd6bfd6bb08",
    "reservationId": "692366fc7049b7482b97f672"
  }'
```

## Troubleshooting

### "No Guesty token found"
- Run the `token-generator` function to create a token
- Verify the `guesty_tokens` table exists and has data

### "Failed to fetch payment methods"
- Verify the guest ID is valid
- Verify the reservation ID is valid and belongs to the guest
- Check that the reservation has associated payment methods

### Empty Payment Methods Array
- The guest may not have any payment methods for this reservation
- Payment methods may have been deleted or expired
- Verify the guest and reservation IDs are correct

## Security

- Requires Supabase authentication (anon key or service role key)
- Token is securely retrieved from the database
- CORS configured to allow all origins (modify if needed for production)
- Payment details are returned but sensitive card information is masked (last4 only)

## Related Functions

- `token-generator`: Generates and maintains Guesty API tokens
- `booking-engine-token-generator`: Manages booking engine tokens
- `booking-engine-instant-reservation`: Creates reservations with payment

## API Reference

**Guesty API Endpoint**: `GET https://open-api.guesty.com/v1/guests/{guestId}/payment-methods`

**Query Parameters**:
- `reservationId`: The reservation ID to filter payment methods
- `reuse`: Set to `false` to prevent reuse

**Documentation**: [Guesty Open API Documentation](https://open-api-docs.guesty.com/)
