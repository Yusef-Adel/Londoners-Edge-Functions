// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

console.log("Update User function loaded!")

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // Get request body
    const requestBody = await req.json()
    const { 
      guestId, 
      firstName,
      lastName,
      hometown,
      address,
      picture,
      email,
      emails,
      phone,
      phones,
      notes,
      tags,
      goodToKnowNotes,
      preferredLanguage,
      birthday,
      gender,
      maritalStatus,
      dietaryPreferences,
      allergies,
      interests,
      pronouns,
      kids,
      passportNumber,
      identityNumber,
      nationality,
      otaLinks
    } = requestBody

    if (!guestId) {
      return new Response(
        JSON.stringify({ error: 'guestId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get Guesty access token from database
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('guesty_tokens')
      .select('access_token')
      .single()

    if (tokenError || !tokenData?.access_token) {
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve Guesty access token' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Prepare update payload (only include fields that are provided)
    const updatePayload: any = {}
    
    if (firstName !== undefined) updatePayload.firstName = firstName
    if (lastName !== undefined) updatePayload.lastName = lastName
    if (hometown !== undefined) updatePayload.hometown = hometown
    if (address !== undefined) updatePayload.address = address
    if (picture !== undefined) updatePayload.picture = picture
    if (email !== undefined) updatePayload.email = email
    if (emails !== undefined) updatePayload.emails = emails
    if (phone !== undefined) updatePayload.phone = phone
    if (phones !== undefined) updatePayload.phones = phones
    if (notes !== undefined) updatePayload.notes = notes
    if (tags !== undefined) updatePayload.tags = tags
    if (goodToKnowNotes !== undefined) updatePayload.goodToKnowNotes = goodToKnowNotes
    if (preferredLanguage !== undefined) updatePayload.preferredLanguage = preferredLanguage
    if (birthday !== undefined) updatePayload.birthday = birthday
    if (gender !== undefined) updatePayload.gender = gender
    if (maritalStatus !== undefined) updatePayload.maritalStatus = maritalStatus
    if (dietaryPreferences !== undefined) updatePayload.dietaryPreferences = dietaryPreferences
    if (allergies !== undefined) updatePayload.allergies = allergies
    if (interests !== undefined) updatePayload.interests = interests
    if (pronouns !== undefined) updatePayload.pronouns = pronouns
    if (kids !== undefined) updatePayload.kids = kids
    if (passportNumber !== undefined) updatePayload.passportNumber = passportNumber
    if (identityNumber !== undefined) updatePayload.identityNumber = identityNumber
    if (nationality !== undefined) updatePayload.nationality = nationality
    if (otaLinks !== undefined) updatePayload.otaLinks = otaLinks

    // Make PATCH request to Guesty API
    const guestyResponse = await fetch(`https://open-api.guesty.com/v1/guests-crud/${guestId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload)
    })

    if (!guestyResponse.ok) {
      const errorText = await guestyResponse.text()
      return new Response(
        JSON.stringify({ 
          error: 'Failed to update guest information in Guesty',
          details: errorText,
          status: guestyResponse.status
        }),
        {
          status: guestyResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const updatedGuestData = await guestyResponse.json()

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Guest updated successfully',
        data: updatedGuestData 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in update-user function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/update-user' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"guestId":"GUEST_ID_HERE","firstName":"John","lastName":"Doe","email":"john.doe@example.com","tags":["vip"]}'

*/
