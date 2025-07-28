# Update Reservation Status Edge Function

## Overview

The `update-reservation-status` Supabase Edge Function allows you to update the status of a reservation in the Guesty system. This function serves as a proxy to the Guesty API's reservation status update endpoint, providing a secure way to change reservation statuses from your application.

## Endpoint

```
POST https://your-project.supabase.co/functions/v1/update-reservation-status
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
  "reservationId": "string",
  "status": "string"
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reservationId` | string | Yes | The unique identifier for the reservation in the Guesty system |
| `status` | string | Yes | The new status to set for the reservation |

#### Valid Status Values

The function accepts the following reservation status values:

- `confirmed` - Reservation is confirmed
- `canceled` - Reservation has been canceled
- `inquired` - Initial inquiry status
- `pending` - Reservation is pending approval
- `rejected` - Reservation has been rejected
- `booked` - Reservation is booked
- `checked_in` - Guest has checked in
- `checked_out` - Guest has checked out
- `expired` - Reservation has expired

## Response Format

### Success Response (200)

```json
{
  "success": true,
  "message": "Reservation status updated to confirmed",
  "data": {
    // Guesty API response object
  }
}
```

### Error Responses

#### Missing Required Fields (400)

```json
{
  "error": "Missing required field: reservationId"
}
```

```json
{
  "error": "Missing required field: status"
}
```

#### Invalid Status (400)

```json
{
  "error": "Invalid status value",
  "validStatuses": ["confirmed", "canceled", "inquired", "pending", "rejected", "booked", "checked_in", "checked_out", "expired"]
}
```

#### Unauthorized (401)

```json
{
  "error": "Missing authorization header"
}
```

#### Method Not Allowed (405)

```json
{
  "error": "Method not allowed"
}
```

#### Guesty API Error (Variable Status)

```json
{
  "error": "Guesty API error: 404",
  "details": "Reservation not found"
}
```

#### Internal Server Error (500)

```json
{
  "error": "Failed to retrieve Guesty access token"
}
```

```json
{
  "error": "Internal server error",
  "details": "Error details here"
}
```

## Usage Examples

### Update Reservation to Confirmed

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/update-reservation-status' \
  -H 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "reservationId": "64b8f2a9e1234567890abcde",
    "status": "confirmed"
  }'
```

### Cancel a Reservation

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/update-reservation-status' \
  -H 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "reservationId": "64b8f2a9e1234567890abcde",
    "status": "canceled"
  }'
```

### Mark Guest as Checked In

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/update-reservation-status' \
  -H 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "reservationId": "64b8f2a9e1234567890abcde",
    "status": "checked_in"
  }'
```

## Environment Variables

The function requires the following environment variables to be set in your Supabase project:

| Variable Name | Description |
|---------------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous key for authentication |

## Database Requirements

The function expects a `guesty_tokens` table in your Supabase database with the following structure:

```sql
CREATE TABLE guesty_tokens (
  id SERIAL PRIMARY KEY,
  access_token TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Function Behavior

1. **CORS Handling**: The function handles CORS preflight requests to allow cross-origin requests
2. **Method Validation**: Only accepts POST requests
3. **Authentication Check**: Validates the presence of Authorization header
4. **Input Validation**: Validates that required fields are present and status value is valid
5. **Token Retrieval**: Fetches the Guesty access token from the database
6. **Guesty API Call**: Makes a PUT request to the Guesty reservation status update endpoint
7. **Response Handling**: Returns the updated reservation data or appropriate error messages
8. **Error Forwarding**: Forwards Guesty API error responses with their original status codes

## Error Handling

The function includes comprehensive error handling for:
- Missing required parameters
- Invalid status values
- Missing authorization headers
- Token retrieval failures
- Guesty API errors (reservation not found, unauthorized, etc.)
- Network connectivity issues
- General server errors

## CORS Support

The function includes CORS headers to allow requests from any origin:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: POST, OPTIONS`
- `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`

## API Integration

This function integrates with the Guesty API endpoint:
- **Endpoint**: `https://open-api.guesty.com/v1/reservations-v3/{reservationId}/status`
- **Method**: `PUT`
- **Authentication**: Bearer token from database

## Use Cases

This function is ideal for:
- **Reservation Management**: Update reservation statuses from your application
- **Check-in/Check-out Systems**: Mark guests as checked in or out
- **Cancellation Workflows**: Cancel reservations programmatically
- **Status Synchronization**: Keep reservation statuses in sync across systems
- **Automated Workflows**: Trigger status updates based on business logic

## Security Considerations

1. **Token Security**: The function securely retrieves Guesty tokens from the database
2. **Input Validation**: All inputs are validated before processing
3. **Authorization**: Requires proper Supabase authentication
4. **Error Handling**: Sensitive information is not exposed in error messages

## Local Development

To test this function locally:

1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
2. Make an HTTP request:

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/update-reservation-status' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "reservationId": "64b8f2a9e1234567890abcde",
    "status": "confirmed"
  }'
```

## Related Functions

- `get-reservations`: Retrieve reservation data
- `create-reservation`: Create new reservations
- `get-user`: Get guest information

## Notes

- The function uses Deno runtime with Supabase Edge Functions
- Environment variables `SUPABASE_URL` and `SUPABASE_ANON_KEY` must be configured
- Requires a valid Guesty access token stored in the database
- The function acts as a proxy to the Guesty API, forwarding error responses with their original status codes
- Status changes may trigger other actions in the Guesty system (notifications, calendar updates, etc.)
- Consider implementing rate limiting for production use
