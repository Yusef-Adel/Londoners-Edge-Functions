# Send Review Emails - Cron Job Function

## Purpose

This Edge Function is designed to run as a scheduled cron job that automatically sends review request emails to guests 24 hours after they check out from their reservations. It helps collect feedback and ratings from guests who have completed their stay.

## Functionality

The function performs the following operations:

- **Queries the reservations table** for eligible guests based on 3 conditions:
  1. Checkout date was 24+ hours ago (`check_out < NOW - 24 hours`)
  2. Email has not been sent yet (`email_sent = false`)
  3. Reservation is fully paid (`is_fully_paid = true`)

- **Sends a beautifully styled HTML email** via SendGrid with:
  - Personalized greeting with guest's first and last name
  - Listing title of where they stayed
  - Call-to-action button linking to review page with query parameters
  - Confirmation code for reference

- **Updates database** after successful email send (`email_sent = true`, `email_sent_at = timestamp`)

- **Provides detailed logging** for monitoring and debugging

## Environment Variables Required

| Variable | Description |
|----------|-------------|
| `SENDGRID_API_KEY` | SendGrid API key for sending emails (must start with 'SG.') |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for database access (needed for cron jobs) |

## Review Link Format

The email includes a link to: `https://londoner.vercel.app/rate`

**Query Parameters:**
- `listing_id`: The unit_id from reservations table (Guesty listing ID)
- `listing_title`: The unit_title (URL encoded)
- `guest_id`: The guest_id from reservations table

**Example:**
```
https://londoner.vercel.app/rate?listing_id=679b27aefabe790013d94352&listing_title=Be%20More%20Elizabeth!&guest_id=5f8a9b2c3d4e5f6g7h8i9j0k
```

## Database Schema

The function expects a `reservations` table with these columns:

| Column | Type | Description |
|--------|------|-------------|
| `reservation_id` | Primary Key | Auto-generated ID |
| `guesty_reservation_id` | String | Guesty's reservation ID |
| `unit_id` | String | Guesty listing ID |
| `unit_title` | String | Listing title/name |
| `guest_id` | String | Guesty guest ID |
| `guest_email` | String | Guest's email address |
| `guest_firstname` | String | Guest's first name |
| `guest_lastname` | String | Guest's last name |
| `confirmation_code` | String | Reservation confirmation code |
| `check_in` | Timestamp | ISO 8601 datetime |
| `check_out` | Timestamp | ISO 8601 datetime |
| `is_fully_paid` | Boolean | Payment status |
| `email_sent` | Boolean | Email sent flag |
| `email_sent_at` | Timestamp | ISO 8601 datetime (nullable) |
| `status` | String | Reservation status |
| `creation_time` | Timestamp | ISO 8601 datetime |

## Manual Invocation (for testing)

### 1. Deploy the function

```bash
supabase functions deploy send-review
```

### 2. Test in Production

```bash
curl -i --location --request POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-review' \
  --header 'Authorization: Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY' \
  --header 'Content-Type: application/json'
```

### 3. Test Locally

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/send-review' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json'
```

## Setting Up as a Cron Job

### Option 1: Using Supabase pg_cron (Recommended)

Run this SQL in your Supabase SQL Editor:

```sql
SELECT cron.schedule(
  'send-review-emails-daily',
  '0 10 * * *',  -- Runs daily at 10:00 AM UTC
  $$
    SELECT net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-review',
      headers:='{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
    ) AS request_id;
  $$
);
```

#### Managing Cron Jobs

**View scheduled jobs:**
```sql
SELECT * FROM cron.job;
```

**View job run history:**
```sql
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

**Delete a scheduled job:**
```sql
SELECT cron.unschedule('send-review-emails-daily');
```

### Option 2: External Cron Service

Set up a scheduled workflow (GitHub Actions, etc.) that calls the function endpoint with proper authentication.

## Cron Schedule Examples

| Schedule | Description |
|----------|-------------|
| `'0 10 * * *'` | Daily at 10:00 AM UTC |
| `'0 */6 * * *'` | Every 6 hours |
| `'0 0,12 * * *'` | Twice daily (midnight and noon UTC) |
| `'0 9 * * 1-5'` | Weekdays at 9:00 AM UTC |

## Response Format

### Success Response

```json
{
  "success": true,
  "message": "Cron job completed",
  "processed": 5,
  "successful": 4,
  "failed": 1
}
```

### No Reservations to Process

```json
{
  "success": true,
  "message": "No reservations to process",
  "processed": 0
}
```

### Error Response

```json
{
  "success": false,
  "error": "Cron job failed",
  "details": "Error message here"
}
```

## Monitoring & Logging

- All operations are logged to console with emoji indicators (📧, ✅, ❌)
- Check Supabase Edge Function logs in the dashboard
- Monitor `email_sent` and `email_sent_at` columns in reservations table
- Review `cron.job_run_details` table for scheduled execution history

## Features

✅ Automatically sends review emails 24 hours after checkout  
✅ Beautifully styled HTML email template  
✅ Personalized with guest and listing information  
✅ Direct link to review page with all necessary parameters  
✅ Database tracking to prevent duplicate emails  
✅ Detailed logging for debugging and monitoring  
✅ Error handling that doesn't stop processing other reservations  
✅ CORS support for manual triggering from web apps  
✅ Validates SendGrid API key format  
✅ Graceful handling of missing data  

## Troubleshooting

### 1. Emails not sending

- Verify `SENDGRID_API_KEY` is set and valid (starts with 'SG.')
- Check SendGrid dashboard for sender verification
- Review Edge Function logs for SendGrid error messages

### 2. No reservations processed

- Verify reservations exist with `check_out` > 24 hours ago
- Check `is_fully_paid = true` for those reservations
- Ensure `email_sent = false` for eligible reservations

### 3. Database updates failing

- Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Check table permissions for the service role
- Review error logs for constraint violations

### 4. Cron job not running

- Check `cron.job` table for active schedule
- Review `cron.job_run_details` for execution errors
- Verify the Edge Function is deployed

## Email Template Preview

The email sent to guests includes:

- **Blue header** with "How Was Your Stay?" title
- **Personalized greeting** with guest name
- **Property name** where they stayed
- **Prominent CTA button** linking to review page
- **Confirmation code** for reference
- **Fallback link** at the bottom if button doesn't work
- **Professional signature** from The Londoners Team

## Integration with Add-Payment Function

This function works in tandem with the `add-payment` function:

1. **add-payment** stores fully paid reservations in the database after successful payment
2. **send-review** (this function) automatically sends review emails 24 hours after checkout
3. Both functions share the same database schema and environment setup
