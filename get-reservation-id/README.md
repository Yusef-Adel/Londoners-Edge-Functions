# Get Reservation by ID

## Overview
Edge function that retrieves a specific reservation from Guesty API by its ID, returning status and payment information.

## Features
- Fetch single reservation by ID
- Returns reservation status and money details
- Automatic Guesty token management
- Comprehensive error handling
- CORS enabled for cross-origin requests

## API Endpoint

**POST** `/get-reservation-id`

## Request Format

```json
{
  "id": "reservation-id-here"
}
```

### Parameters

| Parameter | Type   | Required | Description                    |
|-----------|--------|----------|--------------------------------|
| `id`      | string | Yes      | Guesty reservation ID          |

## Response Format

### Success Response (200)

```json
{
  "status": "confirmed",
  "isFullyPaid": false
}
```

**Response Fields:**

| Field        | Type    | Description                                |
|--------------|---------|---------------------------------------------|
| `status`     | string  | Reservation status (confirmed, pending, cancelled, etc.) |
| `isFullyPaid`| boolean | Whether the reservation is fully paid      |

### Error Responses

**400 Bad Request** - Missing reservation ID
```json
{
  "error": "Reservation ID is required"
}
```

**404 Not Found** - Reservation doesn't exist
```json
{
  "status": "error",
  "message": "Reservation not found",
  "details": "No reservation found with ID: xyz"
}
```

**500 Internal Server Error**
```json
{
  "status": "error",
  "message": "Internal server error",
  "details": "Error description"
}
```

## Possible Status Values

Common reservation statuses returned:
- `confirmed` - Reservation is confirmed
- `pending` - Awaiting confirmation
- `cancelled` - Reservation was cancelled
- `inquiry` - Initial inquiry, not yet booked
- `declined` - Reservation was declined

## Usage Examples

### Basic Request
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/get-reservation-id' \
  --header 'Content-Type: application/json' \
  --data '{
    "id": "67890abc12345def67890abc"
  }'
```

### JavaScript/TypeScript
```typescript
const response = await fetch('https://your-project.supabase.co/functions/v1/get-reservation-id', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    id: '67890abc12345def67890abc'
  })
});

const result = await response.json();
// result = { status: "confirmed", isFullyPaid: false }
console.log(`Status: ${result.status}, Paid: ${result.isFullyPaid}`);
```

### React Example
```tsx
const checkReservationPayment = async (reservationId: string) => {
  try {
    const response = await fetch('/functions/v1/get-reservation-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: reservationId })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch reservation');
    }

    const { status, isFullyPaid } = await response.json();
    
    if (isFullyPaid) {
      console.log('Payment complete!');
    } else {
      console.log(`Payment pending - Status: ${status}`);
    }
    
    return { status, isFullyPaid };
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};
```

## Setup Requirements

### Environment Variables
Ensure these are set in your Supabase project:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for database access

### Database Requirements
- `guesty_tokens` table with valid Guesty API access tokens

## Fields Retrieved

The function specifically requests these fields from Guesty:
- `status` - Reservation status (confirmed, pending, cancelled, etc.)
- `money` - Complete payment and pricing information

This focused approach ensures:
- Faster API responses
- Reduced data transfer
- Only essential payment data is retrieved

## Important Notes

- **Token Management**: The function automatically retrieves the latest Guesty token from your database
- **Field Filtering**: Only `status` and `money` fields are requested to optimize performance
- **Error Handling**: Specific error codes (404, 400, 500) for different scenarios
- **CORS**: Enabled for cross-origin requests from your frontend

## Common Use Cases

1. **Payment Verification**: Check if a reservation is fully paid
2. **Status Checking**: Verify current reservation status
3. **Financial Details**: Get breakdown of charges and payouts
4. **Refund Processing**: Access payment information for refund calculations

## Troubleshooting

### Reservation Not Found (404)
- Verify the reservation ID is correct
- Ensure the reservation exists in Guesty
- Check if the ID format is valid (typically 24-character MongoDB ObjectId)

### No Guesty Token (500)
- Verify `guesty_tokens` table has valid entries
- Check token hasn't expired
- Ensure database connection is working

### Invalid Request (400)
- Make sure `id` parameter is included in request body
- Verify JSON formatting is correct

## Performance

- **Response Time**: Typically < 1 second
- **Timeout**: 30 seconds for Guesty API
- **Retry Logic**: None (single request)
- **Caching**: No caching implemented

## Related Functions

- `get-reservations` - List multiple reservations with filtering
- `create-reservation` - Create new reservations
- `update-reservation-status` - Update reservation status
- `refund-payment` - Process refunds for reservations

## Dependencies

- Supabase Functions Runtime
- Guesty API v1
- `guesty_tokens` database table

## Error Codes

| Code | Meaning                           |
|------|-----------------------------------|
| 200  | Success                           |
| 400  | Bad Request (missing ID)          |
| 404  | Reservation not found             |
| 405  | Method not allowed (use POST)     |
| 500  | Internal server error             |
