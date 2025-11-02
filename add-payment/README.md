# Add Payment Edge Function

A Supabase Edge Function for adding payments to Guesty reservations with automatic rating email notifications via SendGrid.

## Overview

This function processes payment additions to Guesty reservations and automatically sends a rating email to the guest upon successful payment. The email includes a personalized link to the rating page with listing-specific parameters.

## Features

- ✅ Adds payments to Guesty reservations via API
- ✅ Automatic rating email notification to guests
- ✅ Personalized rating URL with listing details
- ✅ SendGrid email integration
- ✅ CORS support
- ✅ Comprehensive error handling
- ✅ Email failure doesn't affect payment success

## API Specification

### Endpoint
```
POST /functions/v1/add-payment
```

### Request Headers
```
Content-Type: application/json
Authorization: Bearer <SUPABASE_ANON_KEY>
```

### Request Body
```json
{
  "reservationId": "string",
  "paymentParams": {
    "paymentMethod": {
      "method": "string",
      "id": "string (optional)",
      "saveForFutureUse": "boolean (optional)"
    },
    "amount": "number",
    "shouldBePaidAt": "string (optional)",
    "paidAt": "string (optional)",
    "note": "string (optional)",
    "isAuthorizationHold": "boolean (optional)"
  }
}
```

#### Required Fields
- `reservationId`: Guesty reservation ID
- `paymentParams.paymentMethod`: Payment method object
- `paymentParams.paymentMethod.method`: Payment method type
- `paymentParams.amount`: Payment amount (number)

#### Optional Fields
- `paymentParams.paymentMethod.id`: Payment method ID (for stored payment methods)
- `paymentParams.paymentMethod.saveForFutureUse`: Whether to save payment method
- `paymentParams.shouldBePaidAt`: When payment should be processed (ISO 8601)
- `paymentParams.paidAt`: When payment was made (ISO 8601)
- `paymentParams.note`: Payment note/description
- `paymentParams.isAuthorizationHold`: Whether this is an authorization hold

#### Payment Methods
Common payment method types:
- `CASH`
- `CREDIT_CARD`
- `BANK_TRANSFER`
- `CHECK`
- `OTHER`

## Response Format

### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    // Guesty payment response data
    "id": "payment_id",
    "amount": 100.00,
    "currency": "USD",
    "status": "confirmed",
    // ... other Guesty payment fields
  },
  "message": "Payment added successfully"
}
```

### Error Responses

#### 400 Bad Request - Missing Reservation ID
```json
{
  "error": "Reservation ID is required"
}
```

#### 400 Bad Request - Missing Payment Data
```json
{
  "error": "Payment method and amount are required"
}
```

#### 405 Method Not Allowed
```json
{
  "error": "Method not allowed"
}
```

#### 500 Internal Server Error - Guesty Token Issue
```json
{
  "error": "Failed to retrieve Guesty token"
}
```

#### 500 Internal Server Error - Guesty API Error
```json
{
  "error": "Failed to add payment to Guesty",
  "details": "Guesty API error message",
  "status": 400
}
```

## Email Notification Feature

### Automatic Rating Email
After successful payment processing, the function automatically:

1. **Fetches reservation details** from Guesty API to get:
   - Guest email address
   - Listing ID
   - Listing title/nickname

2. **Sends personalized email** via SendGrid containing:
   - Thank you message for payment
   - Listing-specific information
   - Direct link to rating page

### Rating URL Format
```
https://londoner.vercel.app/rate?listing_id={LISTING_ID}&listing_title={LISTING_TITLE}
```

### Email Content Example
```
Subject: Rate Your Stay - Share Your Experience

Thank you for your payment!

We hope you enjoyed your stay at Beautiful London Apartment.

Please take a moment to rate your experience and share your feedback:
https://londoner.vercel.app/rate?listing_id=12345&listing_title=Beautiful%20London%20Apartment

Your review helps us improve our service and helps other guests make informed decisions.

Best regards,
The Londoners Team
```

## Environment Variables

Required environment variables:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `SENDGRID_API_KEY`: Your SendGrid API key (format: SG.xxxxx...)

The function validates SendGrid API key format and provides helpful error messages.

## Usage Examples

### Local Development
```bash
# Start Supabase locally
supabase start

# Add a cash payment
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/add-payment' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "reservationId": "res_12345",
    "paymentParams": {
      "paymentMethod": {
        "method": "CASH",
        "saveForFutureUse": false
      },
      "amount": 100.00,
      "note": "Final payment for stay",
      "isAuthorizationHold": false
    }
  }'
```

### Credit Card Payment
```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/add-payment' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "reservationId": "res_67890",
    "paymentParams": {
      "paymentMethod": {
        "method": "CREDIT_CARD",
        "id": "pm_1234567890",
        "saveForFutureUse": true
      },
      "amount": 250.00,
      "shouldBePaidAt": "2025-06-15T10:00:00Z",
      "note": "Advance payment for summer booking",
      "isAuthorizationHold": false
    }
  }'
```

### Authorization Hold
```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/add-payment' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "reservationId": "res_11111",
    "paymentParams": {
      "paymentMethod": {
        "method": "CREDIT_CARD",
        "id": "pm_hold_12345"
      },
      "amount": 500.00,
      "note": "Security deposit hold",
      "isAuthorizationHold": true
    }
  }'
```

### JavaScript/TypeScript Client
```typescript
const addPayment = async (reservationId: string, paymentData: any) => {
  const { data, error } = await supabase.functions.invoke('add-payment', {
    body: {
      reservationId,
      paymentParams: paymentData
    }
  });

  if (error) {
    console.error('Payment error:', error);
    return { success: false, error };
  }

  console.log('Payment successful:', data);
  return { success: true, data };
};

