// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Import Deno standard library functions required for edge functions
import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Define interfaces for our data structures
interface QuoteRequest {
  check_in_date_localized: string;
  check_out_date_localized: string;
  listing_id: string;
  source: string;
  guests_count: number;
  ignore_calendar?: boolean;
  ignore_terms?: boolean;
  ignore_blocks?: boolean;
  coupon_code?: string;
}

interface GuestyQuoteRequest {
  listingId: string;
  checkInDateLocalized: string;
  checkOutDateLocalized: string;
  guestsCount: number;
  source: string;
  ignoreCalendar?: boolean;
  ignoreTerms?: boolean;
  ignoreBlocks?: boolean;
  couponCode?: string | null;
}

interface GuestyQuoteResponse {
  id: string;
  pricing: {
    total: number;
    currency: string;
    // Additional pricing fields would be here based on actual API response
  };
  // Additional response fields would be here
}

console.log("Quote Creator Function initialized");

serve(async (req) => {
  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get the authorization header from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const requestData: QuoteRequest = await req.json();

    // Validate required fields
    const requiredFields = ["check_in_date_localized", "check_out_date_localized", "listing_id", "source", "guests_count"];
    for (const field of requiredFields) {
      if (!requestData[field as keyof QuoteRequest]) {
        return new Response(JSON.stringify({ error: `Missing required field: ${field}` }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Validate guests_count is at least 1
    if (requestData.guests_count < 1) {
      return new Response(JSON.stringify({ error: "guests_count must be at least 1" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate dates
    const checkInDate = new Date(requestData.check_in_date_localized);
    const checkOutDate = new Date(requestData.check_out_date_localized);
    const today = new Date();

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return new Response(JSON.stringify({ error: "Invalid date format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (checkInDate >= checkOutDate) {
      return new Response(JSON.stringify({ error: "Check-in date must be before check-out date" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create a Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get Guesty token from the database
    const { data: tokenData, error: tokenError } = await supabase
      .from("guesty_tokens")
      .select("access_token")
      .single();

    if (tokenError || !tokenData?.access_token) {
      console.error("Error fetching Guesty token:", tokenError);
      return new Response(JSON.stringify({ error: "Failed to retrieve Guesty API token" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const guestyToken = tokenData.access_token;

    // Prepare the data for Guesty API
    const guestyQuoteRequest: GuestyQuoteRequest = {
      listingId: requestData.listing_id,
      checkInDateLocalized: requestData.check_in_date_localized,
      checkOutDateLocalized: requestData.check_out_date_localized,
      guestsCount: requestData.guests_count,
      source: requestData.source,
      ignoreCalendar: requestData.ignore_calendar,
      ignoreTerms: requestData.ignore_terms,
      ignoreBlocks: requestData.ignore_blocks,
      couponCode: requestData.coupon_code || null,
    };

    // Call Guesty API to create a quote - Updated to the correct endpoint
    const guestyResponse = await fetch("https://open-api.guesty.com/v1/quotes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${guestyToken}`,
      },
      body: JSON.stringify(guestyQuoteRequest),
    });

    if (!guestyResponse.ok) {
      const errorText = await guestyResponse.text();
      console.error("Guesty API error:", errorText);
      return new Response(JSON.stringify({ error: `Guesty API error: ${guestyResponse.status}`, details: errorText }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const guestyData: GuestyQuoteResponse = await guestyResponse.json();

    // Store the quote in the database
    const { data: quoteData, error: quoteError } = await supabase
      .from("quotes")
      .insert([{
        check_in_date_localized: requestData.check_in_date_localized,
        check_out_date_localized: requestData.check_out_date_localized,
        listing_id: requestData.listing_id,
        source: requestData.source,
        guests_count: requestData.guests_count,
        ignore_calendar: requestData.ignore_calendar,
        ignore_terms: requestData.ignore_terms,
        ignore_blocks: requestData.ignore_blocks,
        coupon_code: requestData.coupon_code,
      }])
      .select();

    if (quoteError) {
      console.error("Error inserting quote:", quoteError);
      return new Response(JSON.stringify({ error: "Failed to store quote in database", details: quoteError }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Return a success response with both the Guesty quote and our database record
    return new Response(
      JSON.stringify({
        success: true,
        quote_id: quoteData[0].quote_id,
        guesty_quote: guestyData,
        database_record: quoteData[0],
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request using the curl command below
  
  curl -i --location --request POST 'http://localhost:54321/functions/v1/Create-Quote' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "check_in_date_localized": "2025-06-01",
    "check_out_date_localized": "2025-06-07",
    "listing_id": "abc123",
    "source": "website",
    "guests_count": 2,
    "ignore_calendar": false,
    "ignore_terms": false,
    "ignore_blocks": false,
    "coupon_code": "SUMMER10"
  }'
*/


