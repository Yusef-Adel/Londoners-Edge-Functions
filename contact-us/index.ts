// Edge function to handle contacting clients via email using SendGrid
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')
const FROM_EMAIL = "info@londoners.com"
const LONDONERS_DOMAIN = "@londoners.com"

console.log("Contact Us Functions!")

// Helper function to validate SendGrid API key format
function isValidApiKeyFormat(key: string): boolean {
  return key.startsWith('SG.') && key.length > 20
}

Deno.serve(async (req) => {
  // CORS headers for all browsers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200 
    })
  }

  // Validate API key exists and has correct format
  if (!SENDGRID_API_KEY) {
    console.error("SendGrid API key not found in environment variables")
    return new Response(
      JSON.stringify({ error: "Server configuration error: Missing API key" }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    )
  }

  if (!isValidApiKeyFormat(SENDGRID_API_KEY)) {
    console.error("Invalid SendGrid API key format")
    return new Response(
      JSON.stringify({ error: "Server configuration error: Invalid API key format" }),
      { 
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    )
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { 
        status: 405,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    )
  }

  let body
  try {
    body = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON" }),
      { 
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    )
  }

  const { name, email, message, subject, use, to, listing_URL } = body

  // Validate 'use' parameter
  if (!use || (use !== 'support' && use !== 'review')) {
    return new Response(
      JSON.stringify({ error: "Missing or invalid 'use' parameter. Must be 'support' or 'review'" }),
      { 
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    )
  }

  // Validate required fields based on use case
  if (use === 'support') {
    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields for support: name, email, message" }),
        { 
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      )
    }
  } else if (use === 'review') {
    if (!to || !listing_URL) {
      return new Response(
        JSON.stringify({ error: "Missing required fields for review: to, listing_URL" }),
        { 
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      )
    }
  }

  // Validate email format if provided
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { 
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      )
    }
  }

  // Determine recipient email based on use case
  let recipientEmail
  
  if (use === 'support') {
    // Support emails always go to info@londoners.com
    recipientEmail = FROM_EMAIL
  } else if (use === 'review') {
    // Review emails: send to the customer's actual email address
    recipientEmail = to
  }

  // Prepare content based on use case
  let emailContent
  let emailSubject

  if (use === 'support') {
    emailSubject = subject || `Support Request from ${name}`
    emailContent = `Hello, this is ${name}. My Email address is ${email}.\n\n${message}`
  } else if (use === 'review') {
    emailSubject = subject || "Thank you for your Review"
    emailContent = `Thank you for your Review on this listing ${listing_URL}`
  }

  // Prepare email data for SendGrid
  const emailData = {
    personalizations: [
      {
        to: [{ email: recipientEmail }],
        subject: emailSubject
      }
    ],
    from: { email: FROM_EMAIL },
    reply_to: email ? { email: email } : undefined,
    content: [
      {
        type: "text/plain",
        value: emailContent
      }
    ]
  }

  try {
    // Log the complete email details for debugging
    console.log("=".repeat(60))
    console.log("📧 EMAIL DEBUG INFO")
    console.log("=".repeat(60))
    console.log("Use case:", use)
    console.log("To:", recipientEmail)
    console.log("From:", FROM_EMAIL)
    console.log("Reply-To:", email || "None")
    console.log("Subject:", emailSubject)
    console.log("-".repeat(60))
    console.log("📝 EMAIL CONTENT:")
    console.log("-".repeat(60))
    console.log(emailContent)
    console.log("=".repeat(60))
    console.log("📦 FULL SENDGRID PAYLOAD:")
    console.log(JSON.stringify(emailData, null, 2))
    console.log("=".repeat(60))
    
    // Send email via SendGrid API
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(emailData)
    })

    console.log("SendGrid response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("SendGrid API error response:", errorText)
      
      // Handle specific error codes
      if (response.status === 401) {
        throw new Error("SendGrid API authentication failed. Please check your API key.")
      } else if (response.status === 403) {
        throw new Error("SendGrid API access forbidden. Please check your API key permissions.")
      } else if (response.status === 400) {
        // Parse the error response to check for specific SendGrid errors
        try {
          const errorData = JSON.parse(errorText)
          if (errorData.errors && errorData.errors.length > 0) {
            const firstError = errorData.errors[0]
            if (firstError.message && firstError.message.includes("Maximum credits exceeded")) {
              throw new Error("SendGrid account has exceeded its email quota. Please upgrade your SendGrid plan or wait for the quota to reset.")
            } else if (firstError.message && firstError.message.includes("sender identity")) {
              throw new Error("SendGrid sender identity not verified. Please verify your sender email in SendGrid dashboard.")
            } else {
              throw new Error(`SendGrid error: ${firstError.message}`)
            }
          }
        } catch (parseError) {
          // If we can't parse the error, fall back to the original error text
        }
        throw new Error(`SendGrid API bad request: ${errorText}`)
      } else {
        throw new Error(`SendGrid API error: ${response.status} - ${errorText}`)
      }
    }

    console.log("Email sent successfully via SendGrid")
    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Email sent successfully"
      }),
      { 
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    )

  } catch (error) {
    console.error("Error sending email:", error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ 
        error: "Failed to send email",
        details: errorMessage
      }),
      { 
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  Example 1: Support Use Case
  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/contact-us' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{
      "use": "support",
      "name": "John Doe",
      "email": "john@example.com",
      "message": "I need help with my booking",
      "to": "support@anydomain.com",
      "subject": "Support Request"
    }'

  Example 2: Review Use Case
  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/contact-us' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{
      "use": "review",
      "to": "customer@anydomain.com",
      "listing_URL": "https://londoners.com/listings/123",
      "subject": "Thank you for your review"
    }'

  Expected JSON body for SUPPORT:
  {
    "use": "support",              // Required: "support" or "review"
    "name": "John Doe",            // Required for support
    "email": "john@example.com",   // Required for support (customer's email)
    "message": "Your message",     // Required for support
    "subject": "Optional subject"  // Optional
  }

  Expected JSON body for REVIEW:
  {
    "use": "review",                                  // Required: "support" or "review"
    "to": "customer@anydomain.com",                  // Required (domain will be replaced with @londoners.com)
    "listing_URL": "https://londoners.com/listing",  // Required for review
    "subject": "Optional subject"                     // Optional
  }

  Notes:
  - SUPPORT emails: Customer emails go TO info@londoners.com, customer's email becomes REPLY-TO
  - REVIEW emails: Domain in 'to' is replaced with @londoners.com (e.g., customer@gmail.com → customer@londoners.com)
  - From email is always "info@londoners.com"

*/
