# Create Reservation Edge Function

This document describes the `create-reservation` edge function, which integrates with Guesty and Supabase to create and manage reservations.

## Overview

The `create-reservation` function is a Deno-based serverless function deployed on Supabase. It performs the following actions:

1. Validates incoming POST requests.
2. Authenticates using a Supabase token.
3. Creates a quote via the Guesty API.
4. Creates a reservation based on the quote.
5. Updates the reservation status to "awaiting_payment."
6. Stores the reservation in the Supabase database.

## API Endpoint

The function is deployed at:

```
https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/create-reservation
```

## Request

### HTTP Method
- **POST**

### Headers
- `Authorization`: Bearer token (e.g., Supabase service role key).

### Request Body
The request body should be a JSON object with the following fields:

| Field                    | Type      | Required | Description                                   |
|--------------------------|-----------|----------|-----------------------------------------------|
| `check_in_date_localized`| `string`  | Yes      | Check-in date in `YYYY-MM-DD` format.         |
| `check_out_date_localized`| `string` | Yes      | Check-out date in `YYYY-MM-DD` format.        |
| `listing_id`             | `string`  | Yes      | The ID of the listing.                        |
| `source`                 | `string`  | Yes      | Source of the reservation (e.g., "website").  |
| `guests_count`           | `number`  | Yes      | Total number of guests.                       |
| `guest_id`               | `string`  | Yes      | Guest ID for the reservation.                 |
| `number_of_adults`       | `number`  | Yes      | Number of adult guests.                       |
| `number_of_children`     | `number`  | No       | Number of children.                           |
| `number_of_infants`      | `number`  | No       | Number of infants.                            |
| `number_of_pets`         | `number`  | No       | Number of pets.                               |
| `ignore_calendar`        | `boolean` | No       | Ignore calendar availability.                 |
| `ignore_terms`           | `boolean` | No       | Ignore terms and conditions.                  |
| `ignore_blocks`          | `boolean` | No       | Ignore blocked dates.                         |
| `coupon_code`            | `string`  | No       | Discount coupon code.                         |
| `channel`                | `string`  | No       | Reservation channel (e.g., "direct").         |

### Sample Request
```bash
curl --request POST \
     --url https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/create-reservation \
     --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
     --header 'Content-Type: application/json' \
     --data-raw '{
       "check_in_date_localized": "2025-06-01",
       "check_out_date_localized": "2025-06-07",
       "listing_id": "abc123",
       "source": "website",
       "guests_count": 2,
       "guest_id": "guest123",
       "number_of_adults": 2,
       "number_of_children": 0,
       "number_of_infants": 0,
       "number_of_pets": 0,
       "ignore_calendar": false,
       "ignore_terms": false,
       "ignore_blocks": false,
       "coupon_code": "SUMMER10",
       "channel": "direct"
     }'
```

## Response

### Success Response
On success, the function returns a JSON object containing the reservation details:

```json
{
  "success": true,
  "reservation_id": "reservation-id-in-database",
  "guesty_reservation": {
    "reservationId": "guesty-reservation-id",
    "guest": {
      "_id": "guest-id"
    },
    "status": "reserved",
    // Other fields...
  },
  "database_record": {
    "guest_id": "guest123",
    "status": "awaiting_payment",
    "check_in": "2025-06-01T00:00:00Z",
    "check_out": "2025-06-07T00:00:00Z",
    // Other fields...
  }
}
```

### Error Response
On error, an appropriate JSON response is returned:

- **400**: Validation errors (e.g., missing fields).
- **401**: Missing or invalid authorization.
- **500**: Internal server errors (e.g., Guesty API errors).

#### Sample Error Response
```json
{
  "error": "Guesty Quote API error: 500",
  "details": "Detailed error message from Guesty API."
}
```

---

## Next.js Integration

Here is a sample implementation of how to call this edge function using Next.js:

```typescript name=createReservation.ts
import axios from "axios";

const createReservation = async () => {
  const url = "https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/create-reservation";

  const payload = {
    check_in_date_localized: "2025-06-01",
    check_out_date_localized: "2025-06-07",
    listing_id: "abc123",
    source: "website",
    guests_count: 2,
    guest_id: "guest123",
    number_of_adults: 2,
    number_of_children: 0,
    number_of_infants: 0,
    number_of_pets: 0,
    ignore_calendar: false,
    ignore_terms: false,
    ignore_blocks: false,
    coupon_code: "SUMMER10",
    channel: "direct",
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer YOUR_SUPABASE_ANON_KEY`,
        "Content-Type": "application/json",
      },
    });
    console.log("Reservation created successfully:", response.data);
  } catch (error) {
    console.error("Error creating reservation:", error.response?.data || error.message);
  }
};

export default createReservation;
```

---

## Notes

- Ensure the `Authorization` header contains a valid Supabase token.
- Dates must be provided in `YYYY-MM-DD` format.
- Customize the payload as needed based on your application requirements.

For further details, consult the [Supabase Edge Functions documentation](https://supabase.com/docs/guides/functions).
