# Contact Us Edge Function

A Supabase Edge Function that handles contact form submissions by sending emails via SendGrid API.

## Overview

This function receives contact form data via POST request and sends it as an email to the configured recipient using SendGrid's email service.

## Configuration

- **Recipient Email**: `info@londoners.com`
- **SendGrid API**: Uses environment variable `SENDGRID_API_KEY` for secure API key storage
- **Email Format**: Supports both plain text and HTML formats

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
- `Authorization: Bearer <supabase-anon-key>` (for local testing)

### Request Body

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "message": "Your message content here",
  "subject": "Optional subject line"
}
```

### Required Fields
- `name` (string): Sender's full name
- `email` (string): Valid email address of the sender
- `message` (string): The message content

### Optional Fields
- `subject` (string): Email subject line. If not provided, defaults to "Contact Form Message from {name}"

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
  "error": "Missing required fields: name, email, message"
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
  "error": "Failed to send email",
  "details": "Error details here"
}
```

## Email Content

The function sends emails with the following format:

### Subject
- Custom subject if provided
- Default: "Contact Form Message from {sender_name}"

### Content
- **Plain Text**: Formatted with sender details and message
- **HTML**: Nicely formatted HTML with sender information
- **Reply-To**: Set to sender's email address for easy responses

## Validation

The function performs the following validations:

1. **HTTP Method**: Only POST requests are accepted
2. **JSON Format**: Request body must be valid JSON
3. **Required Fields**: `name`, `email`, and `message` must be present
4. **Email Format**: Email address must match standard email regex pattern

## Testing

### Local Testing (with Supabase CLI)

1. Start Supabase locally:
   ```bash
   supabase start
   ```

2. Test the function with curl (see examples below)

### Example curl Commands

#### Basic Contact Form Submission
```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/contact-us' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "name": "John Doe",
    "email": "john@example.com",
    "message": "Hello, I would like to get in touch about your services!",
    "subject": "Service Inquiry"
  }'
```

#### Contact Form with Default Subject
```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/contact-us' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "name": "Jane Smith",
    "email": "jane.smith@example.com",
    "message": "I am interested in learning more about your property listings in London."
  }'
```

#### Test Error Handling - Missing Fields
```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/contact-us' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json' \
  --data '{
    "name": "Test User",
    "email": "test@example.com"
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

#### Test Error Handling - Wrong HTTP Method
```bash
curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/contact-us' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
```

## Production Usage

For production deployment, ensure:

1. **Environment Variables**: Store SendGrid API key securely
2. **CORS Configuration**: Configure appropriate CORS settings
3. **Rate Limiting**: Implement rate limiting to prevent spam
4. **Monitoring**: Set up logging and monitoring for email delivery

## Security Considerations

- **API Key Security**: SendGrid API key is stored securely as a Supabase environment variable
- **Email Validation**: Prevents basic format errors and validates required fields
- **Reply-to Field**: Allows for easy customer communication
- **Error Messages**: Don't expose sensitive configuration information
- **Environment Variables**: Production-ready secure configuration management

## Dependencies

- Supabase Edge Runtime
- SendGrid API (v3)
- Standard Deno/Web APIs (fetch, Response)

## Troubleshooting

### Common Issues

1. **SendGrid API Errors**: Check API key validity and SendGrid account status
2. **Email Not Received**: Verify recipient email and check spam folder
3. **CORS Errors**: Ensure proper CORS configuration for web clients
4. **JSON Parse Errors**: Verify request body format and Content-Type header
5. **Maximum Credits Exceeded**: SendGrid free tier has daily/monthly email limits

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

- Check function logs in Supabase dashboard
- Use console.log statements for debugging (visible in function logs)
- Test with various input combinations to identify issues
