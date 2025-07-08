# get-min-days Edge Function

This Supabase Edge Function retrieves the minimum nights required for a booking from the Guesty API for a given listing and date.

## How it works
- Accepts a POST request with a JSON body containing `listingId` and `startDate` (format: `YYYY-MM-DD`).
- Fetches a valid Guesty API token from the `guesty_tokens` table in your Supabase database.
- Calls the Guesty API to get calendar data for the specified listing and date.
- Returns a JSON response with the minimum nights required for that date: `{ "minNights": <number|null> }`.
- Handles CORS for browser and cross-origin requests.

## Request
**POST** `/functions/v1/get-min-days`

### Body
```json
{
  "listingId": "<LISTING_ID>",
  "startDate": "YYYY-MM-DD"
}
```

### Example
```sh
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-min-days' \
  --header 'Authorization: Bearer <your-supabase-anon-key>' \
  --header 'Content-Type: application/json' \
  --data '{"listingId":"YOUR_LISTING_ID","startDate":"2025-07-08"}'
```

## Response
- **Success:**
  ```json
  { "minNights": 4 }
  ```
- **Error:**
  ```json
  { "error": "..." }
  ```

## Environment Variables
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` must be available in your Edge Function environment.

## Notes
- The function expects the Guesty API token to be stored in the `guesty_tokens` table as `access_token`.
- CORS is enabled for all origins and common headers.

---

**Author:** Your Team
