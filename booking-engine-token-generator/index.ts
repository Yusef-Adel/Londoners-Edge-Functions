import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js";

// Constants for Guesty Booking Engine API
const GUESTY_BOOKING_ENGINE_CLIENT_ID = Deno.env.get("GUESTY_BOOKING_ENGINE_CLIENT_ID");
const GUESTY_BOOKING_ENGINE_CLIENT_SECRET = Deno.env.get("GUESTY_BOOKING_ENGINE_CLIENT_SECRET");
const GUESTY_BOOKING_ENGINE_TOKEN_URL = "https://booking.guesty.com/oauth2/token";

// Function to delete expired tokens
async function deleteExpiredTokens(supabase) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("guesty_booking_engine_tokens")
    .delete()
    .lt('expires_at', now);
  
  if (error) {
    console.error("Error deleting expired tokens:", error.message);
  }
}

// Function to delete all tokens
async function deleteAllTokens(supabase) {
  try {
    console.log("Deleting all existing booking engine tokens");
    // Delete all tokens without relying on an id column
    const { error } = await supabase
      .from("guesty_booking_engine_tokens")
      .delete()
      .gte('created_at', '1900-01-01'); // This will match all rows with a created_at date
    
    if (error) {
      console.error("Error deleting all tokens:", error.message);
      throw new Error(`Failed to delete all tokens: ${error.message}`);
    } else {
      console.log("Successfully deleted all existing booking engine tokens");
    }
  } catch (error) {
    console.error("Error in deleteAllTokens:", error.message);
    throw error;
  }
}

// Function to generate and store a new token
async function generateAndStoreToken(supabase) {
  // Delete all existing tokens first to maintain only one token in the database
  await deleteAllTokens(supabase);

  // Prepare the form data
  const formData = new URLSearchParams();
  formData.append("grant_type", "client_credentials");
  formData.append("scope", "booking_engine:api");
  formData.append("client_id", GUESTY_BOOKING_ENGINE_CLIENT_ID);
  formData.append("client_secret", GUESTY_BOOKING_ENGINE_CLIENT_SECRET);

  // Make the request to Guesty Booking Engine API
  const response = await fetch(GUESTY_BOOKING_ENGINE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Cache-Control": "no-cache",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Failed to get token: ${response.statusText}`);
  }

  const tokenData = await response.json();

  // Calculate expires_at manually
  const now = new Date();
  const expiresAt = new Date(now.getTime() + tokenData.expires_in * 1000);

  // Store the token in the database with manually calculated expires_at
  const { error: insertError } = await supabase
    .from("guesty_booking_engine_tokens")
    .insert([{
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
      access_token: tokenData.access_token,
      scope: tokenData.scope,
      expires_at: expiresAt.toISOString()
    }]);

  if (insertError) {
    throw new Error(`Failed to store token: ${insertError.message}`);
  }

  // Get the inserted record to get the calculated expires_at
  const { data: insertedToken, error: selectError } = await supabase
    .from("guesty_booking_engine_tokens")
    .select("*")
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (selectError) {
    throw new Error(`Failed to retrieve stored token: ${selectError.message}`);
  }

  return insertedToken;
}

// Function to check if current token is valid
async function getValidToken(supabase) {
  const { data: tokens, error } = await supabase
    .from("guesty_booking_engine_tokens")
    .select("*")
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Failed to fetch token: ${error.message}`);
  }

  if (!tokens || tokens.length === 0) {
    return null;
  }

  const latestToken = tokens[0];
  const now = new Date();
  const expiresAt = new Date(latestToken.expires_at);

  // If token expires in less than 5 minutes, consider it expired
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    return null;
  }

  return latestToken;
}

Deno.serve(async (req) => {
  // CORS headers for all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
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

  try {
    // Log the request for debugging
    console.log("Request received:", {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries([...req.headers.entries()]),
    });
    
    // Check if this is a cron job request
    const userAgent = req.headers.get('user-agent') || '';
    console.log(`User-Agent: ${userAgent}`);
    const isCronJob = userAgent.includes('pg_net');
    
    // Initialize Supabase client with elevated privileges for database operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    );
    
    // For cron jobs, bypass authentication and process immediately
    if (isCronJob) {
      console.log("CRON JOB DETECTED - Processing without authentication check");
      
      // Always refresh token for cron jobs
      await deleteExpiredTokens(supabase);
      const token = await generateAndStoreToken(supabase);
      
      console.log(`Booking Engine token refreshed by cron job, expires at: ${token.expires_at}`);
      
      return new Response(
        JSON.stringify({
          status: "success",
          message: "Booking Engine token refreshed by cron job",
          details: {
            expires_at: token.expires_at,
            hours_until_expiry: ((new Date(token.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60)).toFixed(2)
          }
        }),
        { 
          status: 200,
          headers: corsHeaders
        }
      );
    }
    
    // For regular API calls, check authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log("Missing Authorization header in request");
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Missing Authorization header"
        }),
        { 
          status: 401,
          headers: corsHeaders
        }
      );
    }
    
    // Extract token from authorization header
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.replace('Bearer ', '') 
      : authHeader;
    
    // Check if the token is valid by matching against allowed keys
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (token !== ANON_KEY && token !== SERVICE_ROLE_KEY) {
      console.log("Invalid Authorization token");
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Invalid Authorization token"
        }),
        { 
          status: 401,
          headers: corsHeaders
        }
      );
    }
    
    console.log("Authentication successful");
    
    // Process regular API request
    let currentToken = await getValidToken(supabase);
    let tokenRefreshed = false;
    
    if (!currentToken) {
      await deleteExpiredTokens(supabase);
      currentToken = await generateAndStoreToken(supabase);
      tokenRefreshed = true;
    }
    
    return new Response(
      JSON.stringify({
        status: "success",
        message: tokenRefreshed ? "New booking engine token generated" : "Using existing valid booking engine token",
        data: {
          token_type: currentToken.token_type,
          expires_in: currentToken.expires_in,
          scope: currentToken.scope,
          expires_at: currentToken.expires_at,
          access_token: currentToken.access_token
        }
      }),
      { 
        status: 200,
        headers: corsHeaders
      }
    );
    
  } catch (error) {
    console.error("Error in booking engine token generator:", error.message);
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
