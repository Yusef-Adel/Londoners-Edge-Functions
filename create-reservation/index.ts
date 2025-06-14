// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Import Deno standard library functions required for edge functions
import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Define interfaces for our data structures
interface ReservationRequest {
  quoteId: string;
  ratePlanId?: string;
  reservedUntil?: number;
  guestId?: string;
  guest?: {
    firstName: string;
    lastName: string;
    phones: string[];
    email: string;
    address?: object;
  };
  ignoreCalendar?: boolean;
  ignoreTerms?: boolean;
  ignoreBlocks?: boolean;
  confirmedAt?: string;
  confirmationCode?: string;
  origin?: string;
  originId?: string;
}

interface GuestyReservationRequest {
  quoteId: string;
  status: string;
  ratePlanId?: string;
  reservedUntil?: number;
  guestId?: string;
  guest?: {
    firstName: string;
    lastName: string;
    phones: string[];
    email: string;
    address?: object;
  };
  ignoreCalendar?: boolean;
  ignoreTerms?: boolean;
  ignoreBlocks?: boolean;
  confirmedAt?: string;
  confirmationCode?: string;
  origin?: string;
  originId?: string;
}

interface GuestyReservationResponse {
  _id?: string;
  reservationId?: string;
  status: string;
  confirmationCode?: string;
  // Other fields would be here
}

console.log("Create Reservation Function initialized");

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
    const requestData: ReservationRequest = await req.json();

    // Validate required fields
    if (!requestData.quoteId) {
      return new Response(JSON.stringify({ error: "Missing required field: quoteId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate that either guestId or guest object is provided
    if (!requestData.guestId && !requestData.guest) {
      return new Response(JSON.stringify({ error: "Either guestId or guest object is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // If guest object is provided, validate required fields
    if (requestData.guest) {
      const requiredGuestFields = ["firstName", "lastName", "phones", "email"];
      for (const field of requiredGuestFields) {
        if (!requestData.guest[field as keyof typeof requestData.guest]) {
          return new Response(JSON.stringify({ error: `Missing required guest field: ${field}` }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
      }

      // Validate phones array is not empty
      if (!Array.isArray(requestData.guest.phones) || requestData.guest.phones.length === 0) {
        return new Response(JSON.stringify({ error: "Guest phones must be a non-empty array" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
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

    // Prepare the reservation request for Guesty API
    const guestyReservationRequest: GuestyReservationRequest = {
      quoteId: requestData.quoteId,
      status: "confirmed", // Set status to confirmed as requested
      ratePlanId: requestData.ratePlanId,
      reservedUntil: requestData.reservedUntil ?? -1, // Default to -1 (no limit)
      guestId: requestData.guestId,
      guest: requestData.guest,
      ignoreCalendar: requestData.ignoreCalendar,
      ignoreTerms: requestData.ignoreTerms,
      ignoreBlocks: requestData.ignoreBlocks,
      confirmedAt: requestData.confirmedAt,
      confirmationCode: requestData.confirmationCode,
      origin: requestData.origin,
      originId: requestData.originId,
    };

    console.log("Sending reservation request to Guesty API:", JSON.stringify(guestyReservationRequest));

    // Call Guesty API to create a reservation from the quote
    const reservationResponse = await fetch("https://open-api.guesty.com/v1/reservations-v3/quote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${guestyToken}`,
      },
      body: JSON.stringify(guestyReservationRequest),
    });

    if (!reservationResponse.ok) {
      const errorText = await reservationResponse.text();
      console.error("Guesty Reservation API error:", errorText);
      return new Response(JSON.stringify({ 
        error: `Guesty Reservation API error: ${reservationResponse.status}`, 
        details: errorText 
      }), {
        status: reservationResponse.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse the reservation response
    const reservationData: GuestyReservationResponse = await reservationResponse.json();
    
    console.log("Reservation created successfully:", JSON.stringify(reservationData));

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        reservation: reservationData,
        message: "Reservation created successfully with confirmed status"
      }),
      { 
        status: 200,
        headers: { "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        error: "An unexpected error occurred", 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      },
    );
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request using the curl command below
  
  Example with guestId:
  curl -i --location --request POST 'http://localhost:54321/functions/v1/create-reservation' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "quoteId": "your-quote-id-here",
    "guestId": "existing-guest-id",
    "ratePlanId": "optional-rate-plan-id",
    "reservedUntil": -1,
    "ignoreCalendar": false,
    "ignoreTerms": false,
    "ignoreBlocks": false,
    "confirmationCode": "CONF123",
    "origin": "website",
    "originId": "web-001"
  }'

  Example with new guest:
  curl -i --location --request POST 'http://localhost:54321/functions/v1/create-reservation' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "quoteId": "your-quote-id-here",
    "guest": {
      "firstName": "John",
      "lastName": "Doe",
      "phones": ["+1234567890"],
      "email": "john.doe@example.com",
      "address": {
        "street": "123 Main St",
        "city": "Anytown",
        "state": "CA",
        "zipCode": "12345"
      }
    },
    "ratePlanId": "optional-rate-plan-id",
    "reservedUntil": -1,
    "ignoreCalendar": false,
    "ignoreTerms": false,
    "ignoreBlocks": false,
    "confirmationCode": "CONF123",
    "origin": "website",
    "originId": "web-001"
  }'
*/