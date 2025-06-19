// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

console.log("Get Favorite function loaded!")

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
    const { guesty_user_id } = await req.json()

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
          details: userError.message 
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Check if user has favorites
    if (!userData?.favorites || !Array.isArray(userData.favorites) || userData.favorites.length === 0) {
      return new Response(
        JSON.stringify([]),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

    // Fetch listing details for each favorite
    const listingPromises = userData.favorites.map(async (listingId: string) => {
      try {
        const guestyResponse = await fetch(
          `https://open-api.guesty.com/v1/listings/${listingId}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          }
        )

        if (!guestyResponse.ok) {
          console.error(`Failed to fetch listing ${listingId}:`, guestyResponse.status)
          return null
        }

        const listingData = await guestyResponse.json()
        
        // Transform the response to match the required structure
        return {
          id: listingData._id || listingData.id,
          name: listingData.title || listingData.nickname || 'Untitled Property',
          location: `${listingData.address?.city || ''}, ${listingData.address?.country || ''}`.replace(/^, |, $/, '') || 'Location not available',
          subLocation: listingData.address?.street || listingData.address?.neighborhood || '',
          rating: listingData.avgRating || listingData.rating || 0,
          reviews: listingData.reviewsCount || listingData.reviews || 0,
          bedrooms: listingData.bedrooms || 0,
          beds: listingData.beds || 0,
          baths: listingData.bathrooms || 0,
          guests: listingData.accommodates || listingData.maxGuests || 0,
          images: listingData.pictures?.map((pic: any) => pic.thumbnail || pic.regular || pic.original) || 
                  listingData.images || 
                  ["/placeholder.svg?height=200&width=300"]
        }
      } catch (error) {
        console.error(`Error fetching listing ${listingId}:`, error)
        return null
      }
    })

    // Wait for all listing requests to complete
    const listings = await Promise.all(listingPromises)
    
    // Filter out null results (failed requests)
    const validListings = listings.filter((listing) => listing !== null)

    return new Response(
      JSON.stringify(validListings),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in get-favorite function:', error)
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-favorite' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"guesty_user_id":"USER_GUESTY_ID_HERE"}'

*/
