# Refund Payment Function

Process refunds for Guesty reservation payments with automatic payment extraction.

## Quick Start

```bash
# Simple refund - just provide the reservation ID
curl -X POST 'https://your-project.supabase.co/functions/v1/refund-payment' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"id": "698de657deb6216166e7b376"}'
```

That's it! The function automatically:
- ✅ Fetches the reservation from Guesty
- ✅ Extracts the payment ID
- ✅ Determines the refund amount
- ✅ Processes the refund

## Features

- ✅ Automatic payment ID extraction from reservation
- ✅ Support for multiple payments per reservation
- ✅ Partial or full refund support
- ✅ Optional notes for refund tracking
- ✅ Comprehensive error handling

## API Endpoint

```
POST /refund-payment
```

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | ✅ Yes | Reservation ObjectId (24-character hex string) |
| `paymentId` | string | ❌ No | Payment ID (auto-extracted if not provided) |
| `paymentIndex` | number | ❌ No | Payment index (default: 0). Use when reservation has multiple payments |
| `amount` | number | ❌ No | Refund amount (defaults to full payment amount) |
| `note` | string | ❌ No | Optional refund note |

## Usage Examples

### 1. Simple Refund (Recommended)
Refund the first payment with its full amount:

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/refund-payment' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "698de657deb6216166e7b376"
  }'
```

### 2. Partial Refund
Refund a specific amount:

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/refund-payment' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "698de657deb6216166e7b376",
    "amount": 50.00,
    "note": "Partial refund for service issue"
  }'
```

### 3. Refund Specific Payment (When Multiple Payments Exist)
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/refund-payment' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "698de657deb6216166e7b376",
    "paymentIndex": 1,
    "note": "Refund second payment"
  }'
```

### 4. Manual Payment ID (Advanced)
If you already have the payment ID:

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/refund-payment' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "698de657deb6216166e7b376",
    "paymentId": "698de65cc65415ecef74e77f",
    "amount": 100.00,
    "note": "Customer requested refund"
  }'
```

## Response Format

### Success Response (200)

```json
{
  "success": true,
  "message": "Refund processed successfully",
  "data": {
    "refundId": "refund_xyz123",
    "reservationId": "698de657deb6216166e7b376",
    "paymentId": "698de65cc65415ecef74e77f",
    "amount": 100.00,
    "currency": "GBP",
    "status": "processed",
    "note": "Customer requested refund",
    "processedAt": "2026-02-14T10:30:00.000Z",
    "originalResponse": { /* Full Guesty response */ }
  }
}
```

### Error Response (400/404/500)

```json
{
  "error": "Error description",
  "details": "Additional error details",
  "status": 400
}
```

## How It Works

1. **Validates** the reservation ID format (24-character MongoDB ObjectId)
2. **Fetches** the Guesty access token from the database
3. **Retrieves** the reservation data if payment ID is not provided
4. **Extracts** the payment ID from `money.payments[paymentIndex]._id`
5. **Determines** the refund amount (uses payment amount if not specified)
6. **Processes** the refund via Guesty API
7. **Returns** the refund details

## Payment Data Structure

In Guesty reservations, payment information is located at:
```
reservation.money.payments[index]
```

Each payment object contains:
- `_id`: Payment ID (used for refunds)
- `amount`: Payment amount
- `currency`: Payment currency
- `status`: Payment status
- `confirmationCode`: External payment confirmation

## Error Handling

| Error | Description | Solution |
|-------|-------------|----------|
| Invalid reservation ID format | ID is not 24 hex characters | Use MongoDB ObjectId from Guesty |
| No payments found | Reservation has no payments | Verify reservation has completed payments |
| Invalid payment index | Index out of bounds | Check the number of payments in reservation |
| Failed to fetch reservation | Guesty API error | Verify reservation ID and Guesty access |
| Failed to process refund | Refund API error | Check payment status and refund eligibility |

## Testing Example

Use the provided Guesty payload to test:

```javascript
// Example reservation with payment (from Guesty API)
const testPayload = {
  "_id": "698de657deb6216166e7b376",
  "confirmationCode": "GY-KkyKz8sA",
  "money": {
    "payments": [
      {
        "_id": "698de65cc65415ecef74e77f",
        "amount": 1,
        "currency": "GBP",
        "status": "SUCCEEDED",
        "confirmationCode": "pay_xfa4lyabm5vy3m7ulclxzn67qa",
        "paidAt": "2026-02-12T14:40:30.215Z"
      }
    ],
    "totalPaid": 1,
    "balanceDue": -1
  }
}

// Minimum request to refund this payment:
{
  "id": "698de657deb6216166e7b376"
}

// Expected result: Full refund of 1 GBP
```

