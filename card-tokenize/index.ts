// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

console.log("Card Tokenize function initialized")

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Interface for card data
interface Card {
  number: string
  exp_month: string
  exp_year: string
  cvc: string
}

// Interface for billing address
interface BillingAddress {
  line1: string
  city: string
  postal_code: string
  country: string
}

// Interface for billing details
interface BillingDetails {
  name: string
  address: BillingAddress
}

// Interface for 3DS data
interface ThreeDS {
  amount: number
  currency: string
}

// Interface for request body
interface TokenizeRequest {
  listingId: string
  card: Card
  billing_details: BillingDetails
  threeDS?: ThreeDS
}

/**
 * Retrieves a valid Guesty Booking Engine access token from the database
 */
async function getGuestyToken(supabase: any): Promise<string> {
  const { data, error } = await supabase
    .from('guesty_tokens')
    .select('access_token, expires_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    throw new Error('No Guesty token found in database. Please generate a token first.')
  }

  // Check if token is expired (with 5 minute buffer)
  const expiresAt = new Date(data.expires_at)
  const now = new Date()
  const bufferTime = 5 * 60 * 1000 // 5 minutes in milliseconds

  if (expiresAt.getTime() - now.getTime() < bufferTime) {
    throw new Error('Guesty token has expired. Please refresh the token.')
  }

  return data.access_token
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ 
          error: 'Method not allowed',
          message: 'This endpoint only accepts POST requests' 
        }),
        { 
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Parse request body
    const requestData: TokenizeRequest = await req.json()
    console.log('Received tokenization request for listing:', requestData.listingId)

    // Validate required fields
    if (!requestData.listingId) {
      return new Response(
        JSON.stringify({ 
          error: 'Validation error',
          message: 'listingId is required' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!requestData.card) {
      return new Response(
        JSON.stringify({ 
          error: 'Validation error',
          message: 'card object is required' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate card fields
    const { card } = requestData
    if (!card.number || !card.exp_month || !card.exp_year || !card.cvc) {
      return new Response(
        JSON.stringify({ 
          error: 'Validation error',
          message: 'card must include number, exp_month, exp_year, and cvc' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!requestData.billing_details) {
      return new Response(
        JSON.stringify({ 
          error: 'Validation error',
          message: 'billing_details is required' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate billing details
    const { billing_details } = requestData
    if (!billing_details.name || !billing_details.address) {
      return new Response(
        JSON.stringify({ 
          error: 'Validation error',
          message: 'billing_details must include name and address' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate billing address
    const { address } = billing_details
    if (!address.line1 || !address.city || !address.postal_code || !address.country) {
      return new Response(
        JSON.stringify({ 
          error: 'Validation error',
          message: 'billing_details.address must include line1, city, postal_code, and country' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get Guesty token from database
    console.log('Retrieving Guesty token from database...')
    const accessToken = await getGuestyToken(supabaseClient)
    console.log('Successfully retrieved Guesty token')

    // Prepare payload for Guesty API
    const guestyPayload: any = {
      listingId: requestData.listingId,
      card: {
        number: card.number,
        exp_month: card.exp_month,
        exp_year: card.exp_year,
        cvc: card.cvc
      },
      billing_details: {
        name: billing_details.name,
        address: {
          line1: address.line1,
          city: address.city,
          postal_code: address.postal_code,
          country: address.country
        }
      }
    }

    // Add optional threeDS if provided
    if (requestData.threeDS) {
      guestyPayload.threeDS = {
        amount: requestData.threeDS.amount,
        currency: requestData.threeDS.currency
      }
    }

    console.log('Calling Guesty tokenization API...')

    // Call Guesty tokenization API
    const guestyResponse = await fetch('https://pay.guesty.com/api/tokenize/v2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(guestyPayload)
    })

    const guestyData = await guestyResponse.json()

    if (!guestyResponse.ok) {
      console.error('Guesty API error:', guestyData)
      return new Response(
        JSON.stringify({ 
          error: 'Guesty API error',
          message: 'Failed to tokenize card',
          details: guestyData
        }),
        { 
          status: guestyResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Card tokenization successful')

    // Return the tokenization response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Card tokenized successfully',
        data: guestyData
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in card-tokenize function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

/* To invoke:

  curl -i --location --request POST 'https://YOUR_PROJECT.supabase.co/functions/v1/card-tokenize' \
    --header 'Authorization: Bearer YOUR_ANON_KEY' \
    --header 'Content-Type: application/json' \
    --data '{
      "listingId": "679b0ea4cb8d6900130ed2c5",
      "card": {
        "number": "4054332827516075",
        "exp_month": "12",
        "exp_year": "2029",
        "cvc": "437"
      },
      "billing_details": {
        "name": "Bishoy Osama",
        "address": {
          "line1": "Cairo Street",
          "city": "Alex",
          "postal_code": "21611",
          "country": "Egypt"
        }
      },
      "threeDS": {
        "amount": 1,
        "currency": "USD"
      }
    }'

*/