// Usage example
const result = await addPayment('res_12345', {
  paymentMethod: {
    method: 'CASH',
    saveForFutureUse: false
  },
  amount: 150.00,
  note: 'Final balance payment'
});
```

### Python Client
```python
import requests

def add_payment(reservation_id, payment_params):
    url = "https://YOUR_PROJECT.supabase.co/functions/v1/add-payment"
    headers = {
        "Authorization": "Bearer YOUR_SUPABASE_ANON_KEY",
        "Content-Type": "application/json"
    }
    
    data = {
        "reservationId": reservation_id,
        "paymentParams": payment_params
    }
    
    response = requests.post(url, json=data, headers=headers)
    return response.json()

# Usage example
result = add_payment("res_12345", {
    "paymentMethod": {
        "method": "BANK_TRANSFER",
        "saveForFutureUse": False
    },
    "amount": 300.00,
    "note": "Wire transfer payment"
})

print(result)
```

## Error Handling

### Payment Processing Errors
The function handles various error scenarios:

- **Missing required fields**: Returns 400 with descriptive error
- **Guesty token issues**: Returns 500 with token retrieval error
- **Guesty API failures**: Returns original Guesty error with status code
- **Network issues**: Returns 500 with connection error details

### Email Sending Errors
Email failures are handled gracefully:

- **SendGrid API errors**: Logged but don't affect payment success
- **Missing guest data**: Skipped with warning logs
- **Invalid email formats**: Handled during SendGrid validation
- **Configuration issues**: Logged with helpful error messages

### Logging and Debugging
Comprehensive logging includes:

```
=============================================================
📧 SENDING RATING EMAIL
=============================================================
To: guest@example.com
From: info@londoners.com
Subject: Rate Your Stay - Share Your Experience
Rating URL: https://londoner.vercel.app/rate?listing_id=12345&listing_title=Beautiful%20Apartment
=============================================================
```

## Database Dependencies

### Required Tables
- `guesty_tokens`: Stores Guesty API access tokens
  - `access_token` (text): Valid Guesty API token

### Database Schema
```sql
-- Guesty tokens table
CREATE TABLE guesty_tokens (
  id SERIAL PRIMARY KEY,
  access_token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Guesty API Integration

### Payment Endpoint
```
POST https://open-api.guesty.com/v1/reservations/{reservationId}/payments
```

### Reservation Details Endpoint
```
GET https://open-api.guesty.com/v1/reservations/{reservationId}
```

### Required Permissions
The Guesty API token needs permissions for:
- Reading reservation details
- Adding payments to reservations

## SendGrid Integration

### Email Sending Endpoint
```
POST https://api.sendgrid.com/v3/mail/send
```

### Required Setup
1. SendGrid account with verified sender domain
2. API key with mail sending permissions
3. Sender email (info@londoners.com) verified in SendGrid

### Email Validation
- API key format validation (must start with 'SG.')
- Automatic error handling for common SendGrid issues
- Detailed error logging for troubleshooting

## Security Considerations

- Uses Supabase Row Level Security (RLS)
- Validates all input parameters
- Sanitizes email content to prevent injection
- Uses environment variables for sensitive data
- Implements proper CORS headers

## Performance Notes

- Asynchronous payment and email processing
- Email failures don't block payment completion
- Efficient API calls with proper error handling
- Connection pooling through Supabase client
- Minimal data processing overhead

## Monitoring and Observability

### Success Indicators
- Payment successfully added to Guesty
- Rating email sent to guest
- Proper logging throughout process

### Failure Indicators
- Guesty API errors
- SendGrid delivery failures
- Missing environment variables
- Invalid request parameters

### Log Messages to Monitor
- "Payment added successfully"
- "Rating email sent successfully"
- "Failed to send rating email (payment still successful)"
- "Missing guest email or listing ID, skipping rating email"

## Testing

### Test Scenarios
1. **Valid payment addition** - Should succeed and send email
2. **Invalid reservation ID** - Should return 400 error
3. **Missing payment parameters** - Should return 400 error
4. **Guesty API failure** - Should return Guesty error
5. **Email sending failure** - Payment should succeed, email failure logged
6. **Missing guest email** - Payment should succeed, email skipped

### Testing Checklist
- [ ] Payment processing with various methods
- [ ] Email sending with valid guest data
- [ ] Error handling for missing data
- [ ] CORS preflight requests
- [ ] Environment variable validation
- [ ] Logging output verification

## Troubleshooting

### Common Issues

#### "Failed to retrieve Guesty token"
- Check `guesty_tokens` table has valid access token
- Verify Guesty API token hasn't expired
- Ensure proper database permissions

#### "SendGrid API key not configured"
- Set `SENDGRID_API_KEY` environment variable
- Verify API key format starts with 'SG.'
- Check SendGrid account status

#### "Missing guest email or listing ID"
- Verify reservation exists in Guesty
- Check reservation has guest information
- Ensure listing data is properly populated

#### "Failed to add payment to Guesty"
- Verify reservation ID is valid
- Check payment parameters format
- Ensure Guesty API token has payment permissions

## Deployment

```bash
# Deploy to Supabase
supabase functions deploy add-payment

# Set environment variables
supabase secrets set SENDGRID_API_KEY=SG.your_api_key_here
```

## Related Functions

- `contact-us`: Email sending functionality reference
- `create-payment-method`: Payment method creation
- `get-reservations`: Reservation management
- `add-review`: Review submission after rating email

## API Rate Limits

- Guesty API: Standard rate limits apply
- SendGrid API: Based on your SendGrid plan
- Consider implementing retry logic for production use

## Future Enhancements

- Email template customization
- Multiple language support
- SMS notification option
- Payment confirmation emails
- Custom rating page parameters
- A/B testing for email content
