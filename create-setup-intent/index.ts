// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

console.log("Create Setup Intent function started!")

Deno.serve(async (req) => {
  try {
    // Get Stripe secret key from Supabase secrets
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Stripe secret key not configured' }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json" } 
        }
      )
    }

    // Parse request body to get customer information
    const { customer_id, usage, payment_method_types = ['card'] } = await req.json()

    // Prepare setup intent data
    const setupIntentData = new URLSearchParams({
      usage: usage || 'off_session',
      'payment_method_types[]': payment_method_types.join(',')
    })

    // Add customer if provided
    if (customer_id) {
      setupIntentData.append('customer', customer_id)
    }

    // Create setup intent with Stripe
    const stripeResponse = await fetch('https://api.stripe.com/v1/setup_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: setupIntentData.toString()
    })

    if (!stripeResponse.ok) {
      const errorData = await stripeResponse.json()
      console.error('Stripe API error:', errorData)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create setup intent',
          details: errorData
        }),
        { 
          status: stripeResponse.status,
          headers: { "Content-Type": "application/json" } 
        }
      )
    }

    const setupIntent = await stripeResponse.json()

    // Return the client secret
    return new Response(
      JSON.stringify({
        client_secret: setupIntent.client_secret,
        setup_intent_id: setupIntent.id,
        status: setupIntent.status
      }),
      { 
        headers: { "Content-Type": "application/json" } 
      }
    )

  } catch (error) {
    console.error('Error creating setup intent:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/create-setup-intent' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"customer_id":"cus_example123","usage":"off_session","payment_method_types":["card"]}'

  Example Response:
  {
    "client_secret": "seti_1234567890_secret_abcdef",
    "setup_intent_id": "seti_1234567890",
    "status": "requires_payment_method"
  }

  Parameters:
  - customer_id (optional): Stripe customer ID to attach the payment method to
  - usage (optional): How the setup intent will be used. Defaults to "off_session"
  - payment_method_types (optional): Array of payment method types. Defaults to ["card"]

*/
