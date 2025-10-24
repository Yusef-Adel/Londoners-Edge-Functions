# Contact Us Edge Function

A Supabase Edge Function that handles dynamic email sending via SendGrid API with two distinct use cases: **Support** and **Review**.

## Overview

This function receives request data via POST and sends emails using SendGrid's email service. It supports two use cases:
1. **Support**: Customers send support requests to `info@londoners.com`
2. **Review**: Send thank you emails to customers for their reviews

The function includes comprehensive CORS support for cross-origin requests from web browsers.

## Use Cases

### 1. Support Use Case
- **Purpose**: Handle customer support requests
- **Recipient**: Always `info@londoners.com` (business support team)
- **Reply-To**: Customer's email address (for easy responses)
- **Content**: Formatted message with customer name, email, and message body

### 2. Review Use Case
- **Purpose**: Send thank you emails to customers after they leave a review
- **Recipient**: Customer's actual email address
- **From**: `info@londoners.com`
- **Content**: Thank you message with listing URL

## CORS Support

The function includes full CORS (Cross-Origin Resource Sharing) support:
- **Access-Control-Allow-Origin**: `*` (allows requests from any domain)
- **Access-Control-Allow-Methods**: `POST, OPTIONS`
- **Access-Control-Allow-Headers**: Includes authorization, content-type, and Supabase headers
- **Preflight Requests**: Automatically handles OPTIONS requests for browser compatibility

This allows the function to be called from web applications hosted on different domains.

## Configuration

- **From Email**: `info@londoners.com` (all emails sent from this address)
- **SendGrid API**: Uses environment variable `SENDGRID_API_KEY` for secure API key storage
- **Email Format**: Plain text format
- **API Key Validation**: Checks for valid SendGrid API key format (must start with `SG.` and be > 20 characters)

## Environment Variables

This function requires the following environment variable to be set in Supabase:

```
SENDGRID_API_KEY=your_sendgrid_api_key_here
```

To set this in Supabase:
1. Go to your Supabase project dashboard
2. Navigate to **Settings** > **Edge Functions** > **Secrets**
3. Add a new secret with name `SENDGRID_API_KEY` and your SendGrid API key as the value

## API Endpoint

```
POST /functions/v1/contact-us
```

## Request Format

### Headers
- `Content-Type: application/json`
- `Authorization: Bearer <supabase-anon-key>` (optional for production, required for local testing)

### Request Body - Support Use Case

```json
{
  "use": "support",
  "name": "John Doe",
  "email": "john@example.com",
  "message": "Your message content here",
  "subject": "Optional subject line"
}
```

#### Required Fields (Support)
- `use` (string): Must be `"support"`
- `name` (string): Customer's full name
- `email` (string): Valid email address of the customer
- `message` (string): The message content

#### Optional Fields (Support)
- `subject` (string): Email subject line. If not provided, defaults to "Support Request from {name}"

### Request Body - Review Use Case

```json
{
  "use": "review",
  "to": "customer@example.com",
  "listing_URL": "https://londoners.com/listings/123",
  "subject": "Optional subject line"
}
```

#### Required Fields (Review)
- `use` (string): Must be `"review"`
- `to` (string): Customer's email address (where the thank you email will be sent)
- `listing_URL` (string): URL of the listing being reviewed

#### Optional Fields (Review)
- `subject` (string): Email subject line. If not provided, defaults to "Thank you for your Review"

## Response Format

### Success Response (200)
```json
{
  "success": true,
  "message": "Email sent successfully"
}
```

### Error Responses

#### 400 - Bad Request
```json
{
  "error": "Missing or invalid 'use' parameter. Must be 'support' or 'review'"
}
```

```json
{
  "error": "Missing required fields for support: name, email, message"
}
```

```json
{
  "error": "Missing required fields for review: to, listing_URL"
}
```

```json
{
  "error": "Invalid email format"
}
```

```json
{
  "error": "Invalid JSON"
}
```

