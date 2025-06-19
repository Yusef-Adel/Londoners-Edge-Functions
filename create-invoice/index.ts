// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

console.log("Create Invoice function loaded!")

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
      reservationId, 
      amount, 
      title, 
      normalType,
      description,
      currency,
      dueDate,
      taxable,
      taxRate,
      notes
    } = await req.json()

    // Validate required fields
    if (!reservationId) {
      return new Response(
        JSON.stringify({ error: 'reservationId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!amount) {
      return new Response(
        JSON.stringify({ error: 'amount is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!title) {
      return new Response(
        JSON.stringify({ error: 'title is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!normalType) {
      return new Response(
        JSON.stringify({ error: 'normalType is required. Must be one of: CF, CFE, PCM, LT, CT, VAT, GST, TT, TAX, ST, COT, OCT, TOT, HSHAT, HST, MAT, AFE' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Validate normalType
    const validNormalTypes = ['CF', 'CFE', 'PCM', 'LT', 'CT', 'VAT', 'GST', 'TT', 'TAX', 'ST', 'COT', 'OCT', 'TOT', 'HSHAT', 'HST', 'MAT', 'AFE']
    if (!validNormalTypes.includes(normalType)) {
      return new Response(
        JSON.stringify({ error: `normalType must be one of: ${validNormalTypes.join(', ')}` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

    // Prepare invoice item payload
    const invoicePayload: any = {
      amount,
      title,
      normalType
    }

    // Add optional fields if provided
    if (description !== undefined) invoicePayload.description = description
    if (currency !== undefined) invoicePayload.currency = currency
    if (dueDate !== undefined) invoicePayload.dueDate = dueDate
    if (taxable !== undefined) invoicePayload.taxable = taxable
    if (taxRate !== undefined) invoicePayload.taxRate = taxRate
    if (notes !== undefined) invoicePayload.notes = notes

    // Make POST request to Guesty Invoice Items API
    const guestyResponse = await fetch(
      `https://open-api.guesty.com/v1/invoice-items/reservation/${reservationId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(invoicePayload)
      }
    )

    if (!guestyResponse.ok) {
      const errorText = await guestyResponse.text()
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create invoice item in Guesty',
          details: errorText,
          status: guestyResponse.status
        }),
        {
          status: guestyResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const invoiceData = await guestyResponse.json()

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Invoice item created successfully',
        data: invoiceData 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in create-invoice function:', error)
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/create-invoice' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"reservationId":"RESERVATION_ID_HERE","amount":50.00,"title":"Cleaning fee","normalType":"CF"}'

*/
