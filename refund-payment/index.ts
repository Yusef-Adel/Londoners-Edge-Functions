// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

console.log("Refund Payment function initialized")

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Interface for refund request
interface RefundRequest {
  id: string; // Reservation ID
  paymentId: string; // Payment ID
  amount: number; // Refund amount
  note?: string; // Optional note
}

// Interface for Guesty refund response
interface GuestyRefundResponse {
  id: string;
  status: string;
  amount: number;
  currency: string;
  note?: string;
  createdAt: string;
  [key: string]: any;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Parse request body
    const { id, paymentId, amount, note }: RefundRequest = await req.json()

    // Validate required fields
    if (!id || !paymentId || !amount) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: id (reservation ID), paymentId, and amount are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate amount is positive
    if (amount <= 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Amount must be a positive number' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
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

    // Prepare refund payload
    const refundPayload = {
      amount: amount,
      ...(note && { note })
    }

    // Make request to Guesty API
    const guestyResponse = await fetch(
      `https://open-api.guesty.com/v1/reservations/${id}/payments/${paymentId}/refund`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(refundPayload),
      }
    )

    if (!guestyResponse.ok) {
      const errorText = await guestyResponse.text()
      return new Response(
        JSON.stringify({ 
          error: 'Failed to process refund with Guesty',
          details: errorText,
          status: guestyResponse.status
        }),
        {
          status: guestyResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const refundData: GuestyRefundResponse = await guestyResponse.json()

    // Return successful response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Refund processed successfully',
        data: {
          refundId: refundData.id,
          reservationId: id,
          paymentId: paymentId,
          amount: refundData.amount,
          currency: refundData.currency,
          status: refundData.status,
          note: refundData.note,
          processedAt: refundData.createdAt,
          originalResponse: refundData
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in refund-payment function:', error)
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/refund-payment' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{
      "id": "reservation_123",
      "paymentId": "payment_456", 
      "amount": 100.50,
      "note": "Customer requested refund"
    }'

  Example Response:
  {
    "success": true,
    "message": "Refund processed successfully",
    "data": {
      "refundId": "refund_789",
      "reservationId": "reservation_123",
      "paymentId": "payment_456",
      "amount": 100.50,
      "currency": "USD",
      "status": "processed",
      "note": "Customer requested refund",
      "processedAt": "2025-07-13T10:30:00.000Z",
      "originalResponse": { ... }
    }
  }

*/