#### 405 - Method Not Allowed
```json
{
  "error": "Method not allowed"
}
```

#### 500 - Internal Server Error
```json
{
  "error": "Server configuration error: Missing API key"
}
```

```json
{
  "error": "Server configuration error: Invalid API key format"
}
```

```json
{
  "error": "Failed to send email",
  "details": "Error details here"
}
```

## Email Content

### Support Use Case

**Recipient**: `info@londoners.com` (always)  
**From**: `info@londoners.com`  
**Reply-To**: Customer's email address (for easy responses)  

**Subject**:
- Custom subject if provided
- Default: "Support Request from {customer_name}"

**Content** (Plain Text):
```
Hello, this is {customer_name}. My Email address is {customer_email}.

{customer_message}
```

### Review Use Case

**Recipient**: Customer's actual email address (from `to` field)  
**From**: `info@londoners.com`  
**Reply-To**: Not set (optional, only for support emails)  

**Subject**:
- Custom subject if provided
- Default: "Thank you for your Review"

**Content** (Plain Text):
```
Thank you for your Review on this listing {listing_URL}
```

## Validation

The function performs the following validations:

1. **HTTP Method**: Only POST requests are accepted
2. **JSON Format**: Request body must be valid JSON
3. **Use Parameter**: Must be either `"support"` or `"review"`
4. **Support Required Fields**: `name`, `email`, and `message` must be present
5. **Review Required Fields**: `to` and `listing_URL` must be present
6. **Email Format**: Email address must match standard email regex pattern (when provided)
7. **API Key Validation**: SendGrid API key must start with `SG.` and be > 20 characters

## Testing

### Local Testing (with Supabase CLI)

1. Start Supabase locally:
   ```bash
   supabase start
   ```

2. Test the function with curl (see examples below)

### Example curl Commands

#### Support Use Case - Basic Support Request
```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/contact-us' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "use": "support",
    "name": "John Doe",
    "email": "john@example.com",
    "message": "I need help with my booking reservation #12345",
    "subject": "Booking Assistance Needed"
  }'
```

#### Support Use Case - With Default Subject
```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/contact-us' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "use": "support",
    "name": "Jane Smith",
    "email": "jane.smith@example.com",
    "message": "I am interested in learning more about your property listings in London."
  }'
```

#### Review Use Case - Thank Customer for Review
```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/contact-us' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "use": "review",
    "to": "customer@example.com",
    "listing_URL": "https://londoners.vercel.app/all-listings/679b235b2e9626001105b891",
    "subject": "Thank you for your wonderful review!"
  }'
```

#### Review Use Case - With Default Subject
```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/contact-us' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "use": "review",
    "to": "customer@gmail.com",
    "listing_URL": "https://londoners.com/listings/luxury-apartment-123"
  }'
```

#### Test Error Handling - Missing Use Parameter
```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/contact-us' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "name": "Test User",
    "email": "test@example.com",
    "message": "Test message"
  }'
```

#### Test Error Handling - Missing Support Fields
```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/contact-us' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "use": "support",
    "name": "Test User",
    "email": "test@example.com"
  }'
```

#### Test Error Handling - Missing Review Fields
```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/contact-us' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "use": "review",
    "to": "customer@example.com"
  }'
```

#### Test Error Handling - Invalid Email
```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/contact-us' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "name": "Test User",
    "email": "invalid-email",
    "message": "Test message"
  }'
```

#### Test CORS Preflight Request
```bash
curl -i --location --request OPTIONS 'http://127.0.0.1:54321/functions/v1/contact-us' \
  --header 'Access-Control-Request-Method: POST' \
  --header 'Access-Control-Request-Headers: content-type,authorization' \
  --header 'Origin: https://example.com'
```

#### Test from JavaScript (Browser)

**Support Use Case:**
```javascript
fetch('http://127.0.0.1:54321/functions/v1/contact-us', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-supabase-anon-key'
  },
  body: JSON.stringify({
    use: 'support',
    name: 'John Doe',
    email: 'john@example.com',
    message: 'Hello, I need assistance with my booking!',
    subject: 'Booking Support'
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```

