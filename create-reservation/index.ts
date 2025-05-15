// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Import Deno standard library functions required for edge functions
import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Define interfaces for our data structures
interface ReservationRequest {
  check_in_date_localized: string;
  check_out_date_localized: string;
  listing_id: string;
  source: string;
  guests_count: number;
  guest_id: string; // Required for creating reservation from quote
  number_of_adults: number;
  number_of_children?: number;
  number_of_infants?: number;
  number_of_pets?: number;
  ignore_calendar?: boolean;
  ignore_terms?: boolean;
  ignore_blocks?: boolean;
  coupon_code?: string;
  channel?: string;
}

interface GuestyQuoteRequest {
  listingId: string;
  checkInDateLocalized: string;
  checkOutDateLocalized: string;
  guestsCount: number;
  source: string;
  ignoreCalendar?: boolean;
  ignoreTerms?: boolean;
  ignoreBlocks?: boolean;
  couponCode?: string | null;
  numberOfGuests?: {
    numberOfChildren?: number;
    numberOfInfants?: number;
    numberOfPets?: number;
    numberOfAdults: number;
  };
}

interface GuestyQuoteResponse {
  _id: string; // Quote ID
  rates?: {
    ratePlans?: Array<{
      money?: {
        rateId?: string;
      };
      ratePlan?: {
        _id?: string;
      };
    }>;
  };
  // Other fields would be here
}

interface GuestyReservationRequest {
  quoteId: string;
  status: string;
  ratePlanId?: string;
  reservedUntil?: number;
  guestId: string;
  ignoreCalendar?: boolean;
  ignoreTerms?: boolean;
  ignoreBlocks?: boolean;
  confirmationCode?: string;
  origin?: string;
  originId?: string;
}

