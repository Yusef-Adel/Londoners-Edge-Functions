// Edge function to handle contacting clients via email using SendGrid
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')
const TO_EMAIL = "info@londoners.com"

console.log("Contact Us Functions!")

// Helper function to validate SendGrid API key format
function isValidApiKeyFormat(key: string): boolean {
  return key.startsWith('SG.') && key.length > 20
}

Deno.serve(async (req) => {
  // Validate API key exists and has correct format
  if (!SENDGRID_API_KEY) {
    console.error("SendGrid API key not found in environment variables")
    return new Response(
      JSON.stringify({ error: "Server configuration error: Missing API key" }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    )
  }

  if (!isValidApiKeyFormat(SENDGRID_API_KEY)) {
    console.error("Invalid SendGrid API key format")
    return new Response(
      JSON.stringify({ error: "Server configuration error: Invalid API key format" }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    )
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { 
        status: 405,
        headers: { "Content-Type": "application/json" }
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
        headers: { "Content-Type": "application/json" }
      }
    )
  }

  const { name, email, message, subject } = body

  // Validate required fields
  if (!name || !email || !message) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: name, email, message" }),
      { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      }
    )
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return new Response(
      JSON.stringify({ error: "Invalid email format" }),
      { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      }
    )
  }

  // Prepare email data for SendGrid
  const emailData = {
    personalizations: [
      {
        to: [{ email: TO_EMAIL }],
        subject: subject || `Contact Form Message from ${name}`
      }
    ],
    from: { email: TO_EMAIL },
    reply_to: { email: email },
    content: [
      {
        type: "text/plain",
        value: `Name: ${name}\nEmail: ${email}\nMessage:\n\n${message}`
      },
      {
        type: "text/html",
        value: `
          <h3>New Contact Form Message</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
        `
      }
    ]
  }

  try {
    // Log the request for debugging
    console.log("Sending email via SendGrid API...")
    console.log("To:", TO_EMAIL)
    console.log("From:", email)
    console.log("Subject:", subject || `Contact Form Message from ${name}`)
    
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
        headers: { "Content-Type": "application/json" }
      }
    )

  } catch (error) {
    console.error("Error sending email:", error)
    return new Response(
      JSON.stringify({ 
        error: "Failed to send email",
        details: error.message
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/contact-us' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"John Doe","email":"john@example.com","message":"Hello, I would like to get in touch!","subject":"Contact Request"}'

  Expected JSON body:
  {
    "name": "John Doe",
    "email": "john@example.com", 
    "message": "Your message here",
    "subject": "Optional subject" // If not provided, defaults to "Contact Form Message from {name}"
  }

*/