### Real-World Example

Based on the Guesty reservation provided, here's how to process the refund:

**Reservation Details:**
- Reservation ID: `698de657deb6216166e7b376`
- Confirmation Code: `GY-KkyKz8sA` (not used in API)
- Payment ID: `698de65cc65415ecef74e77f`
- Amount Paid: `1 GBP`
- Status: `canceled`

**To refund this reservation:**
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/refund-payment' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "698de657deb6216166e7b376",
    "note": "Guest cancellation - Others"
  }'
```

The function will:
1. Fetch reservation `698de657deb6216166e7b376` from Guesty
2. Extract payment ID `698de65cc65415ecef74e77f` from `money.payments[0]._id`
3. Use amount `1` from `money.payments[0].amount`
4. Process the refund and return confirmation

## Key Improvements

- ✅ **No manual payment ID extraction needed** - The function automatically retrieves it
- ✅ **Flexible refund amounts** - Full or partial refunds supported
- ✅ **Multiple payment support** - Handle reservations with multiple payments
- ✅ **Better error messages** - Clear guidance when things go wrong
- ✅ **Minimal required input** - Just the reservation ID in most cases

## Prerequisites

1. **Guesty Access Token**: The function requires a valid Guesty access token stored in the `guesty_tokens` table in your Supabase database.

2. **Database Setup**: Ensure the `guesty_tokens` table exists with the following structure:
   ```sql
   CREATE TABLE guesty_tokens (
     access_token TEXT NOT NULL
   );
   ```

3. **Environment Variables**: Ensure `SUPABASE_URL` and `SUPABASE_ANON_KEY` are properly configured.

## Notes

- Refunds can only be processed on succeeded payments
- The function automatically extracts payment details from the reservation
- Partial refunds are supported (amount can be less than payment amount)
- Multiple payments in a reservation can be refunded by specifying `paymentIndex`
- All refund transactions are logged in the Guesty system
- The reservation ID must be a valid 24-character MongoDB ObjectId

## Security

- All requests require valid Supabase authentication
- Guesty tokens are securely stored in the database
- CORS headers are properly configured
- No sensitive data is logged or exposed

## Common Scenarios

### Scenario 1: Guest Cancellation - Full Refund
```json
{
  "id": "698de657deb6216166e7b376",
  "note": "Guest cancelled - full refund"
}
```

### Scenario 2: Service Issue - Partial Refund
```json
{
  "id": "698de657deb6216166e7b376",
  "amount": 0.50,
  "note": "Compensation for late check-in"
}
```

### Scenario 3: Multiple Payments - Refund Second Payment
```json
{
  "id": "698de657deb6216166e7b376",
  "paymentIndex": 1,
  "note": "Refund security deposit"
}
```

## FAQ

**Q: How do I find the reservation ID?**  
A: The reservation ID is the `_id` field in the Guesty reservation object (24-character hex string like `698de657deb6216166e7b376`). Do not use the confirmation code (e.g., `GY-KkyKz8sA`).

**Q: Can I refund more than the payment amount?**  
A: No, the refund amount cannot exceed the original payment amount. The Guesty API will reject such requests.

**Q: What happens if the reservation has multiple payments?**  
A: By default, the function refunds the first payment (index 0). Use `paymentIndex` to specify a different payment.

**Q: Can I refund a failed or pending payment?**  
A: No, only payments with status `SUCCEEDED` can be refunded.

**Q: Is the refund processed immediately?**  
A: The function initiates the refund via Guesty API immediately. The actual refund processing time depends on the payment provider.

## Changelog

### v2.0.0 (2026-02-14)
- ✨ Added automatic payment ID extraction from reservations
- ✨ Made `paymentId` and `amount` optional parameters
- ✨ Added support for multiple payments via `paymentIndex`
- 🔧 Improved error messages and validation
- 📝 Updated documentation with real examples

### v1.0.0
- Initial implementation: refund payment via Guesty API
- Input validation, error handling, and CORS support
