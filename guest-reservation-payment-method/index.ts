import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js";

const GUESTY_API_BASE_URL = "https://open-api.guesty.com/v1/guests";

// Function to get the latest valid Guesty token from database
async function getGuestyToken(supabase) {
  const { data: tokens, error } = await supabase
    .from("guesty_tokens")
    .select("access_token")
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Failed to fetch token: ${error.message}`);
  }

  if (!tokens || tokens.length === 0) {
    throw new Error("No Guesty token found. Please generate a token first.");
  }

  return tokens[0].access_token;
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
    const { guestId, reservationId } = requestBody;
    
    if (!guestId) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Missing required field: guestId"
        }),
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }

    if (!reservationId) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Missing required field: reservationId"
        }),
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }

    // Get the Guesty token from database
    const accessToken = await getGuestyToken(supabase);

    // Construct the API URL with query parameters (reuse always false)
    const apiUrl = `${GUESTY_API_BASE_URL}/${guestId}/payment-methods?reservationId=${reservationId}&reuse=false`;

    console.log("Fetching payment methods for guest:", guestId, "reservation:", reservationId);

    // Make request to Guesty API
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Guesty API error:", errorData);
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Failed to fetch payment methods",
          details: errorData
        }),
        { 
          status: response.status,
          headers: corsHeaders
        }
      );
    }

    const paymentMethods = await response.json();

    // Check if payment methods array is empty
    if (!Array.isArray(paymentMethods) || paymentMethods.length === 0) {
      return new Response(
        JSON.stringify({
          status: "success",
          message: "No payment methods found for this guest and reservation",
          data: {
            paymentMethods: [],
            count: 0
          }
        }),
        { 
          status: 200,
          headers: corsHeaders
        }
      );
    }

    console.log(`Found ${paymentMethods.length} payment method(s)`);

    // Extract relevant information from payment methods
    const extractedPaymentMethods = paymentMethods.map(pm => ({
      paymentMethodId: pm._id,
      accountId: pm.accountId,
      paymentProviderId: pm.paymentProviderId,
      status: pm.status,
      guestId: pm.guestId,
      confirmationCode: pm.confirmationCode,
      method: pm.method,
      last4: pm.last4,
      brand: pm.brand,
      type: pm.type,
      createdAt: pm.createdAt,
      updatedAt: pm.updatedAt,
      saveForFutureUse: pm.saveForFutureUse,
      reuse: pm.reuse
    }));

    return new Response(
      JSON.stringify({
        status: "success",
        message: `Retrieved ${paymentMethods.length} payment method(s)`,
        data: {
          paymentMethods: extractedPaymentMethods,
          count: paymentMethods.length,
          fullDetails: paymentMethods // Include full response for reference
        }
      }),
      { 
        status: 200,
        headers: corsHeaders
      }
    );

  } catch (error) {
    console.error("Error in guest reservation payment method:", error.message);
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
