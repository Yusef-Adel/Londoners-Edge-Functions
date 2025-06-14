// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

interface PaymentMethod {
  method?: string;
  id?: string;
  saveForFutureUse?: boolean;
}

interface PaymentParams {
  paymentMethod: PaymentMethod;
  amount: number;
  shouldBePaidAt?: string;
  paidAt?: string;
  note?: string;
  isAuthorizationHold?: boolean;
}

interface RequestBody {
  reservationId: string;
  paymentParams: PaymentParams;
}

console.log("Add Payment Function Loaded!")

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Parse request body
    const { reservationId, paymentParams }: RequestBody = await req.json();

    // Validate required parameters
    if (!reservationId) {
      return new Response(
        JSON.stringify({ error: 'Reservation ID is required' }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!paymentParams || !paymentParams.paymentMethod || typeof paymentParams.amount !== 'number') {
      return new Response(
        JSON.stringify({ error: 'Payment method and amount are required' }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get Guesty token from the database
    const { data: tokenData, error: tokenError } = await supabase
      .from("guesty_tokens")
      .select("access_token")
      .single();

    if (tokenError || !tokenData?.access_token) {
      console.error('Error fetching Guesty token:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve Guesty token' }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Make request to Guesty API
    const guestyResponse = await fetch(
      `https://open-api.guesty.com/v1/reservations/${reservationId}/payments`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentParams),
      }
    );

    if (!guestyResponse.ok) {
      const errorText = await guestyResponse.text();
      console.error('Guesty API error:', errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to add payment to Guesty',
          details: errorText,
          status: guestyResponse.status
        }),
        { status: guestyResponse.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const guestyData = await guestyResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        data: guestyData,
        message: 'Payment added successfully'
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Error in add-payment function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/add-payment' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{
      "reservationId": "your-reservation-id",
      "paymentParams": {
        "paymentMethod": {
          "method": "CASH",
          "saveForFutureUse": false
        },
        "amount": 100.00,
        "note": "Payment for reservation",
        "isAuthorizationHold": false
      }
    }'

  Example with credit card payment method:
  --data '{
    "reservationId": "your-reservation-id",
    "paymentParams": {
      "paymentMethod": {
        "method": "CREDIT_CARD",
        "id": "payment-method-id",
        "saveForFutureUse": true
      },
      "amount": 250.00,
      "shouldBePaidAt": "2025-06-15T10:00:00Z",
      "note": "Advance payment",
      "isAuthorizationHold": false
    }
  }'

*/