**Review Use Case:**
```javascript
fetch('http://127.0.0.1:54321/functions/v1/contact-us', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-supabase-anon-key'
  },
  body: JSON.stringify({
    use: 'review',
    to: 'customer@example.com',
    listing_URL: 'https://londoners.com/listings/beautiful-apartment-456',
    subject: 'Thank you for your review!'
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```

## Production Usage

For production deployment, ensure:

1. **Environment Variables**: Store SendGrid API key securely in Supabase secrets
2. **CORS Configuration**: Currently configured for wildcard (`*`), consider restricting to specific domains
3. **Rate Limiting**: Implement rate limiting to prevent spam and abuse
4. **Monitoring**: Set up logging and monitoring for email delivery
5. **Sender Verification**: Verify `info@londoners.com` in SendGrid dashboard
6. **Domain Authentication**: Set up domain authentication in SendGrid for better deliverability
7. **Email Templates**: Consider using SendGrid templates for consistent branding

## Email Routing Summary

| Use Case | From | To | Reply-To | Purpose |
|----------|------|-----|----------|---------|
| **Support** | `info@londoners.com` | `info@londoners.com` | Customer's email | Customer support requests |
| **Review** | `info@londoners.com` | Customer's email | None | Thank you for reviews |

## Security Considerations

- **API Key Security**: SendGrid API key is stored securely as a Supabase environment variable
- **API Key Validation**: Function validates API key format before use (must start with `SG.` and be > 20 characters)
- **Email Validation**: Prevents basic format errors and validates required fields
- **Use Case Validation**: Ensures only valid use cases (`support` or `review`) are accepted
- **Reply-to Field**: For support emails, allows for easy customer communication
- **Error Messages**: Don't expose sensitive configuration information
- **Environment Variables**: Production-ready secure configuration management
- **Comprehensive Logging**: Detailed debug logging for troubleshooting (including email content, recipient, subject)

## Dependencies

- Supabase Edge Runtime
- SendGrid API (v3)
- Standard Deno/Web APIs (fetch, Response)

## Troubleshooting

### Common Issues

1. **SendGrid API Errors**: Check API key validity, format, and SendGrid account status
2. **Email Not Received**: Verify recipient email and check spam folder
3. **CORS Errors**: Ensure proper CORS configuration for web clients
4. **JSON Parse Errors**: Verify request body format and Content-Type header
5. **Maximum Credits Exceeded**: SendGrid free tier has daily/monthly email limits
6. **Missing Use Parameter**: Ensure `use` field is set to `"support"` or `"review"`
7. **Invalid API Key Format**: API key must start with `SG.` and be longer than 20 characters
8. **Sender Identity Not Verified**: Verify `info@londoners.com` in SendGrid dashboard

#### SendGrid Quota Issues

If you receive "Maximum credits exceeded" error:

- **Free Tier**: SendGrid free accounts have a limit of 100 emails per day
- **Solution 1**: Wait 24 hours for the quota to reset
- **Solution 2**: Upgrade your SendGrid plan for higher limits
- **Solution 3**: Use a different email service provider
- **Check Usage**: Login to SendGrid dashboard to view current usage

#### SendGrid Account Setup

For production use, ensure:
1. **Verify Sender Identity**: Verify your sender email (`info@londoners.com`) in SendGrid
2. **Domain Authentication**: Set up domain authentication for better deliverability
3. **Monitor Usage**: Keep track of your email quota and usage

### Debugging

- Check function logs in Supabase dashboard for detailed debug information
- Function logs include:
  - Email use case (support or review)
  - Recipient email address
  - From email address
  - Reply-To email (for support)
  - Email subject
  - Email content (full message text)
  - Full SendGrid payload (JSON)
- Use console.log statements for additional debugging (visible in function logs)
- Test with various input combinations to identify issues
- Verify SendGrid API responses in logs
