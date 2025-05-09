// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js"

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || ""
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""

// Interface for Guesty Listings API parameters
interface GuestyListingsParams {
  ids?: string;
  nids?: string;
  viewId?: string;
  q?: string;
  "t.city"?: string;
  active?: boolean;
  pmsActive?: boolean;
  integrationId?: string;
  listed?: boolean;
  available?: {
    checkIn: string;
    checkOut: string;
    minOccupancy?: number;
    ignoreFlexibleBlocks?: boolean;
  };
  tags?: string;
  fields?: string;
  sort?: string;
  limit?: number;
  skip?: number;
}

// Function to get a valid Guesty token from the database
async function getGuestyToken() {
  // Initialize Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data: tokens, error } = await supabase
    .from("guesty_tokens")
    .select("access_token")
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) throw new Error(`Failed to fetch token: ${error.message}`)
  if (!tokens || tokens.length === 0) throw new Error("No Guesty token available")

  return tokens[0].access_token
}

// Helper function to build query string from params object
function buildQueryString(params: Record<string, any>): string {
  const parts: string[] = [];
  
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    
    if (typeof value === 'object' && key === 'available') {
      parts.push(`${key}=${encodeURIComponent(JSON.stringify(value))}`);
    } else {
      parts.push(`${key}=${encodeURIComponent(String(value))}`);
    }
  }
  
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

console.log("Listings Search Function initialized")

// Use Deno.serve directly
Deno.serve(async (req) => {
  try {
    // Check if it's a GET request
    if (req.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405,
          headers: { 
            'Content-Type': 'application/json',
            'Allow': 'GET'
          } 
        }
      );
    }

    // Extract query parameters
    const url = new URL(req.url);
    const params: GuestyListingsParams = {};
    
    // Parse and assign each supported parameter
    if (url.searchParams.has('ids')) params.ids = url.searchParams.get('ids') || undefined;
    if (url.searchParams.has('nids')) params.nids = url.searchParams.get('nids') || undefined;
    if (url.searchParams.has('viewId')) params.viewId = url.searchParams.get('viewId') || undefined;
    if (url.searchParams.has('q')) params.q = url.searchParams.get('q') || undefined;
    if (url.searchParams.has('t.city')) params["t.city"] = url.searchParams.get('t.city') || undefined;
    if (url.searchParams.has('active')) params.active = url.searchParams.get('active') === 'true';
    if (url.searchParams.has('pmsActive')) params.pmsActive = url.searchParams.get('pmsActive') === 'true';
    if (url.searchParams.has('integrationId')) params.integrationId = url.searchParams.get('integrationId') || undefined;
    if (url.searchParams.has('listed')) params.listed = url.searchParams.get('listed') === 'true';
    
    // Handle available object parameter
    if (url.searchParams.has('available')) {
      try {
        params.available = JSON.parse(url.searchParams.get('available') || '{}');
      } catch (e) {
        console.error('Failed to parse available parameter:', e);
      }
    }
    
    if (url.searchParams.has('tags')) params.tags = url.searchParams.get('tags') || undefined;
    if (url.searchParams.has('fields')) params.fields = url.searchParams.get('fields') || undefined;
    if (url.searchParams.has('sort')) params.sort = url.searchParams.get('sort') || undefined;
    
    // Handle pagination
    if (url.searchParams.has('limit')) {
      const limit = parseInt(url.searchParams.get('limit') || '25');
      params.limit = isNaN(limit) ? 25 : Math.min(limit, 100); // Max 100
    } else {
      params.limit = 25; // Default
    }
    
    if (url.searchParams.has('skip')) {
      const skip = parseInt(url.searchParams.get('skip') || '0');
      params.skip = isNaN(skip) ? 0 : skip;
    } else {
      params.skip = 0; // Default
    }

    // Get the Guesty token from the database instead of requiring it in the Authorization header
    const guestyToken = await getGuestyToken();

    // Make request to Guesty API
    const queryString = buildQueryString(params);
    const response = await fetch(`https://open-api.guesty.com/v1/listings${queryString}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${guestyToken}`,
      },
    });

    // Get response data
    const responseData = await response.json();

    // Return response with same status code
    return new Response(
      JSON.stringify(responseData),
      { 
        status: response.status,
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in listings search function:', error);
    
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/listing-search?q=beach&limit=10'

  Note: The Authorization header is no longer required as the function now gets the token from the database
*/
