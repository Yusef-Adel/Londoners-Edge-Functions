// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || ""
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const supabase = createClient(supabaseUrl, supabaseKey)

// Constants for Guesty API
const GUESTY_CLIENT_ID = Deno.env.get("GUESTY_CLIENT_ID");
const GUESTY_CLIENT_SECRET = Deno.env.get("GUESTY_CLIENT_SECRET");
const GUESTY_TOKEN_URL = "https://open-api.guesty.com/oauth2/token"

// Function to generate and store a new token
async function generateAndStoreToken() {
  // Prepare the form data
  const formData = new URLSearchParams()
  formData.append("grant_type", "client_credentials")
  formData.append("scope", "open-api")
  formData.append("client_id", GUESTY_CLIENT_ID)
  formData.append("client_secret", GUESTY_CLIENT_SECRET)

  // Make the request to Guesty API
  const response = await fetch(GUESTY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: formData
  })

  if (!response.ok) {
    throw new Error(`Failed to get token: ${response.statusText}`)
  }

  const tokenData = await response.json()

  // Store the token in the database (without manual expires_at calculation)
  const { error: insertError } = await supabase
    .from("guesty_tokens")
    .insert([{
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
      access_token: tokenData.access_token,
      scope: tokenData.scope
    }])

  if (insertError) {
    throw new Error(`Failed to store token: ${insertError.message}`)
  }

  // Get the inserted record to get the calculated expires_at
  const { data: insertedToken, error: selectError } = await supabase
    .from("guesty_tokens")
    .select("*")
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (selectError) {
    throw new Error(`Failed to retrieve stored token: ${selectError.message}`)
  }

  return insertedToken
}

// Function to check if current token is valid
async function getValidToken() {
  const { data: tokens, error } = await supabase
    .from("guesty_tokens")
    .select("*")
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    throw new Error(`Failed to fetch token: ${error.message}`)
  }

  if (!tokens || tokens.length === 0) {
    return null
  }

  const latestToken = tokens[0]
  const now = new Date()
  const expiresAt = new Date(latestToken.expires_at)

  // If token expires in less than 5 minutes, consider it expired
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    return null
  }

  return latestToken
}

serve(async (req) => {
  try {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    }

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      })
    }

    // Check for existing valid token
    let token = await getValidToken()

    // If no valid token exists, generate a new one
    if (!token) {
      token = await generateAndStoreToken()
    }

    return new Response(
      JSON.stringify({
        status: "success",
        message: "Token retrieved successfully",
        data: {
          token_type: token.token_type,
          expires_in: token.expires_in,
          scope: token.scope,
          expires_at: token.expires_at,
          access_token: token.access_token
        }
      }),
      { 
        status: 200,
        headers: corsHeaders
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: "error",
        message: error.message
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    )
  }
})
