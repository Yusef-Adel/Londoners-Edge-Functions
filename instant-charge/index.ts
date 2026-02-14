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
    const { 
      quoteId, 
      ratePlanId, 
      confirmationToken, 
      initialPaymentMethodId,
      guest, 
      policy,
      notes,
      reservedUntil,
      reuse
    } = requestBody;
    
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

    // Validate that either confirmationToken or initialPaymentMethodId is provided
    if (!confirmationToken && !initialPaymentMethodId) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Either confirmationToken (for Stripe) or initialPaymentMethodId (for other providers) is required"
        }),
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }

    // Validate that both are not provided at the same time
    if (confirmationToken && initialPaymentMethodId) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Cannot provide both confirmationToken and initialPaymentMethodId. Use only one."
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

    // Validate guest object has required fields
    if (!guest.firstName || !guest.lastName || !guest.email) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Guest object must include firstName, lastName, and email"
        }),
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }

    // Validate reservedUntil if provided
    if (reservedUntil !== undefined && reservedUntil !== null) {
      const validValues = [-1, 12, 24, 36, 48, 72];
      if (!validValues.includes(reservedUntil)) {
        return new Response(
          JSON.stringify({
            status: "error",
            message: "reservedUntil must be one of: -1, 12, 24, 36, 48, 72"
          }),
          { 
            status: 400,
            headers: corsHeaders
          }
        );
      }
    }

    // Get the booking engine token from database
    const accessToken = await getBookingEngineToken(supabase);

    // Prepare the payload for Guesty API
    const payload: any = {
      ratePlanId,
      guest
    };

    // Add payment method fields
    if (confirmationToken) {
      payload.confirmationToken = confirmationToken;
    }
    
    if (initialPaymentMethodId) {
      payload.initialPaymentMethodId = initialPaymentMethodId;
    }

    // Add optional fields with defaults
    payload.reservedUntil = reservedUntil ?? 12;
    payload.reuse = reuse ?? false;

    // Add optional objects if provided
    if (policy) {
      payload.policy = policy;
    }

    if (notes) {
      payload.notes = notes;
    }

    console.log("Creating instant charge reservation for quote:", quoteId);

    // Construct the API URL with quoteId
    const apiUrl = `${GUESTY_BOOKING_ENGINE_API_BASE_URL}/${quoteId}/instant-charge`;

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
          message: "Failed to create instant charge reservation",
          details: responseData
        }),
        { 
          status: response.status,
          headers: corsHeaders
        }
      );
    }

    console.log("Instant charge reservation created successfully:", responseData._id);
    console.log("Confirmation code:", responseData.confirmationCode);

    return new Response(
      JSON.stringify({
        status: "success",
        message: "Instant charge reservation created successfully",
        data: {
          reservationId: responseData._id,
          status: responseData.status,
          platform: responseData.platform,
          confirmationCode: responseData.confirmationCode,
          createdAt: responseData.createdAt,
          guestId: responseData.guestId,
          listingId: responseData.listingId,
          checkIn: responseData.checkIn,
          checkOut: responseData.checkOut,
          pricing: responseData.money,
          fullResponse: responseData
        }
      }),
      { 
        status: 200,
        headers: corsHeaders
      }
    );

  } catch (error) {
    console.error("Error in create instant charge reservation:", error.message);
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
