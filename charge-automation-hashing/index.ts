// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Generates SHA-256 hash for Charge Automation iframe
 * Hash is created from: userAccountId + orderId + amount + currency + chargebackProtection + apiKey
 */
async function generateHash(
  userAccountId: string,
  orderId: string,
  amount: string,
  currency: string,
  chargebackProtection: string,
  apiKey: string
): Promise<string> {
  // Concatenate values in the required order
  const dataToHash = `${userAccountId}${orderId}${amount}${currency}${chargebackProtection}${apiKey}`
  
  // Convert string to Uint8Array
  const encoder = new TextEncoder()
  const data = encoder.encode(dataToHash)
  
  // Generate SHA-256 hash
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  
  // Convert hash to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  
  return hashHex
}

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get secrets from Supabase environment
    const userAccountId = Deno.env.get('USER_ACCOUNT_ID_CHARGE_AUTOMATION')
    const apiKey = Deno.env.get('CHARGE_AUTOMATION_API_KEY')

    if (!userAccountId || !apiKey) {
      throw new Error('Missing required environment variables: USER_ACCOUNT_ID_CHARGE_AUTOMATION or CHARGE_AUTOMATION_API_KEY')
    }

    // Parse request body
    const { orderId, amount, currency, chargebackProtection } = await req.json()

    // Validate required parameters
    if (!orderId || amount === undefined || !currency || !chargebackProtection) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameters',
          required: ['orderId', 'amount', 'currency', 'chargebackProtection']
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      )
    }

    // Convert amount to fixed decimal string (e.g., "28.00")
    const formattedAmount = typeof amount === 'number' 
      ? amount.toFixed(2)
      : parseFloat(amount).toFixed(2)

    // Generate SHA-256 hash
    const hash = await generateHash(
      userAccountId,
      orderId,
      formattedAmount,
      currency,
      chargebackProtection,
      apiKey
    )

    // Return hash and userAccountId for frontend iframe configuration
    const responseData = {
      hash,
      userAccountId,
      success: true
    }

    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error generating hash:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Set environment variables in .env file or use --env-file flag
  3. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/charge-automation-hashing' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"orderId":"6969338497c852001531245","amount":28.00,"currency":"GBP","chargebackProtection":"No"}'

  Expected response:
  {
    "hash": "sha256-hash-string",
    "userAccountId": "16001",
    "success": true
  }
*/
