// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Define interface for Guesty API response
interface GuestyApiResponse {
  _id: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  email?: string;
  emails?: { address: string }[];
  phone?: string;
  phones?: { number: string }[];
  accountId?: string;
  createdAt?: string;
  [key: string]: any; // Allow for additional properties
}

// Define interface for request payload
interface SignUpRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  user_type: string;
  // Additional Guesty fields
  hometown?: string;
  address?: {
    street?: string;
    zipCode?: string;
    state?: string;
    city?: string;
    country?: string;
    countryCode?: string;
  };
  notes?: string;
  tags?: string[];
  goodToKnowNotes?: string;
  preferredLanguage?: string;
  birthday?: string;
  gender?: string;
  maritalStatus?: string;
  dietaryPreferences?: string[];
  allergies?: string[];
  interests?: string[];
  pronouns?: string;
  kids?: number;
  passportNumber?: string;
  identityNumber?: string;
  nationality?: string;
  otaLinks?: Array<{
    type: string;
    url: string;
  }>;
  [key: string]: any; // Allow for any additional fields
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || ""
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || ""
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""

console.log("Auth Sign-Up Function Initialized")

// Function to get a valid Guesty token
async function getGuestyToken(supabase) {
  const { data: tokens, error } = await supabase
    .from("guesty_tokens")
    .select("access_token")
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) throw new Error(`Failed to fetch token: ${error.message}`)
  if (!tokens || tokens.length === 0) throw new Error("No Guesty token available")

  return tokens[0].access_token
}

