// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || ""
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || ""

console.log("Auth Login Function Initialized")

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
    // Parse the request body
    const { email, password } = await req.json()

    // Validate required parameters
    if (!email || !password) {
      return new Response(
        JSON.stringify({ 
          status: "error",
          message: "Email and password are required" 
        }),
        { 
          status: 400, 
          headers: corsHeaders
        }
      )
    }

    // Initialize Supabase client with anon key for regular auth operations
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // Sign in the user with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      console.error("Authentication error:", error)
      return new Response(
        JSON.stringify({ 
          status: "error", 
          message: "Invalid login credentials" 
        }),
        { 
          status: 401, 
          headers: corsHeaders
        }
      )
    }

    // // After successful login, you might want to fetch additional user data
    // let userData = null
    // if (data.user) {
    //   // Example: Get user profile data
    //   const { data: profileData, error: profileError } = await supabase
    //     .from('profiles') // Replace with your actual table name
    //     .select('*')
    //     .eq('user_id', data.user.id)
    //     .single()

    //   if (!profileError) {
    //     userData = profileData
    //   }
    // }

    // Return success with the session and user data
    return new Response(
      JSON.stringify({
        status: "success",
        message: "Login successful",
        session: data.session,
        user: data.user,
        // profile: userData
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
        message: "An unexpected error occurred" 
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/auth-Login' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"email":"user@example.com", "password":"securepassword"}'

*/
