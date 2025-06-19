// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

console.log("Delete Favorite function loaded!")

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
    const { guesty_user_id, listingId } = await req.json()

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

    if (!listingId) {
      return new Response(
        JSON.stringify({ error: 'listingId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get current user's favorites
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('favorites')
      .eq('guesty_user_id', guesty_user_id)
      .single()

    if (userError) {
      return new Response(
        JSON.stringify({ 
          error: 'User not found or failed to fetch user data',
          details: userError.message 
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Initialize favorites array if null or undefined
    let currentFavorites = userData?.favorites || []
    
    // Ensure favorites is an array
    if (!Array.isArray(currentFavorites)) {
      currentFavorites = []
    }

    // Check if listing exists in favorites
    if (!currentFavorites.includes(listingId)) {
      return new Response(
        JSON.stringify({ 
          error: 'Listing not found in user favorites',
          favorites: currentFavorites 
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Remove the listing from favorites
    const updatedFavorites = currentFavorites.filter(id => id !== listingId)

    // Update the user's favorites in the database
    const { data: updateData, error: updateError } = await supabaseClient
      .from('users')
      .update({ favorites: updatedFavorites })
      .eq('guesty_user_id', guesty_user_id)
      .select('favorites')
      .single()

    if (updateError) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to update user favorites',
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
        message: 'Listing removed from favorites successfully',
        listingId: listingId,
        favorites: updateData.favorites
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in delete-favorite function:', error)
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/delete-favorite' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"guesty_user_id":"USER_GUESTY_ID_HERE","listingId":"LISTING_ID_TO_REMOVE"}'

*/
