// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Interface for Guesty Reservations API parameters
interface GuestyReservationsParams {
  viewId?: string;
  filters?: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
  fields?: string;
  sort?: string;
  limit?: number;
  skip?: number;
}

// Function to get a valid Guesty token from the database
async function getGuestyToken() {
  // Initialize Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: tokens, error } = await supabase
    .from("guesty_tokens")
    .select("access_token")
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw new Error(`Failed to fetch token: ${error.message}`);
  if (!tokens || tokens.length === 0) throw new Error("No Guesty token available");

  console.log("Successfully retrieved Guesty token");
  return tokens[0].access_token;
}

// Helper function to build query string from params object
function buildQueryString(params: Record<string, any>): string {
  const parts: string[] = [];
  
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    
    if (Array.isArray(value) && key === 'filters') {
      // Handle filters array - encode as JSON
      parts.push(`${key}=${encodeURIComponent(JSON.stringify(value))}`);
    } else if (typeof value === 'boolean') {
      parts.push(`${key}=${value}`);
    } else {
      parts.push(`${key}=${encodeURIComponent(String(value))}`);
    }
  }
  
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

console.log("Get Reservations Function initialized")

// Use serve function instead of Deno.serve
serve(async (req) => {
  try {
    // Set CORS headers
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

    // Check if it's a POST request
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405,
          headers: { 
            ...corsHeaders,
            'Allow': 'POST'
          } 
        }
      );
    }

    // Parse the request body
    const requestBody = await req.json();
    console.log("Received request body:", JSON.stringify(requestBody));
    
    const params: GuestyReservationsParams = {};
    
    // Extract parameters from the request body
    if (requestBody.viewId) params.viewId = requestBody.viewId;
    
    // Handle guestId - convert to proper Guesty filter format
    if (requestBody.guestId) {
      params.filters = [{ 
        field: "guestId", 
        operator: "$eq", 
        value: requestBody.guestId 
      }];
    }
    
    if (requestBody.filters && Array.isArray(requestBody.filters)) {
      // Merge with existing filters from guestId if any
      if (params.filters) {
        params.filters = [...params.filters, ...requestBody.filters];
      } else {
        params.filters = requestBody.filters;
      }
    }
    if (requestBody.fields) params.fields = requestBody.fields;
    if (requestBody.sort) params.sort = requestBody.sort;
    
    // Handle pagination
    if (requestBody.limit !== undefined) {
      const limit = parseInt(String(requestBody.limit));
      params.limit = isNaN(limit) ? 25 : Math.min(limit, 100); // Max 100
    } else {
      params.limit = 25; // Default
    }
    
    if (requestBody.skip !== undefined) {
      const skip = parseInt(String(requestBody.skip));
      params.skip = isNaN(skip) ? 0 : skip;
    } else {
      params.skip = 0; // Default
    }

    console.log("Prepared API params:", JSON.stringify(params));
    
    // Get the Guesty token from the database
    const guestyToken = await getGuestyToken();

    // Make request to Guesty API
    const queryString = buildQueryString(params);
    const apiUrl = `https://open-api.guesty.com/v1/reservations${queryString}`;
    console.log("Making request to Guesty API:", apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${guestyToken}`,
      },
    });

    console.log(`Guesty API response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Guesty API error response:", errorText);
      throw new Error(`Guesty API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    // Get response data from Guesty
    const guestyResponse = await response.json();

    console.log(`Got response from Guesty with ${guestyResponse.results?.length || 0} reservations`);
    console.log(`Total count from API: ${guestyResponse.count || 0}`);
    
    let filteredResults = guestyResponse.results || [];
    let actualTotalCount = guestyResponse.count || 0;
    
    // Server-side filtering should now work with proper MongoDB operators
    console.log(`Server-side filtering returned ${filteredResults.length} reservations`);
    
    // Return the Guesty response directly
    return new Response(
      JSON.stringify({
        status: "success",
        message: "Reservations retrieved successfully",
        data: filteredResults,
        totalCount: actualTotalCount,
        page: Math.floor(params.skip / params.limit) + 1,
        limit: params.limit
      }),
      { 
        status: 200,
        headers: corsHeaders 
      }
    );
  } catch (error) {
    console.error('Error in get reservations function:', error);
    
    return new Response(
      JSON.stringify({ 
        status: "error",
        message: 'Internal server error', 
        details: error.message 
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
  2. Make an HTTP request:

  Basic request to get all reservations:
  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-reservations' \
    --header 'Content-Type: application/json' \
    --data-raw '{}'

  Request for specific guest ID:
  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-reservations' \
    --header 'Content-Type: application/json' \
    --data-raw '{"guestId":"683743a880b8e714e775353b"}'

  Request with filters using MongoDB operators:
  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-reservations' \
    --header 'Content-Type: application/json' \
    --data-raw '{"filters":[{"field":"guestId","operator":"$eq","value":"683743a880b8e714e775353b"}]}'

  Request with date range filter:
  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-reservations' \
    --header 'Content-Type: application/json' \
    --data-raw '{"filters":[{"field":"checkIn","operator":"$between","from":"2025-07-01T00:00:00+00:00","to":"2025-07-31T23:59:59+00:00"}]}'

  Request with specific view and fields:
  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-reservations' \
    --header 'Content-Type: application/json' \
    --data-raw '{"viewId":"your-view-id","fields":"_id status checkIn checkOut guest","sort":"checkIn"}'

*/
