import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js";

const GUESTY_BOOKING_ENGINE_API_BASE_URL = "https://booking.guesty.com/api/reservations/quotes";

// Function to get the latest valid booking engine token from database
async function getBookingEngineToken(supabase) {
  const { data: tokens, error } = await supabase
    .from("guesty_booking_engine_tokens")
    .select("*")
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Failed to fetch token: ${error.message}`);
  }

  if (!tokens || tokens.length === 0) {
    throw new Error("No booking engine token found. Please generate a token first.");
  }

  const latestToken = tokens[0];
  const now = new Date();
  const expiresAt = new Date(latestToken.expires_at);

  // Check if token is expired
  if (expiresAt.getTime() <= now.getTime()) {
    throw new Error("Booking engine token has expired. Please refresh the token.");
  }

  return latestToken.access_token;
}

Deno.serve(async (req) => {
  // CORS headers for all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({
        status: "error",
        message: "Method not allowed. Use POST."
      }),
      { 
        status: 405,
        headers: corsHeaders
      }
    );
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    );

    // Parse request body
    const requestBody = await req.json();
    
    // Validate required fields
    const { quoteId, ratePlanId, ccToken, guest, policy } = requestBody;
    
    if (!quoteId) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Missing required field: quoteId"
        }),
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }

    if (!ratePlanId) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Missing required field: ratePlanId"
        }),
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }

    if (!ccToken) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Missing required field: ccToken (payment token)"
        }),
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }

    if (!guest) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Missing required field: guest object"
        }),
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }

    // Get the booking engine token from database
    const accessToken = await getBookingEngineToken(supabase);

    // Prepare the payload for Guesty API
    const payload = {
      ratePlanId,
      ccToken,
      guest
    };

    // Add optional policy field if provided
    if (policy) {
      payload.policy = policy;
    }

    console.log("Creating instant reservation for quote:", quoteId);

    // Construct the API URL with quoteId
    const apiUrl = `${GUESTY_BOOKING_ENGINE_API_BASE_URL}/${quoteId}/instant`;

    // Make request to Guesty Booking Engine API
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("Guesty API error:", responseData);
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Failed to create instant reservation",
          details: responseData
        }),
        { 
          status: response.status,
          headers: corsHeaders
        }
      );
    }

    console.log("Instant reservation created successfully:", responseData._id);
    console.log("Confirmation code:", responseData.confirmationCode);

    return new Response(
      JSON.stringify({
        status: "success",
        message: "Instant reservation created successfully",
        data: {
          reservationId: responseData._id,
          status: responseData.status,
          platform: responseData.platform,
          confirmationCode: responseData.confirmationCode,
          createdAt: responseData.createdAt,
          guestId: responseData.guestId,
          fullResponse: responseData
        }
      }),
      { 
        status: 200,
        headers: corsHeaders
      }
    );

  } catch (error) {
    console.error("Error in create instant reservation:", error.message);
    return new Response(
      JSON.stringify({
        status: "error",
        message: error.message
      }),
      { 
        status: 500,
        headers: corsHeaders
      }
    );
  }
});