// Function to create guest in Guesty
async function createGuestyGuest(
  firstName: string, 
  lastName: string, 
  email: string, 
  phone: string, 
  guestyToken: string,
  additionalData: Partial<SignUpRequest> = {}
): Promise<GuestyApiResponse> {
  const guestyUrl = "https://open-api.guesty.com/v1/guests-crud"
  
  // Prepare the guest data according to Guesty API requirements
  const guestData: any = {
    firstName,
    lastName,
    email, // Main email field
    emails: [email], // Email array as required by Guesty
    phone: phone || "", // Main phone field
    contactType: "guest",
    preferredLanguage: additionalData.preferredLanguage || "en"
  }
  
  // Add phones array if phone provided
  if (phone) {
    guestData.phones = [phone];
  }

  // Add optional fields if they exist in the request
  if (additionalData.hometown) guestData.hometown = additionalData.hometown;
  if (additionalData.address) guestData.address = additionalData.address;
  if (additionalData.notes) guestData.notes = additionalData.notes;
  if (additionalData.tags) guestData.tags = additionalData.tags;
  if (additionalData.goodToKnowNotes) guestData.goodToKnowNotes = additionalData.goodToKnowNotes;
  if (additionalData.birthday) guestData.birthday = additionalData.birthday;
  if (additionalData.gender) guestData.gender = additionalData.gender;
  if (additionalData.maritalStatus) guestData.maritalStatus = additionalData.maritalStatus;
  if (additionalData.dietaryPreferences) guestData.dietaryPreferences = additionalData.dietaryPreferences;
  if (additionalData.allergies) guestData.allergies = additionalData.allergies;
  if (additionalData.interests) guestData.interests = additionalData.interests;
  if (additionalData.pronouns) guestData.pronouns = additionalData.pronouns;
  if (additionalData.kids !== undefined) guestData.kids = additionalData.kids;
  if (additionalData.passportNumber) guestData.passportNumber = additionalData.passportNumber;
  if (additionalData.identityNumber) guestData.identityNumber = additionalData.identityNumber;
  if (additionalData.nationality) guestData.nationality = additionalData.nationality;
  if (additionalData.otaLinks) guestData.otaLinks = additionalData.otaLinks;

  console.log("Sending to Guesty API:", JSON.stringify(guestData));

  try {
    // Make the request to Guesty API
    const response = await fetch(guestyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${guestyToken}`,
        "Accept": "application/json"
      },
      body: JSON.stringify(guestData)
    });

    const responseText = await response.text();
    console.log("Guesty API raw response:", responseText);
    
    if (!response.ok) {
      throw new Error(`Failed to create Guesty guest: ${response.status} ${response.statusText} - ${responseText}`);
    }

    try {
      const guestResponse = JSON.parse(responseText) as GuestyApiResponse;
      console.log("Guesty API parsed response:", JSON.stringify(guestResponse));
      
      // Validate that we have an ID
      if (!guestResponse._id) {
        console.error("Guesty response is missing _id field:", JSON.stringify(guestResponse));
        throw new Error("Guesty response is missing _id field");
      }
      
      return guestResponse;
    } catch (parseError) {
      console.error("Failed to parse Guesty API response", parseError);
      throw new Error(`Failed to parse Guesty API response: ${parseError.message}`);
    }
  } catch (fetchError) {
    console.error("Guesty API request error:", fetchError.message);
    throw fetchError;
  }
}

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
    const requestData = await req.json() as SignUpRequest;
    const { 
      email, 
      password, 
      first_name, 
      last_name, 
      phone_number, 
      user_type,
      // Extract optional fields from the request
      ...additionalFields 
    } = requestData;

    // Validate required parameters
    if (!email || !password || !first_name || !last_name) {
      return new Response(
        JSON.stringify({ 
          status: "error",
          message: "Email, password, first name, and last name are required" 
        }),
        { 
          status: 400, 
          headers: corsHeaders
        }
      )
    }

    // Initialize Supabase client with service role key for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Create the user in Supabase auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Automatically confirm email
      user_metadata: {
        first_name,
        last_name,
        phone_number,
        user_type
      }
    })

    if (authError) {
      console.error("Authentication error:", authError)
      return new Response(
        JSON.stringify({ 
          status: "error", 
          message: authError.message
        }),
        { 
          status: 400, 
          headers: corsHeaders
        }
      )
    }

    let guestyResponse: GuestyApiResponse | null = null;
    let guestyUserId: string | null = null;
    
    // Get Guesty token and create guest in Guesty
    try {
      console.log("Attempting to get Guesty token...");
      // Get valid Guesty token
      const guestyToken = await getGuestyToken(supabase);
      console.log("Guesty token retrieved successfully, creating guest...");
      
      // Create guest in Guesty
      guestyResponse = await createGuestyGuest(
        first_name,
        last_name,
        email,
        phone_number,
        guestyToken,
        additionalFields  // Pass additional fields to the function
      );
      
      // Extract the ID from the Guesty response (we're now sure it exists due to validation in createGuestyGuest)
      guestyUserId = guestyResponse._id;
      console.log(`Guesty guest created successfully with ID: ${guestyUserId}`);
    } catch (guestyError) {
      console.error("Guesty integration error:", guestyError instanceof Error ? guestyError.message : String(guestyError));
      // Continue with user creation even if Guesty fails
    }

    // Insert user data into users table
    const userData = {
      email,
      password_hash: null, // We don't store actual password hash, Auth API handles this
      first_name,
      last_name,
      phone_number,
      user_type,
      guesty_user_id: guestyUserId
    };

    console.log("Inserting user data with guesty_user_id:", guestyUserId);
    
    const { data: insertedUserData, error: userError } = await supabase
      .from('users')
      .insert([userData])
      .select();

    if (userError) {
      console.error("Error inserting into users table:", userError)
      return new Response(
        JSON.stringify({ 
          status: "error", 
          message: "User was created in Auth but couldn't be added to the users table",
          details: userError.message
        }),
        { 
          status: 500, 
          headers: corsHeaders
        }
      )
    }

    // Return success with the user data and Guesty information
    return new Response(
      JSON.stringify({
        status: "success",
        message: "User registered successfully",
        user: authData.user,
        user_profile: insertedUserData[0],
        guesty_user_id: guestyUserId,
        guesty_response: guestyResponse // Include the full Guesty response
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/auth-signUp' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{
      "email": "user@example.com", 
      "password": "securepassword", 
      "first_name": "John",
      "last_name": "Doe",
      "phone_number": "+1234567890", 
      "user_type": "guest"
    }'

*/
