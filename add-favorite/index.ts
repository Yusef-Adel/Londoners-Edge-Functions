// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

console.log("Add Favorite function loaded!")

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
    const { guestyUserId, listingId } = await req.json()

    // Validate required fields
    if (!guestyUserId) {
      return new Response(
        JSON.stringify({ error: 'guestyUserId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!listingId) {
      return new Response(
        JSON.stringify({ error: 'listingId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // First, get the current user and their favorites
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('favorites')
      .eq('guesty_user_id', guestyUserId)
      .single()

    if (userError) {
      return new Response(
        JSON.stringify({ 
          error: 'User not found or database error',
          details: userError.message 
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get current favorites array or initialize empty array
    let currentFavorites = userData.favorites || []
    
    // Ensure it's an array
    if (!Array.isArray(currentFavorites)) {
      currentFavorites = []
    }

    // Check if listing is already in favorites
    if (currentFavorites.includes(listingId)) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Listing is already in favorites',
          favorites: currentFavorites
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Add the new listing ID to favorites
    const updatedFavorites = [...currentFavorites, listingId]

    // Update the user's favorites in the database
    const { data: updateData, error: updateError } = await supabaseClient
      .from('users')
      .update({ favorites: updatedFavorites })
      .eq('guesty_user_id', guestyUserId)
      .select('favorites')
      .single()

    if (updateError) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to update favorites',
          details: updateError.message 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Listing added to favorites successfully',
        favorites: updateData.favorites
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in add-favorite function:', error)
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/add-favorite' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"guestyUserId":"681a31ffe7bc0d02c5d57505","listingId":"listing_123"}'

*/
