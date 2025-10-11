// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Interface for individual quote request (matches Guesty API format)
interface QuoteItem {
  guestsCount: number;
  applyPromotions?: boolean;
  checkInDateLocalized: string;
  checkOutDateLocalized: string;
  unitTypeId: string;
  source: string;
  channel?: string;
  count?: number;
  rates?: any[]; // Array of rates for this quote
  numberOfGuests?: {
    numberOfAdults?: number;
    numberOfChildren?: number;
    numberOfInfants?: number;
    numberOfPets?: number;
  };
  ignoreCalendar?: boolean;
  ignoreTerms?: boolean;
  ignoreBlocks?: boolean;
  couponCode?: string;
}

// Interface for the main request body
interface MultipleQuotesRequest {
  listingIds?: string[]; // Optional - if not provided, will fetch all listings
  checkInDateLocalized: string;
  checkOutDateLocalized: string;
  guestsCount: number;
  numberOfGuests?: {
    numberOfAdults?: number;
    numberOfChildren?: number;
    numberOfInfants?: number;
    numberOfPets?: number;
  };
  source: string;
  channel?: string;
  applyPromotions?: boolean;
  count?: number;
  rates?: any[]; // Array of rates to apply to all quotes
  ignoreCalendar?: boolean;
  ignoreTerms?: boolean;
  ignoreBlocks?: boolean;
  couponCode?: string;
}

// Interface for Guesty API response
interface GuestyQuoteResponse {
  _id: string;
  listingId: string;
  status: string;
  pricing?: {
    total?: number;
    currency?: string;
    basePrice?: number;
    cleaningFee?: number;
    [key: string]: any;
  };
  [key: string]: any;
}

console.log("Create Multiple Quotes Function initialized!")

