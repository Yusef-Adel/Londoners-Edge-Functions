# Refund Payment Edge Function

A Supabase Edge Function for processing payment refunds for Guesty reservations.

## Overview

This function allows you to initiate a refund for a specific payment on a Guesty reservation. It securely calls the Guesty API, validates all required parameters, and returns a structured response with refund details and error handling.

---

## Endpoint

```
POST /functions/v1/refund-payment
```

---

## Request Format

### JSON Body
```
{
  "id": "reservation_123",        // Reservation ID (required)
  "paymentId": "payment_456",     // Payment ID (required)
  "amount": 100.50,                // Refund amount (required, must be positive)
  "note": "Customer requested refund" // Optional note
}
```

### Required Fields
- `id`: Reservation ID (string)
- `paymentId`: Payment ID (string)
- `amount`: Refund amount (number, must be positive)

### Optional Fields
- `note`: Reason or note for the refund (string)

### Request Headers
- `Authorization: Bearer <SUPABASE_TOKEN>`
- `Content-Type: application/json`

---

## Response Format

### Success Response (200)
```
{
  "success": true,
  "message": "Refund processed successfully",
  "data": {
    "refundId": "refund_789",
    "reservationId": "reservation_123",
    "paymentId": "payment_456",
    "amount": 100.50,
    "currency": "USD",
    "status": "processed",
    "note": "Customer requested refund",
    "processedAt": "2025-07-13T10:30:00.000Z",
    "originalResponse": { ... } // Full Guesty API response
  }
}
```

### Error Responses

#### 400 Bad Request
- Missing required fields:
```
{
  "error": "Missing required fields: id (reservation ID), paymentId, and amount are required"
}
```
- Invalid amount:
```
{
  "error": "Amount must be a positive number"
}
```

#### 500 Internal Server Error
- Guesty token or API error:
```
{
  "error": "Failed to retrieve Guesty access token"
}
```
- Guesty API refund error:
```
{
  "error": "Failed to process refund with Guesty",
  "details": "...Guesty error message...",
  "status": 400
}
```
- General server error:
```
{
  "error": "Internal server error",
  "details": "...error message..."
}
```

---

## Usage Example

### cURL
```
curl -i --location --request POST 'https://YOUR_PROJECT.supabase.co/functions/v1/refund-payment' \
  --header 'Authorization: Bearer YOUR_SUPABASE_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{
    "id": "reservation_123",
    "paymentId": "payment_456",
    "amount": 100.50,
    "note": "Customer requested refund"
  }'
```

### JavaScript/TypeScript
```typescript
const response = await fetch('/functions/v1/refund-payment', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_SUPABASE_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    id: 'reservation_123',
    paymentId: 'payment_456',
    amount: 100.50,
    note: 'Customer requested refund'
  })
});
const data = await response.json();
console.log(data);
```

---

## Prerequisites

1. **Guesty Access Token**: The function requires a valid Guesty access token stored in the `guesty_tokens` table in your Supabase database.

2. **Database Setup**: Ensure the `guesty_tokens` table exists with the following structure:
   ```sql
   CREATE TABLE guesty_tokens (
     access_token TEXT NOT NULL
   );
   ```

3. **Environment Variables**: Ensure `SUPABASE_URL` and `SUPABASE_ANON_KEY` are properly configured.

---

## Error Handling

- Validates all required fields and amount
- Handles missing or invalid Guesty access token
- Handles Guesty API errors and returns details
- Returns clear error messages and appropriate HTTP status codes

---

## Security

- All requests require valid Supabase authentication
- Guesty tokens are securely stored in the database
- CORS headers are properly configured
- No sensitive data is logged or exposed

---

## Changelog

### v1.0.0
- Initial implementation: refund payment via Guesty API
- Input validation, error handling, and CORS support
