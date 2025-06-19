# Create Invoice Edge Function

## Overview

The `create-invoice` Supabase Edge Function creates invoice items for reservations through the Guesty API. This function validates the required parameters, retrieves authentication tokens, and creates invoice items with various types and optional fields.

## Endpoint

```
POST https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/create-invoice
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
  "amount": "number",
  "title": "string",
  "normalType": "string",
  "description": "string",
  "currency": "string",
  "dueDate": "string",
  "taxable": "boolean",
  "taxRate": "number",
  "notes": "string"
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reservationId` | string | Yes | The unique identifier for the reservation |
| `amount` | number | Yes | The invoice amount |
| `title` | string | Yes | The title/name of the invoice item |
| `normalType` | string | Yes | Invoice type code (see valid types below) |
| `description` | string | No | Description of the invoice item |
| `currency` | string | No | Currency code (e.g., USD, EUR) |
| `dueDate` | string | No | Due date for the invoice |
| `taxable` | boolean | No | Whether the item is taxable |
| `taxRate` | number | No | Tax rate percentage |
| `notes` | string | No | Additional notes |

#### Valid Normal Types

The `normalType` parameter must be one of the following values:

- `CF` - Cleaning Fee
- `CFE` - Cleaning Fee Extra
- `PCM` - Per Cleaning Monthly
- `LT` - Late Fee
- `CT` - City Tax
- `VAT` - Value Added Tax
- `GST` - Goods and Services Tax
- `TT` - Tourist Tax
- `TAX` - General Tax
- `ST` - Sales Tax
- `COT` - City Occupancy Tax
- `OCT` - Occupancy Tax
- `TOT` - Transient Occupancy Tax
- `HSHAT` - HST/HAT
- `HST` - Harmonized Sales Tax
- `MAT` - Municipal Accommodation Tax
- `AFE` - Additional Fee

## Response Format

### Success Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Invoice item created successfully",
  "data": {
    "id": "invoice_item_id",
    "amount": 50.00,
    "title": "Cleaning fee",
    "normalType": "CF",
    "description": "Room cleaning service",
    "currency": "USD",
    "dueDate": "2025-07-01",
    "taxable": true,
    "taxRate": 8.5,
    "notes": "Additional cleaning required",
    "createdAt": "2025-06-19T15:13:16Z"
  }
}
```

### Error Responses

#### Missing Required Parameters

**Status Code:** `400 Bad Request`

```json
{
  "error": "reservationId is required"
}
```

```json
{
  "error": "amount is required"
}
```

```json
{
  "error": "title is required"
}
```

```json
{
  "error": "normalType is required. Must be one of: CF, CFE, PCM, LT, CT, VAT, GST, TT, TAX, ST, COT, OCT, TOT, HSHAT, HST, MAT, AFE"
}
```

#### Invalid Normal Type

**Status Code:** `400 Bad Request`

```json
{
  "error": "normalType must be one of: CF, CFE, PCM, LT, CT, VAT, GST, TT, TAX, ST, COT, OCT, TOT, HSHAT, HST, MAT, AFE"
}
```

#### Authentication Error

**Status Code:** `500 Internal Server Error`

```json
{
  "error": "Failed to retrieve Guesty access token"
}
```

#### Guesty API Error

**Status Code:** `4xx/5xx` (matches Guesty response)

```json
{
  "error": "Failed to create invoice item in Guesty",
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

## Example Usage

### JavaScript/TypeScript

```javascript
const response = await fetch('https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/create-invoice', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_SUPABASE_TOKEN'
  },
  body: JSON.stringify({
    reservationId: 'res_12345',
    amount: 50.00,
    title: 'Cleaning fee',
    normalType: 'CF',
    description: 'Deep cleaning service',
    currency: 'USD',
    dueDate: '2025-07-01',
    taxable: true,
    taxRate: 8.5,
    notes: 'Extra cleaning required'
  })
});

const data = await response.json();
console.log(data);
```

### cURL

```bash
curl -i --location --request POST 'https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/create-invoice' \
  --header 'Authorization: Bearer YOUR_SUPABASE_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{
    "reservationId": "res_12345",
    "amount": 50.00,
    "title": "Cleaning fee",
    "normalType": "CF",
    "description": "Deep cleaning service",
    "currency": "USD",
    "dueDate": "2025-07-01",
    "taxable": true,
    "taxRate": 8.5,
    "notes": "Extra cleaning required"
  }'
```

### Python

```python
import requests
import json

url = 'https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/create-invoice'
headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_SUPABASE_TOKEN'
}
data = {
    'reservationId': 'res_12345',
    'amount': 50.00,
    'title': 'Cleaning fee',
    'normalType': 'CF',
    'description': 'Deep cleaning service',
    'currency': 'USD',
    'dueDate': '2025-07-01',
    'taxable': True,
    'taxRate': 8.5,
    'notes': 'Extra cleaning required'
}

response = requests.post(url, headers=headers, data=json.dumps(data))
print(response.json())
```

## Local Development

To test this function locally:

1. Start your local Supabase instance:
   ```bash
   supabase start
   ```

2. Make a test request to the local endpoint:
   ```bash
   curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/create-invoice' \
     --header 'Authorization: Bearer YOUR_LOCAL_TOKEN' \
     --header 'Content-Type: application/json' \
     --data '{
       "reservationId": "RESERVATION_ID_HERE",
       "amount": 50.00,
       "title": "Cleaning fee",
       "normalType": "CF"
     }'
   ```

## Database Schema

This function interacts with a `guesty_tokens` table that should have the following structure:

```sql
CREATE TABLE guesty_tokens (
  id SERIAL PRIMARY KEY,
  access_token TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Function Behavior

1. **CORS Handling**: The function handles CORS preflight requests to allow cross-origin requests
2. **Input Validation**: Validates all required parameters and the normalType enum
3. **Token Retrieval**: Fetches the Guesty access token from the database
4. **Payload Construction**: Builds the invoice payload with required and optional fields
5. **Guesty API Call**: Makes a POST request to the Guesty Invoice Items API
6. **Response Handling**: Returns the created invoice data or appropriate error messages

## Error Handling

The function includes comprehensive error handling for:
- Missing required parameters
- Invalid normalType values
- Token retrieval failures
- Guesty API errors
- General server errors

## CORS Support

The function includes CORS headers to allow requests from any origin:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`

## Notes

- The function uses Deno runtime with Supabase Edge Functions
- Environment variables `SUPABASE_URL` and `SUPABASE_ANON_KEY` must be configured
- Requires a valid Guesty access token stored in the database
- The function forwards Guesty API error responses with their original status codes
- All optional fields are only included in the payload if they are provided in the request