Deno.serve(async (req) => {
  try {
    // Comprehensive CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with, accept, origin, referer, user-agent',
      'Access-Control-Max-Age': '86400',
      'Access-Control-Allow-Credentials': 'false'
    };

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, { 
        status: 200,
        headers: corsHeaders 
      });
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Only POST requests are supported.' }),
        { 
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const requestData: MultipleQuotesRequest = await req.json();
    console.log('Received request:', JSON.stringify(requestData, null, 2));

    // Validate required fields
    const requiredFields = ['checkInDateLocalized', 'checkOutDateLocalized', 'guestsCount', 'source'];
    for (const field of requiredFields) {
      if (!requestData[field as keyof MultipleQuotesRequest]) {
        return new Response(
          JSON.stringify({ error: `Missing required field: ${field}` }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Validate guests_count is at least 1
    if (requestData.guestsCount < 1) {
      return new Response(
        JSON.stringify({ error: 'guestsCount must be at least 1' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate dates
    const checkInDate = new Date(requestData.checkInDateLocalized);
    const checkOutDate = new Date(requestData.checkOutDateLocalized);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return new Response(
        JSON.stringify({ error: 'Invalid date format' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (checkInDate >= checkOutDate) {
      return new Response(
        JSON.stringify({ error: 'Check-in date must be before check-out date' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get Guesty token from database
    const { data: tokenData, error: tokenError } = await supabase
      .from('guesty_tokens')
      .select('access_token')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (tokenError || !tokenData?.access_token) {
      console.error('Error fetching Guesty token:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve Guesty API token' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const guestyToken = tokenData.access_token;

    // Determine which listing IDs to use
    let listingIds: string[] = [];

    if (requestData.listingIds && requestData.listingIds.length > 0) {
      // Use provided listing IDs
      listingIds = requestData.listingIds;
      console.log(`Using ${listingIds.length} provided listing IDs`);
    } else {
      // Fetch all listings from Guesty
      console.log('No listing IDs provided, fetching all listings from Guesty...');
      
      const listingsResponse = await fetch(
        'https://open-api.guesty.com/v1/listings',
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${guestyToken}`,
            'Accept': 'application/json',
          },
        }
      );

      if (!listingsResponse.ok) {
        const errorText = await listingsResponse.text();
        console.error('Failed to fetch listings:', errorText);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to fetch listings from Guesty',
            details: errorText 
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const listingsData = await listingsResponse.json();
      
      // Extract listing IDs from the response
      if (listingsData.results && Array.isArray(listingsData.results)) {
        listingIds = listingsData.results
          .filter((listing: any) => listing._id && listing.active !== false)
          .map((listing: any) => listing._id);
        console.log(`Fetched ${listingIds.length} active listings`);
      } else {
        return new Response(
          JSON.stringify({ 
            error: 'No listings found in Guesty account',
            details: 'The API returned an empty or invalid response' 
          }),
          { 
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Validate we have listing IDs to work with
    if (listingIds.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No listing IDs available',
          message: 'Either provide listingIds or ensure there are active listings in your Guesty account' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Prepare the base quote data (matching Guesty API format)
    const baseQuoteData: Partial<QuoteItem> = {
      guestsCount: requestData.guestsCount,
      applyPromotions: requestData.applyPromotions ?? false,
      checkInDateLocalized: requestData.checkInDateLocalized,
      checkOutDateLocalized: requestData.checkOutDateLocalized,
      source: requestData.source,
      channel: requestData.channel || 'manual_reservations',
      count: requestData.count || 1,
    };

    // Add optional fields if provided
    if (requestData.ignoreCalendar !== undefined) {
      baseQuoteData.ignoreCalendar = requestData.ignoreCalendar;
    }
    if (requestData.ignoreTerms !== undefined) {
      baseQuoteData.ignoreTerms = requestData.ignoreTerms;
    }
    if (requestData.ignoreBlocks !== undefined) {
      baseQuoteData.ignoreBlocks = requestData.ignoreBlocks;
    }
    if (requestData.numberOfGuests) {
      baseQuoteData.numberOfGuests = requestData.numberOfGuests;
    }
    if (requestData.couponCode) {
      baseQuoteData.couponCode = requestData.couponCode;
    }
    if (requestData.rates && Array.isArray(requestData.rates)) {
      baseQuoteData.rates = requestData.rates;
    }

    // Build the quotes array for the API (using unitTypeId as per Guesty format)
    const quotesArray: QuoteItem[] = listingIds.map(listingId => ({
      ...baseQuoteData,
      unitTypeId: listingId,  // Guesty uses unitTypeId instead of listingId
    } as QuoteItem));

    console.log(`Preparing to create ${quotesArray.length} quotes`);
    console.log('Sample quote data:', JSON.stringify(quotesArray[0], null, 2));

    // Call Guesty API to create multiple quotes
    const guestyResponse = await fetch(
      'https://open-api.guesty.com/v1/quotes/multiple',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${guestyToken}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify({ quotes: quotesArray }),
      }
    );

    if (!guestyResponse.ok) {
      const errorText = await guestyResponse.text();
      console.error('Guesty API error:', errorText);
      console.error('Request sent:', JSON.stringify({ quotes: quotesArray.slice(0, 2) }, null, 2));
      
      return new Response(
        JSON.stringify({ 
          error: `Guesty API error: ${guestyResponse.status}`,
          statusText: guestyResponse.statusText,
          details: errorText,
          requestedQuotesCount: quotesArray.length
        }),
        { 
          status: guestyResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const guestyData = await guestyResponse.json();
    console.log(`Successfully created quotes. Response:`, JSON.stringify(guestyData, null, 2));

    // Process the response
    const quotes = Array.isArray(guestyData) ? guestyData : (guestyData.quotes || []);
    
    // Separate successful and failed quotes
    const successfulQuotes = quotes.filter((q: any) => q.status !== 'error' && !q.error);
    const failedQuotes = quotes.filter((q: any) => q.status === 'error' || q.error);

    // Return success response with detailed results
    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          totalRequested: quotesArray.length,
          successful: successfulQuotes.length,
          failed: failedQuotes.length,
          checkIn: requestData.checkInDateLocalized,
          checkOut: requestData.checkOutDateLocalized,
          guests: requestData.guestsCount
        },
        quotes: successfulQuotes,
        failures: failedQuotes.length > 0 ? failedQuotes : undefined,
        message: `Successfully created ${successfulQuotes.length} out of ${quotesArray.length} quotes`
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'An unexpected error occurred',
        details: error.message,
        stack: error.stack 
      }),
      { 
        status: 500,
        headers: { 
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  Example 1: Create quotes for specific listing IDs (Guesty Format)
  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/create-multiple-quotes' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{
      "listingIds": ["679b2773da32a800107fc7c0", "679b235b2e9626001105b891"],
      "checkInDateLocalized": "2025-11-01",
      "checkOutDateLocalized": "2025-11-05",
      "guestsCount": 1,
      "source": "fb-campaign",
      "channel": "manual_reservations",
      "applyPromotions": false,
      "count": 1
    }'

  This generates Guesty API payload with unitTypeId format:
  {
    "quotes": [
      {
        "guestsCount": 1,
        "applyPromotions": false,
        "checkInDateLocalized": "2025-11-01",
        "checkOutDateLocalized": "2025-11-05",
        "unitTypeId": "679b2773da32a800107fc7c0",
        "source": "fb-campaign",
        "channel": "manual_reservations",
        "count": 1
      },
      ...
    ]
  }

  Example 2: Create quotes for ALL listings in your Guesty account
  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/create-multiple-quotes' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{
      "checkInDateLocalized": "2025-07-01",
      "checkOutDateLocalized": "2025-07-07",
      "guestsCount": 2,
      "source": "website"
    }'

  Example 3: With minimal parameters (fetches all listings)
  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/create-multiple-quotes' \
    --header 'Authorization: Bearer YOUR_TOKEN' \
    --header 'Content-Type: application/json' \
    --data '{
      "checkInDateLocalized": "2025-08-15",
      "checkOutDateLocalized": "2025-08-20",
      "guestsCount": 3,
      "source": "direct"
    }'

*/
