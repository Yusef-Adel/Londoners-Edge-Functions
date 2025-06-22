// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

console.log("Get Payment Methods function initialized")

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Parse request body
    const { guestId } = await req.json()

    if (!guestId) {
      return new Response(
        JSON.stringify({ error: 'guestId is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get Guesty access token from database
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('guesty_tokens')
      .select('access_token')
      .single()

    if (tokenError || !tokenData?.access_token) {
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve Guesty access token' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Make request to Guesty API
    const guestyResponse = await fetch(`https://open-api.guesty.com/v1/guests/${guestId}/payment-methods`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    })

    if (!guestyResponse.ok) {
      const errorText = await guestyResponse.text()
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch payment methods from Guesty',
          details: errorText,
          status: guestyResponse.status
        }),
        {
          status: guestyResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const paymentMethodsData = await guestyResponse.json()

    return new Response(
      JSON.stringify({ 
        success: true,
        data: paymentMethodsData 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in get-payment-methods function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-payment-methods' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"guestId":"GUEST_ID_HERE"}'

  3. Expected response:
  {
    "success": true,
    "data": [
      {
        "id": "payment_method_id",
        "type": "card",
        "brand": "visa",
        "last4": "4242",
        "expiryMonth": 12,
        "expiryYear": 2025,
        "isDefault": true,
        "fingerprint": "fingerprint_value"
      }
    ]
  }

  4. Error responses:
  - 400: Missing guestId parameter
  - 404: Guest not found or no payment methods
  - 500: Database or Guesty API error

*/
