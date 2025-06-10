// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

interface PaymentMethodRequest {
  guestId: string;
  stripeCardToken: string;
  skipSetupIntent?: boolean;
  paymentProviderId?: string;
  reservationId?: string;
  reuse?: boolean;
}

console.log("Create Payment Method Function Loaded!")

Deno.serve(async (req) => {
  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      });
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      );
    }

    // Parse request body
    const requestBody: PaymentMethodRequest = await req.json();

    // Validate required parameters
    if (!requestBody.guestId) {
      return new Response(
        JSON.stringify({ error: 'guestId is required' }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      );
    }

    if (!requestBody.stripeCardToken) {
      return new Response(
        JSON.stringify({ error: 'stripeCardToken is required' }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      );
    }

    // Get Supabase URL and key from environment
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get Guesty token from the database
    const { data: tokenData, error: tokenError } = await supabase
      .from("guesty_tokens")
      .select("access_token")
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (tokenError || !tokenData?.access_token) {
      console.error("Error fetching Guesty token:", tokenError);
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve Guesty API token' }),
        { 
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      );
    }

    const guestyApiToken = tokenData.access_token;

    // Prepare payload for Guesty API
    const guestyPayload: any = {
      stripeCardToken: requestBody.stripeCardToken,
      skipSetupIntent: requestBody.skipSetupIntent ?? false,
      reuse: requestBody.reuse ?? false
    };

    // Add optional parameters if provided
    if (requestBody.paymentProviderId) {
      guestyPayload.paymentProviderId = requestBody.paymentProviderId;
    }

    if (requestBody.reservationId) {
      guestyPayload.reservationId = requestBody.reservationId;
    }

    console.log(`Creating payment method for guest: ${requestBody.guestId}`);

    // Call Guesty API
    const guestyResponse = await fetch(
      `https://open-api.guesty.com/v1/guests/${requestBody.guestId}/payment-methods`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${guestyApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(guestyPayload),
      }
    );

    const responseData = await guestyResponse.json();

    if (!guestyResponse.ok) {
      console.error('Guesty API error:', responseData);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create payment method',
          details: responseData 
        }),
        { 
          status: guestyResponse.status,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      );
    }

    console.log('Payment method created successfully');

    return new Response(
      JSON.stringify({
        success: true,
        data: responseData
      }),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );

  } catch (error) {
    console.error('Error in create-payment-method function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Ensure your Guesty API token is stored in the `guesty_tokens` table with `access_token` column
  3. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/create-payment-method' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{
      "guestId": "your-guest-id",
      "stripeCardToken": "your-stripe-card-token",
      "skipSetupIntent": false,
      "paymentProviderId": "your-payment-provider-id",
      "reservationId": "your-reservation-id",
      "reuse": false
    }'

  Required parameters:
  - guestId: Guest ID from Guesty
  - stripeCardToken: ID from Stripe payment method

  Optional parameters:
  - skipSetupIntent: boolean (default: false) - TRUE if credit card was collected with setup_intent
  - paymentProviderId: string (default: null) - Payment processing account Id
  - reservationId: string - Reservation ID
  - reuse: boolean (default: false) - Allow reusage in other guest's reservations

  Note: The Guesty API token is automatically retrieved from the `guesty_tokens` database table.

*/