interface GuestyReservationResponse {
  reservationId?: string;            // New format
  _id?: string;                      // Old format
  guest?: {
    _id: string;                     // Guest ID
  };
  guestId?: string;                  // New format
  listing?: {
    _id?: string;                    // Listing ID
    unitTypeId?: string;
  };
  unitId?: string;                   // New format
  unitTypeId?: string;               // New format
  checkIn?: string;                  // Old format
  checkOut?: string;                 // Old format
  checkInDate?: string;              // New format
  checkOutDate?: string;             // New format
  status: string;
  confirmationCode?: string;
  numberOfGuests?: number | {
    numberOfAdults?: number;
    numberOfChildren?: number;
    numberOfInfants?: number;
    numberOfPets?: number;
  };
  quoteId?: string;                  // New format
  creationTime?: string;             // New format
  source?: string;                   // New format
  channel?: string;                  // New format
  guestsCount?: number;              // New format
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
    const requiredFields = ["check_in_date_localized", "check_out_date_localized", "listing_id", "source", 
      "guests_count", "guest_id", "number_of_adults"];
    for (const field of requiredFields) {
      if (!requestData[field as keyof ReservationRequest]) {
        return new Response(JSON.stringify({ error: `Missing required field: ${field}` }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Validate guests_count is at least 1
    if (requestData.guests_count < 1 || requestData.number_of_adults < 1) {
      return new Response(JSON.stringify({ error: "guests_count and number_of_adults must be at least 1" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate dates
    const checkInDate = new Date(requestData.check_in_date_localized);
    const checkOutDate = new Date(requestData.check_out_date_localized);
    
    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return new Response(JSON.stringify({ error: "Invalid date format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (checkInDate >= checkOutDate) {
      return new Response(JSON.stringify({ error: "Check-in date must be before check-out date" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
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

    // STEP 1: Create a quote with Guesty API
    // Prepare the data for Guesty API (quote creation)
    const guestyQuoteRequest: GuestyQuoteRequest = {
      listingId: requestData.listing_id,
      checkInDateLocalized: requestData.check_in_date_localized,
      checkOutDateLocalized: requestData.check_out_date_localized,
      guestsCount: requestData.guests_count,
      source: requestData.source,
      ignoreCalendar: requestData.ignore_calendar,
      ignoreTerms: requestData.ignore_terms,
      ignoreBlocks: requestData.ignore_blocks,
      couponCode: requestData.coupon_code || null,
      numberOfGuests: {
        numberOfAdults: requestData.number_of_adults,
        numberOfChildren: requestData.number_of_children,
        numberOfInfants: requestData.number_of_infants,
        numberOfPets: requestData.number_of_pets,
      }
    };
    
    console.log("Sending quote request to Guesty API:", JSON.stringify(guestyQuoteRequest));
    
    // Call Guesty API to create a quote
    const quoteResponse = await fetch("https://open-api.guesty.com/v1/quotes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${guestyToken}`,
      },
      body: JSON.stringify(guestyQuoteRequest),
    });

    if (!quoteResponse.ok) {
      const errorText = await quoteResponse.text();
      console.error("Guesty Quote API error:", errorText);
      return new Response(JSON.stringify({ error: `Guesty Quote API error: ${quoteResponse.status}`, details: errorText }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    console.log("Quote response received successfully");
    const quoteData: GuestyQuoteResponse = await quoteResponse.json();
    const quoteId = quoteData._id;
    
    // Extract the rate plan ID from the nested structure
    let ratePlanId: string | undefined = undefined;
    console.log("Quote data rates:", JSON.stringify(quoteData.rates));
    
    if (quoteData.rates?.ratePlans && quoteData.rates.ratePlans.length > 0) {
      console.log("Rate plans found:", quoteData.rates.ratePlans.length);
      
      const firstRatePlan = quoteData.rates.ratePlans[0];
      console.log("First rate plan:", JSON.stringify(firstRatePlan));
      
      // First try to get it from money.rateId
      if (firstRatePlan.money?.rateId) {
        console.log("Found rate plan ID in money.rateId");
        ratePlanId = firstRatePlan.money.rateId;
      }
      // If not found, try to get it from ratePlan._id
      else if (firstRatePlan.ratePlan?._id) {
        console.log("Found rate plan ID in ratePlan._id");
        ratePlanId = firstRatePlan.ratePlan._id;
      }
    }

    console.log("Quote ID:", quoteId);
    console.log("Rate Plan ID:", ratePlanId);
    console.log("Full quote response:", JSON.stringify(quoteData));

    // STEP 2: Create a reservation with the quote
    const guestyReservationRequest: GuestyReservationRequest = {
      quoteId: quoteId,
      status: "reserved", // Initial status as 'reserved'
      ratePlanId: ratePlanId,
      reservedUntil: -1, // No limit (-1)
      guestId: requestData.guest_id,
      ignoreCalendar: requestData.ignore_calendar,
      ignoreTerms: requestData.ignore_terms,
      ignoreBlocks: requestData.ignore_blocks,
    };

    // Log the reservation request for debugging
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
      return new Response(JSON.stringify({ error: `Guesty Reservation API error: ${reservationResponse.status}`, details: errorText }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
      // Parse the reservation data with proper error handling
    let reservationData: GuestyReservationResponse;
    try {
      reservationData = await reservationResponse.json();
      
      console.log("Raw reservation data received:", JSON.stringify(reservationData));
      
      // Validate that we have the minimum required fields - either new or old format
      const reservationId = reservationData.reservationId || reservationData._id;
      if (!reservationData || !reservationId) {
        throw new Error("Missing required reservation ID from API response");
      }
      
      // Assign the reservation ID to the _id field for backward compatibility
      reservationData._id = reservationId;
      
      // Log full reservation data structure to understand what's available
      console.log("Full reservation data structure:", JSON.stringify(reservationData));
    } catch (parseError) {
      console.error("Failed to parse reservation data:", parseError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to parse reservation data from Guesty API", 
          details: parseError.message,
          rawResponse: typeof reservationResponse.text === 'function' ? await reservationResponse.clone().text() : 'Unable to get raw response'
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );    }
    
    // STEP 3: Update reservation status to "awaiting_payment"
    const updateReservationResponse = await fetch(`https://open-api.guesty.com/v1/reservations-v3/${reservationData._id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${guestyToken}`,
      },
      body: JSON.stringify({ status: "awaiting_payment" }),
    });
    
    if (!updateReservationResponse.ok) {
      const errorText = await updateReservationResponse.text();
      console.error("Guesty Update Reservation Status API error:", errorText);
      // Continue anyway, we've created the reservation successfully
    }
    
    // STEP 4: Store the reservation in our database
    // Properly handle date parsing to avoid "Invalid time value" error
    let checkInDateTime: Date;
    let checkOutDateTime: Date;
    
    // Function to safely parse dates, ensuring a valid date format for PostgreSQL
    const parseDate = (dateStr: string): Date => {
      // Try to parse the date string
      const parsedDate = new Date(dateStr);
      
      // Check if the result is a valid date
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
      
      // If it's not valid, try to convert from common formats
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        // Format: YYYY-MM-DD (add time to ensure it's parsed correctly)
        return new Date(`${dateStr}T00:00:00Z`);
      }
      
      // If all parsing fails, throw an error
      throw new Error(`Invalid date format: ${dateStr}`);
    };
    
    try {      // Attempt to parse dates from the Guesty API response
      try {
        // Try both old and new date formats
        const checkInString = reservationData.checkInDate || reservationData.checkIn;
        const checkOutString = reservationData.checkOutDate || reservationData.checkOut;
        
        if (!checkInString || !checkOutString) {
          throw new Error("Missing check-in or check-out dates in API response");
        }
        
        checkInDateTime = parseDate(checkInString);
        checkOutDateTime = parseDate(checkOutString);
        
        console.log("Successfully parsed dates from Guesty API:", { 
          checkIn: checkInDateTime.toISOString(), 
          checkOut: checkOutDateTime.toISOString(),
          source: checkInString === reservationData.checkInDate ? "new format" : "old format" 
        });
      } catch (dateParseError) {
        console.error("Invalid date format received from Guesty API:", { 
          checkInDate: reservationData.checkInDate, 
          checkOutDate: reservationData.checkOutDate,
          checkIn: reservationData.checkIn,
          checkOut: reservationData.checkOut,
          error: dateParseError.message || "Unknown date parse error"
        });
        
        // Fall back to using the original request dates if API returned invalid dates
        checkInDateTime = parseDate(requestData.check_in_date_localized);
        checkOutDateTime = parseDate(requestData.check_out_date_localized);
        console.log("Using fallback dates from request:", { 
          checkIn: checkInDateTime.toISOString(), 
          checkOut: checkOutDateTime.toISOString() 
        });
      }
    } catch (error) {
      console.error("Error handling dates:", error);
      return new Response(
        JSON.stringify({ error: "Failed to process reservation dates", details: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }    const now = new Date();
    const expirationTime = new Date();
    expirationTime.setHours(expirationTime.getHours() + 24); // Set expiration to 24 hours from now
    
    // Format dates properly for PostgreSQL
    const formatDateForDB = (date: Date): string => {
      if (!date || isNaN(date.getTime())) {
        throw new Error("Invalid date object");
      }
      
      // Format as ISO string for PostgreSQL TIMESTAMP WITH TIME ZONE
      // This format is universally accepted by PostgreSQL
      return date.toISOString();
    };    // Log reservation data to help debug undefined issues
    console.log("Reservation data for database record:", {
      reservationId: reservationData._id,
      hasListing: !!reservationData.listing || !!reservationData.unitId, // Check both formats
      listingDetails: reservationData.listing ? {
        id: reservationData.listing._id,
        hasUnitTypeId: !!reservationData.listing.unitTypeId
      } : (reservationData.unitId ? `unitId: ${reservationData.unitId}` : 'listing info is undefined')
    });    // Extract listing information safely with fallbacks - try new format first, then old format, then request data
    const unitTypeId = reservationData.unitTypeId || reservationData.listing?.unitTypeId || null;
    const unitId = reservationData.unitId || reservationData.listing?._id || requestData.listing_id;
    
    // Get the guest ID directly from the Guesty API response (preferred) or from the request
    const guestyGuestId = reservationData.guestId || requestData.guest_id;
    console.log("Using Guesty guest ID for database record:", guestyGuestId);
      // Get the Guesty reservation ID from the response
    const guestyReservationId = reservationData.reservationId || reservationData._id;
    
    // Prepare the database record with proper date formatting
    const reservationRecord = {
      guest_id: guestyGuestId,// Using a numeric value for the database
      status: "awaiting_payment",
      check_in: formatDateForDB(checkInDateTime),
      check_out: formatDateForDB(checkOutDateTime),
      quote_id: quoteId,
      confirmation_code: reservationData.confirmationCode || null,
      number_of_children: requestData.number_of_children || 0,
      number_of_infants: requestData.number_of_infants || 0,
      number_of_pets: requestData.number_of_pets || 0,
      number_of_adults: requestData.number_of_adults,
      creation_time: formatDateForDB(now),
      reserved_expires_at: formatDateForDB(expirationTime),
      check_in_date: requestData.check_in_date_localized,
      check_out_date: requestData.check_out_date_localized,
      unit_type_id: unitTypeId,
      unit_id: unitId, // Using the safely extracted values
      source: requestData.source,
      channel: requestData.channel || "direct",
      guests_count: requestData.guests_count,
      guesty_reservation_id: guestyReservationId, // Adding the Guesty reservation ID
      // creation_info can be added as needed
    };
    
    console.log("Inserting reservation record:", JSON.stringify(reservationRecord));
    
    try {
      // Store the reservation in the database
      const { data: storedReservation, error: reservationStoreError } = await supabase
        .from("reservations")
        .insert([reservationRecord])
        .select();
        
      if (reservationStoreError) {
        console.error("Error storing reservation:", reservationStoreError);
        return new Response(
          JSON.stringify({ error: "Failed to store reservation in database", details: reservationStoreError }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      // Make sure storedReservation exists and has at least one record
      if (!storedReservation || storedReservation.length === 0) {
        return new Response(
          JSON.stringify({ error: "Reservation was created but no data was returned from database" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
      
      // Return a success response with both the Guesty reservation data and our database record
      return new Response(
        JSON.stringify({
          success: true,
          reservation_id: storedReservation[0].reservation_id,
          guesty_reservation: reservationData,
          database_record: storedReservation[0],
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    } catch (dbError) {
      console.error("Error storing reservation in database:", dbError);
      return new Response(
        JSON.stringify({ error: "Failed to store reservation", details: dbError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }    // This return statement is already inside the try/catch block in the updated code
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request using the curl command below
  
  curl -i --location --request POST 'http://localhost:54321/functions/v1/create-reservation' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "check_in_date_localized": "2025-06-01",
    "check_out_date_localized": "2025-06-07",
    "listing_id": "abc123",
    "source": "website",
    "guests_count": 2,
    "guest_id": "guest123",
    "number_of_adults": 2,
    "number_of_children": 0,
    "number_of_infants": 0,
    "number_of_pets": 0,
    "ignore_calendar": false,
    "ignore_terms": false,
    "ignore_blocks": false,
    "coupon_code": "SUMMER10",
    "channel": "direct"
  }'
*/