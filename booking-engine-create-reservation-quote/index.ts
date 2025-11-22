import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js";

const GUESTY_BOOKING_ENGINE_API_URL = "https://booking.guesty.com/api/reservations/quotes";

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
    const { guestsCount, checkInDateLocalized, checkOutDateLocalized, listingId, coupons } = requestBody;
    
    if (!guestsCount || !checkInDateLocalized || !checkOutDateLocalized || !listingId) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Missing required fields. Required: guestsCount, checkInDateLocalized, checkOutDateLocalized, listingId"
        }),
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(checkInDateLocalized) || !dateRegex.test(checkOutDateLocalized)) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Invalid date format. Use YYYY-MM-DD format."
        }),
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }

    // Validate that check-out is after check-in
    if (new Date(checkOutDateLocalized) <= new Date(checkInDateLocalized)) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Check-out date must be after check-in date."
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
      guestsCount,
      checkInDateLocalized,
      checkOutDateLocalized,
      listingId
    };

    // Add optional coupons field if provided
    if (coupons) {
      payload.coupons = coupons;
    }

    console.log("Creating reservation quote with payload:", payload);

    // Make request to Guesty Booking Engine API
    const response = await fetch(GUESTY_BOOKING_ENGINE_API_URL, {
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
          message: "Failed to create reservation quote",
          details: responseData
        }),
        { 
          status: response.status,
          headers: corsHeaders
        }
      );
    }

    console.log("Reservation quote created successfully:", responseData._id);

    return new Response(
      JSON.stringify({
        status: "success",
        message: "Reservation quote created successfully",
        data: responseData
      }),
      { 
        status: 200,
        headers: corsHeaders
      }
    );

  } catch (error) {
    console.error("Error in create reservation quote:", error.message);
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
