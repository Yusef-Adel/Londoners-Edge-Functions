// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

console.log("Get Reservation by ID function initialized")

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Function to get a valid Guesty token from the database
async function getGuestyToken() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: tokens, error } = await supabase
    .from("guesty_tokens")
    .select("access_token")
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw new Error(`Failed to fetch token: ${error.message}`);
  if (!tokens || tokens.length === 0) throw new Error("No Guesty token available");

  console.log("Successfully retrieved Guesty token");
  return tokens[0].access_token;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Check if it's a POST request
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405,
          headers: { 
            ...corsHeaders,
            'Allow': 'POST'
          } 
        }
      );
    }

    // Parse request body
    const requestBody = await req.json();
    console.log("Received request body:", JSON.stringify(requestBody));

    const { id } = requestBody;

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Reservation ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get the Guesty token from the database
    const guestyToken = await getGuestyToken();

    // Build query parameters - request specific fields: status and money
    const fields = "status money";
    const queryString = `?fields=${encodeURIComponent(fields)}`;
    
    // Make request to Guesty API
    const apiUrl = `https://open-api.guesty.com/v1/reservations/${id}${queryString}`;
    console.log("Making request to Guesty API:", apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${guestyToken}`,
      },
    });

    console.log(`Guesty API response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Guesty API error response:", errorText);
      
      // Handle specific error cases
      if (response.status === 404) {
        return new Response(
          JSON.stringify({ 
            status: "error",
            message: 'Reservation not found', 
            details: `No reservation found with ID: ${id}`
          }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      throw new Error(`Guesty API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    // Get response data from Guesty
    const reservationData = await response.json();
    console.log(`Successfully retrieved reservation:`, {
      id: reservationData._id,
      confirmationCode: reservationData.confirmationCode,
      status: reservationData.status,
      hasMoney: !!reservationData.money
    });

    // Extract status and isFullyPaid
    const reservationStatus = reservationData.status || null;
    const isFullyPaid = reservationData.money?.isFullyPaid || false;

    // Return only status and isFullyPaid
    return new Response(
      JSON.stringify({
        status: reservationStatus,
        isFullyPaid: isFullyPaid
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in get-reservation-id function:', error);
    
    return new Response(
      JSON.stringify({ 
        status: "error",
        message: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  Get reservation by ID:
  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-reservation-id' \
    --header 'Content-Type: application/json' \
    --data '{"id":"your-reservation-id"}'

  Example with actual reservation ID:
  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-reservation-id' \
    --header 'Content-Type: application/json' \
    --data '{"id":"67890abc12345def67890abc"}'

*/
