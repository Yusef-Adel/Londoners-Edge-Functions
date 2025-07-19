# Get Reservations Edge Function

This Supabase Edge Function retrieves reservations from the Guesty API with support for filtering, pagination, and field selection.

## Overview

The function integrates with Guesty's Open API to fetch reservation data. It automatically handles authentication using tokens stored in your Supabase database and supports various filtering options including guest-specific queries.

## Features

- ✅ **Guesty API Integration**: Direct connection to Guesty's reservations endpoint
- ✅ **Token Management**: Automatic retrieval of valid Guesty tokens from database
- ✅ **Flexible Filtering**: Support for MongoDB-style operators (`$eq`, `$not`, `$contains`, `$between`, etc.)
- ✅ **Guest Filtering**: Easy filtering by specific guest ID
- ✅ **Pagination**: Built-in pagination support with configurable limits
- ✅ **Field Selection**: Choose specific fields to return
- ✅ **Sorting**: Customizable result sorting
- ✅ **CORS Support**: Ready for frontend integration

## API Endpoint

```
POST /functions/v1/get-reservations
```

## Request Format

### Headers
```
Content-Type: application/json
Authorization: Bearer <your-supabase-anon-key>
```

### Request Body Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `guestId` | string | No | Filter reservations for a specific guest |
| `viewId` | string | No | Guesty view ID for filtered results |
| `filters` | array | No | Array of filter objects using MongoDB operators |
| `fields` | string | No | Space-separated list of fields to return |
| `sort` | string | No | Sorting criteria (default: `_id`) |
| `limit` | integer | No | Number of records to return (default: 25, max: 100) |
| `skip` | integer | No | Number of records to skip for pagination |

## Filter Object Structure

When using the `filters` parameter, each filter object should follow this structure:

```json
{
  "field": "string",
  "operator": "string", 
  "value": "any"
}
```

### Supported Operators

- `$eq` - Equals
- `$not` - Not equals
- `$contains` - Contains text
- `$notcontains` - Does not contain text
- `$gt` - Greater than
- `$lt` - Less than
- `$between` - Between two values (requires `from` and `to` instead of `value`)

### Date Range Filter Example

For date ranges using `$between`:

```json
{
  "field": "checkIn",
  "operator": "$between",
  "from": "2025-07-01T00:00:00+00:00",
  "to": "2025-07-31T23:59:59+00:00"
}
```

## Usage Examples

### 1. Get All Reservations (Default)

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/get-reservations' \
  -H 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

### 2. Get Reservations for Specific Guest

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/get-reservations' \
  -H 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"guestId":"683743a880b8e714e775353b"}'
```

### 3. Filter with Custom Criteria

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/get-reservations' \
  -H 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "filters": [
      {"field": "status", "operator": "$eq", "value": "confirmed"}
    ],
    "limit": 50
  }'
```

### 4. Date Range Filter

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/get-reservations' \
  -H 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "filters": [
      {
        "field": "checkIn",
        "operator": "$between",
        "from": "2025-07-01T00:00:00+00:00",
        "to": "2025-07-31T23:59:59+00:00"
      }
    ]
  }'
```

### 5. Select Specific Fields

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/get-reservations' \
  -H 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "fields": "_id guestId guest listingId listing checkIn checkOut confirmationCode",
    "sort": "checkIn"
  }'
```

### 6. Pagination Example

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/get-reservations' \
  -H 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "limit": 10,
    "skip": 20
  }'
```

## Response Format

### Success Response

```json
{
  "status": "success",
  "message": "Reservations retrieved successfully",
  "data": [
    {
      "_id": "683743a9f0cd830030cd117a",
      "guestId": "683743a880b8e714e775353b",
      "listingId": "679b0ea4cb8d6900130ed2c5",
      "confirmationCode": "BC-l05nYJZ37",
      "checkIn": "2025-07-19T15:00:00.000Z",
      "checkOut": "2025-07-27T10:00:00.000Z",
      "guest": {
        "_id": "683743a880b8e714e775353b",
        "fullName": "AHMED ESSAM A ALMAHDY"
      },
      "listing": {
        "_id": "679b0ea4cb8d6900130ed2c5",
        "title": "Its South Ken, Darling!"
      },
      "integration": {
        "platform": "bookingCom"
      },
      "accounting": {
        "analytics": {
          "commission": 851.73
        }
      }
    }
  ],
  "totalCount": 1,
  "page": 1,
  "limit": 25
}
```

### Error Response

```json
{
  "status": "error",
  "message": "Internal server error",
  "details": "Specific error message"
}
```

## Response Fields

Each reservation object in the `data` array contains:

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Unique reservation ID |
| `guestId` | string | Guest identifier |
| `listingId` | string | Property listing identifier |
| `confirmationCode` | string | Booking confirmation code |
| `checkIn` | string | Check-in date (ISO format) |
| `checkOut` | string | Check-out date (ISO format) |
| `guest` | object | Guest information (name, etc.) |
| `listing` | object | Property information (title, etc.) |
| `integration` | object | Platform information (Airbnb, Booking.com, etc.) |
| `accounting` | object | Financial information including commission |

## Prerequisites

1. **Guesty API Access**: Valid Guesty account with API access
2. **Token Storage**: Guesty access tokens stored in Supabase `guesty_tokens` table
3. **Database Schema**: 
   ```sql
   CREATE TABLE guesty_tokens (
     id SERIAL PRIMARY KEY,
     access_token TEXT NOT NULL,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

## Environment Variables

The function requires these Supabase environment variables:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Error Handling

The function handles various error scenarios:

- **Invalid Token**: Automatically retrieves the latest valid token from database
- **API Errors**: Returns detailed error messages from Guesty API
- **Network Issues**: Proper error responses with status codes
- **Invalid Parameters**: Validation and sanitization of input parameters

## Rate Limiting

Respects Guesty API rate limits. The function is designed to handle:
- Maximum 100 records per request (API limitation)
- Proper pagination for larger datasets

## Development

### Local Testing

```bash
# Start Supabase locally
supabase start

# Test the function
curl -X POST 'http://127.0.0.1:54321/functions/v1/get-reservations' \
  -H 'Content-Type: application/json' \
  -d '{"guestId":"your-guest-id"}'
```

### Deployment

```bash
# Deploy to Supabase
supabase functions deploy get-reservations
```

## Common Use Cases

1. **Guest Dashboard**: Show all reservations for a specific guest
2. **Property Management**: Filter reservations by date range or status
3. **Reporting**: Extract reservation data for analytics
4. **Booking Management**: Monitor recent bookings and check-ins
5. **Commission Tracking**: Access financial data for revenue analysis

## Troubleshooting

### Common Issues

1. **500 Error with Filters**: Ensure you're using MongoDB operators (`$eq`, not `eq`)
2. **No Results**: Check that guest ID exists and is correctly formatted
3. **Token Errors**: Verify that valid Guesty tokens are stored in the database
4. **CORS Issues**: Function includes proper CORS headers for frontend integration

### Debug Mode

The function includes extensive logging. Check Supabase logs for:
- API request details
- Filter processing
- Response statistics

## Contributing

When modifying this function:
1. Test with various filter combinations
2. Verify pagination works correctly
3. Ensure CORS headers are maintained
4. Update this documentation with any new features
