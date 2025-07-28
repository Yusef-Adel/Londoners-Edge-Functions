// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

console.log("Update Reservation Status function loaded!")

// Interface for the request body
interface UpdateReservationStatusRequest {
  reservationId: string
  status: string
}

// Interface for Guesty API response
interface GuestyApiResponse {
  success?: boolean
  [key: string]: any
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json'
  }

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: corsHeaders,
      }
    )
  }

  try {
    // Check authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: corsHeaders,
        }
      )
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Parse request body
    const requestData: UpdateReservationStatusRequest = await req.json()

    // Validate required fields
    if (!requestData.reservationId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: reservationId' }),
        {
          status: 400,
          headers: corsHeaders,
        }
      )
    }

    if (!requestData.status) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: status' }),
        {
          status: 400,
          headers: corsHeaders,
        }
      )
    }

    // Validate status values (based on common Guesty reservation statuses)
    const validStatuses = [
      'confirmed',
      'canceled',
      'inquired',
      'pending',
      'rejected',
      'booked',
      'checked_in',
      'checked_out',
      'expired'
    ]

    if (!validStatuses.includes(requestData.status)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid status value',
          validStatuses: validStatuses
        }),
        {
          status: 400,
          headers: corsHeaders,
        }
      )
    }

    console.log(`Updating reservation ${requestData.reservationId} to status: ${requestData.status}`)

    // Get Guesty access token from database
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('guesty_tokens')
      .select('access_token')
      .single()

    if (tokenError || !tokenData?.access_token) {
      console.error('Error fetching Guesty token:', tokenError)
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve Guesty access token' }),
        {
          status: 500,
          headers: corsHeaders,
        }
      )
    }

    const guestyToken = tokenData.access_token

    // Prepare the request payload
    const updatePayload = {
      status: requestData.status
    }

    console.log('Sending update request to Guesty API:', JSON.stringify(updatePayload))

    // Call Guesty API to update reservation status
    const guestyResponse = await fetch(
      `https://open-api.guesty.com/v1/reservations-v3/${requestData.reservationId}/status`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${guestyToken}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      }
    )

    console.log(`Guesty API response status: ${guestyResponse.status}`)

    if (!guestyResponse.ok) {
      const errorText = await guestyResponse.text()
      console.error('Guesty API error:', errorText)
      return new Response(
        JSON.stringify({ 
          error: `Guesty API error: ${guestyResponse.status}`,
          details: errorText
        }),
        {
          status: guestyResponse.status,
          headers: corsHeaders,
        }
      )
    }

    const guestyResult = await guestyResponse.json()
    console.log('Guesty API response:', JSON.stringify(guestyResult))

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: `Reservation status updated to ${requestData.status}`,
        data: guestyResult
      }),
      {
        status: 200,
        headers: corsHeaders,
      }
    )

  } catch (error) {
    console.error('Error in update-reservation-status function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      {
        status: 500,
        headers: corsHeaders,
      }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/update-reservation-status' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{
      "reservationId": "64b8f2a9e1234567890abcde",
      "status": "confirmed"
    }'

*/

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/update-reservation-status' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{
      "reservationId": "64b8f2a9e1234567890abcde",
      "status": "confirmed"
    }'

*/
