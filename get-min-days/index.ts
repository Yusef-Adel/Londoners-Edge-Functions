// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

console.log("Hello from Functions!");

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { listingId, startDate } = await req.json();
    if (!listingId || !startDate) {
      return new Response(
        JSON.stringify({ error: "listingId and startDate are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get Guesty access token from database
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from("guesty_tokens")
      .select("access_token")
      .single();

    if (tokenError || !tokenData?.access_token) {
      return new Response(
        JSON.stringify({ error: "Failed to retrieve Guesty access token" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const GUESTY_API_TOKEN = tokenData.access_token;
    const url = `https://open-api.guesty.com/v1/availability-pricing/api/calendar/listings/${listingId}?startDate=${startDate}&endDate=${startDate}`;
    const guestyRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${GUESTY_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
    if (!guestyRes.ok) {
      const error = await guestyRes.text();
      return new Response(
        JSON.stringify({ error: "Guesty API error", details: error }),
        {
          status: guestyRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    const guestyData = await guestyRes.json();
    const minNights = guestyData?.data?.days?.[0]?.minNights ?? null;
    return new Response(
      JSON.stringify({ minNights }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Invalid request", details: err.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-min-days' \
    --header 'Authorization: Bearer <token>' \
    --header 'Content-Type: application/json' \
    --data '{"listingId":"LISTING_ID","startDate":"YYYY-MM-DD"}'

*/
