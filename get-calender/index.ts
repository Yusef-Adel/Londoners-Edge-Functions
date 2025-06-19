// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

console.log("Get Calendar function loaded!")

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
    const { 
      listingId, 
      includeAllotment, 
      ignoreInactiveChildAllotment, 
      ignoreUnlistedChildAllotment 
    } = await req.json()

    // Validate required fields
    if (!listingId) {
      return new Response(
        JSON.stringify({ error: 'listingId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Generate dynamic date range
    const today = new Date()
    const startDate = today.toISOString().split('T')[0] // Today's date in YYYY-MM-DD format
    
    // End of next year (December 31 of next year)
    const nextYear = today.getFullYear() + 1
    const endDate = `${nextYear}-12-31`

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

    // Build query parameters
    const queryParams = new URLSearchParams({
      startDate,
      endDate,
    })

    // Add optional parameters if provided
    if (includeAllotment !== undefined) {
      queryParams.append('includeAllotment', includeAllotment.toString())
    }
    if (ignoreInactiveChildAllotment !== undefined) {
      queryParams.append('ignoreInactiveChildAllotment', ignoreInactiveChildAllotment.toString())
    }
    if (ignoreUnlistedChildAllotment !== undefined) {
      queryParams.append('ignoreUnlistedChildAllotment', ignoreUnlistedChildAllotment.toString())
    }

    // Make request to Guesty Calendar API
    const guestyResponse = await fetch(
      `https://open-api.guesty.com/v1/availability-pricing/api/calendar/listings/${listingId}?${queryParams.toString()}`,
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
      const errorText = await guestyResponse.text()
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch calendar data from Guesty',
          details: errorText,
          status: guestyResponse.status
        }),
        {
          status: guestyResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const calendarData = await guestyResponse.json()

    // Filter only available dates and simplify response
    const availableDates = calendarData.data.days
      .filter(day => day.status === 'available')
      .map(day => ({
        date: day.date,
        status: day.status
      }))

    return new Response(
      JSON.stringify(availableDates),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in get-calendar function:', error)
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-calender' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"listingId":"LISTING_ID_HERE"}'

*/
