# Booking Engine Instant Reservation

This edge function creates an instant (confirmed) reservation using the Guesty Booking Engine API. It takes a quote ID generated from the `booking-engine-create-reservation-quote` function and converts it into a confirmed reservation with payment.

## Features

- **Token Management**: Automatically retrieves valid access token from database
- **Instant Reservation**: Creates confirmed reservations immediately
- **Payment Integration**: Handles payment tokens (ccToken) for reservation payment
- **Guest Information**: Processes guest details and policies
- **CORS Support**: Full CORS compatibility with all browsers
- **Error Handling**: Comprehensive error handling and validation

## Prerequisites

1. **Token Generator**: The `booking-engine-token-generator` function must be running and maintaining valid tokens
2. **Quote Creation**: You must first create a quote using `booking-engine-create-reservation-quote` to get a `quoteId`
3. **Payment Token**: You need to tokenize the payment method using Guesty's tokenization guide
4. **Database Table**: The `guesty_booking_engine_tokens` table must exist with valid tokens

## API Endpoint

```
POST https://your-project.supabase.co/functions/v1/booking-engine-instant-reservation
```

## Request Format

### Required Fields

- `quoteId` (string): ID of the quote to convert to a reservation (from create-reservation-quote)
- `ratePlanId` (string): Rate plan ID from the quote payload (must be one of the rate plan IDs returned in the quote)
- `ccToken` (string): Payment token ID (see [Guesty Tokenization Guide](https://booking-api-docs.guesty.com/docs/tokenizing-payment-methods))
- `guest` (object): Guest information object

### Optional Fields

- `policy` (object): Policy acceptance or terms

### Guest Object Structure

The `guest` object should contain guest information. Common fields include:
- `firstName` (string): Guest's first name
- `lastName` (string): Guest's last name
- `email` (string): Guest's email address
- `phone` (string): Guest's phone number
- Additional fields as required by Guesty API

### Policy Object Structure

The `policy` object (optional) can contain:
- Policy acceptance flags
- Terms and conditions acceptance
- Other policy-related fields

### Example Request

```bash
curl --location --request POST 'https://your-project.supabase.co/functions/v1/booking-engine-instant-reservation' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "quoteId": "691713f752501cc323d367ce",
    "ratePlanId": "67aa3c85546cbf6957c45820",
    "ccToken": "tok_1234567890abcdef",
    "guest": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phone": "+1234567890"
    },
    "policy": {
      "agreedToTerms": true,
      "agreedToCancellationPolicy": true
    }
  }'
```

## Response Format

### Success Response

```json
{
  "status": "success",
  "message": "Instant reservation created successfully",
  "data": {
    "reservationId": "691713f752501cc323d367ce",
    "status": "confirmed",
    "platform": "direct",
    "confirmationCode": "ABC123XYZ",
    "createdAt": "2025-11-14T11:35:19.711Z",
    "guestId": "691713f752501cc323d367cf",
    "fullResponse": {
      // Complete response from Guesty API
    }
  }
}
```

### Error Responses

#### Missing Quote ID (400)
```json
{
  "status": "error",
  "message": "Missing required field: quoteId"
}
```

#### Missing Rate Plan ID (400)
```json
{
  "status": "error",
  "message": "Missing required field: ratePlanId"
}
```

#### Missing Payment Token (400)
```json
{
  "status": "error",
  "message": "Missing required field: ccToken (payment token)"
}
```

#### Missing Guest Information (400)
```json
{
  "status": "error",
  "message": "Missing required field: guest object"
}
```

#### Token Not Found (500)
```json
{
  "status": "error",
  "message": "No booking engine token found. Please generate a token first."
}
```

#### Expired Token (500)
```json
{
  "status": "error",
  "message": "Booking engine token has expired. Please refresh the token."
}
```

#### Guesty API Error
```json
{
  "status": "error",
  "message": "Failed to create instant reservation",
  "details": {
    // Guesty API error details
  }
}
```

## Complete Workflow

### Step 1: Create a Quote
First, create a reservation quote to get pricing and availability:

```javascript
const quoteResponse = await fetch(
  'https://your-project.supabase.co/functions/v1/booking-engine-create-reservation-quote',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      guestsCount: 2,
      checkInDateLocalized: "2026-12-01",
      checkOutDateLocalized: "2026-12-07",
      listingId: "679b0ea4cb8d6900130ed2c5"
    })
  }
);

const quote = await quoteResponse.json();
const quoteId = quote.data._id;
const ratePlanId = quote.data.rates.ratePlans[0].ratePlan._id;
```

### Step 2: Tokenize Payment Method
Follow [Guesty's tokenization guide](https://booking-api-docs.guesty.com/docs/tokenizing-payment-methods) to get a payment token:

```javascript
// This would be done using Guesty's payment tokenization service
const ccToken = "tok_1234567890abcdef"; // Example token
```

### Step 3: Create Instant Reservation
Use this function to create the confirmed reservation:

```javascript
const reservationResponse = await fetch(
  'https://your-project.supabase.co/functions/v1/booking-engine-instant-reservation',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      quoteId: quoteId,
      ratePlanId: ratePlanId,
      ccToken: ccToken,
      guest: {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        phone: "+1234567890"
      },
      policy: {
        agreedToTerms: true
      }
    })
  }
);

const reservation = await reservationResponse.json();
console.log('Confirmation Code:', reservation.data.confirmationCode);
```

## How It Works

1. **Request Validation**: Validates all required fields (quoteId, ratePlanId, ccToken, guest)
2. **Token Retrieval**: Fetches the latest valid token from `guesty_booking_engine_tokens` table
3. **Token Validation**: Checks if the token has expired
4. **API Request**: Sends the instant reservation request to Guesty Booking Engine API
5. **Response Handling**: Returns the reservation details including confirmation code

## Important Notes

### Quote Expiration
- Quotes expire after 24 hours (check the `expiresAt` field in the quote)
- You must use the quote before it expires
- If expired, create a new quote

### Rate Plan ID
- Must use one of the rate plan IDs returned in the original quote
- Using any other rate plan ID will result in an error
- The rate plan ID is found at: `quote.rates.ratePlans[0].ratePlan._id`

### Payment Token (ccToken)
- Must be obtained through Guesty's payment tokenization service
- The token represents the payment method
- Follow Guesty's security guidelines for handling payment information

### Reservation Status
- Successful reservations return `status: "confirmed"`
- The `platform` will be `"direct"`
- A unique `confirmationCode` is provided for the guest

## Integration Example

```javascript
async function createBooking(bookingData) {
  try {
    // Step 1: Create Quote
    const quoteResponse = await fetch(QUOTE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        guestsCount: bookingData.guests,
        checkInDateLocalized: bookingData.checkIn,
        checkOutDateLocalized: bookingData.checkOut,
        listingId: bookingData.propertyId
      })
    });

    const quote = await quoteResponse.json();
    
    if (quote.status !== 'success') {
      throw new Error('Failed to create quote');
    }

    // Step 2: Get payment token (implement based on your payment processor)
    const paymentToken = await tokenizePaymentMethod(bookingData.paymentInfo);

    // Step 3: Create Instant Reservation
    const reservationResponse = await fetch(INSTANT_RESERVATION_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        quoteId: quote.data._id,
        ratePlanId: quote.data.rates.ratePlans[0].ratePlan._id,
        ccToken: paymentToken,
        guest: bookingData.guest,
        policy: bookingData.policy
      })
    });

    const reservation = await reservationResponse.json();
    
    if (reservation.status === 'success') {
      return {
        success: true,
        confirmationCode: reservation.data.confirmationCode,
        reservationId: reservation.data.reservationId
      };
    } else {
      throw new Error(reservation.message);
    }

  } catch (error) {
    console.error('Booking failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
```

## Testing

### Test with cURL

```bash
# Create instant reservation
curl -X POST 'https://your-project.supabase.co/functions/v1/booking-engine-instant-reservation' \
  -H 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "quoteId": "691713f752501cc323d367ce",
    "ratePlanId": "67aa3c85546cbf6957c45820",
    "ccToken": "tok_test_1234567890",
    "guest": {
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane.smith@example.com",
      "phone": "+1987654321"
    },
    "policy": {
      "agreedToTerms": true,
      "agreedToCancellationPolicy": true
    }
  }'
```

## Troubleshooting

### "No booking engine token found"
- Run the `booking-engine-token-generator` function to create a token
- Verify the `guesty_booking_engine_tokens` table exists and has data

### "Booking engine token has expired"
- Manually trigger the `booking-engine-token-generator` function
- Check that your cron job is running properly

### "Failed to create instant reservation"
- Verify the quote ID is valid and not expired
- Ensure the rate plan ID matches one from the quote
- Check that the payment token (ccToken) is valid
- Verify guest information is complete and formatted correctly

### Invalid Rate Plan ID
- Make sure you're using a rate plan ID from the original quote response
- The rate plan ID must be one of the IDs in `rates.ratePlans[].ratePlan._id`

### Payment Issues
- Ensure the ccToken is valid and not expired
- Verify the payment method has sufficient funds
- Check that the tokenization was successful

## Security

- Requires Supabase authentication (anon key or service role key)
- Token is securely retrieved from the database
- CORS configured to allow all origins (modify if needed for production)
- Payment tokens should be handled securely following PCI compliance
- Never store raw credit card information

## Related Functions

- `booking-engine-token-generator`: Generates and maintains API tokens
- `booking-engine-create-reservation-quote`: Creates quotes (required before using this function)
