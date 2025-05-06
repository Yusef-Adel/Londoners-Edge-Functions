// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || ""
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || ""

console.log("Auth Sign-Out Function Initialized")

Deno.serve(async (req) => {
  // Set up CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  }
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    })
  }

  try {
    // Get the JWT token from the Authorization header
    const authHeader = req.headers.get('Authorization')
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          status: "error",
          message: "Missing Authorization header" 
        }),
        { 
          status: 401, 
          headers: corsHeaders
        }
      )
    }

    // Get the redirect URL if provided
    let redirectTo = null
    try {
      const { redirect_to } = await req.json()
      redirectTo = redirect_to
    } catch (e) {
      // No body or invalid JSON, continue without redirect
    }
    
    // Initialize Supabase client with JWT from Authorization header
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    })
    
    // Sign out the user
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error("Sign out error:", error)
      return new Response(
        JSON.stringify({ 
          status: "error", 
          message: error.message 
        }),
        { 
          status: 400, 
          headers: corsHeaders
        }
      )
    }

    // Handle redirect if specified
    if (redirectTo) {
      // Validate the redirect URL (optional security measure)
      try {
        const url = new URL(redirectTo)
        
        // Create a response with redirect headers
        const responseData = {
          status: "success",
          message: "Successfully signed out, redirecting..."
        }
        
        return new Response(JSON.stringify(responseData), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Location': redirectTo
          }
        })
      } catch (urlError) {
        console.error("Invalid redirect URL:", urlError)
        // Continue with normal response if redirect URL is invalid
      }
    }

    // Standard successful response
    return new Response(
      JSON.stringify({
        status: "success",
        message: "Successfully signed out"
      }),
      { 
        status: 200, 
        headers: corsHeaders
      }
    )
  } catch (error) {
    console.error("Server error:", error)
    return new Response(
      JSON.stringify({ 
        status: "error",
        message: "An unexpected error occurred",
        details: error.message
      }),
      { 
        status: 500, 
        headers: corsHeaders 
      }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/auth-signOut' \
    --header 'Authorization: Bearer JWT_TOKEN_HERE' \
    --header 'Content-Type: application/json' \
    --data '{"redirect_to":"https://example.com/signed-out"}'

*/
