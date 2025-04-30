// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || ""
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const supabase = createClient(supabaseUrl, supabaseKey)

async function getGuestyToken() {
  const { data: tokens, error } = await supabase
    .from("guesty_tokens")
    .select("access_token")
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) throw new Error(`Failed to fetch token: ${error.message}`)
  if (!tokens || tokens.length === 0) throw new Error("No token available")

  return tokens[0].access_token
}

serve(async (req) => {
  try {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json'
    }

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      })
    }

    // Verify request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: corsHeaders }
      )
    }

    // Get listing ID from request body
    const { id } = await req.json()

    if (!id) {
      return new Response(
        JSON.stringify({ error: "Listing ID is required in request body" }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Get Guesty access token
    const guestyToken = await getGuestyToken()

    // Fetch listing from Guesty API
    const response = await fetch(
      `https://open-api.guesty.com/v1/listings/${id}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${guestyToken}`,
          'Accept': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Guesty API error: ${response.statusText}`)
    }

    const listingData = await response.json()

    return new Response(
      JSON.stringify({
        status: "success",
        data: listingData
      }),
      { 
        status: 200,
        headers: corsHeaders
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({
        status: "error",
        message: error.message
      }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/Retrieve-listing-byID' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
