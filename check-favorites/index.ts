// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

console.log("Check Favorites function loaded!")

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // Get request body
    const { guesty_user_id, listing_id } = await req.json()

    // Validate required fields
    if (!guesty_user_id) {
      return new Response(
        JSON.stringify({ error: 'guesty_user_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!listing_id) {
      return new Response(
        JSON.stringify({ error: 'listing_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get user's favorites from database
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('favorites')
      .eq('guesty_user_id', guesty_user_id)
      .single()

    if (userError) {
      return new Response(
        JSON.stringify({ 
          error: 'User not found or failed to fetch user data',
          details: userError.message,
          isFavorite: false
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Check if user has favorites and if the listing_id exists in the favorites array
    let isFavorite = false
    if (userData?.favorites && Array.isArray(userData.favorites)) {
      isFavorite = userData.favorites.includes(listing_id)
    }

    return new Response(
      JSON.stringify({ isFavorite }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in check-favorites function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message,
        isFavorite: false
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/check-favorites' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"guesty_user_id":"USER_GUESTY_ID_HERE","listing_id":"LISTING_ID_HERE"}'

  Example response:
  {
    "isFavorite": true
  }

*/
