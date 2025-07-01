// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

// Interface for review submission request
interface ReviewSubmissionRequest {
  listing_id: string;
  guest_id: string;
  review_text: string;
  ratings: {
    cleanliness: number;
    accuracy: number;
    check_in: number;
    communication: number;
    location: number;
    value: number;
  };
}

// Interface for review response
interface ReviewResponse {
  review_id: number;
  overall_rating: number;
  ratings: {
    cleanliness: number;
    accuracy: number;
    check_in: number;
    communication: number;
    location: number;
    value: number;
  };
}

// Function to calculate overall rating from individual ratings
function calculateOverallRating(ratings: ReviewSubmissionRequest['ratings']): number {
  const { cleanliness, accuracy, check_in, communication, location, value } = ratings;
  const totalRating = cleanliness + accuracy + check_in + communication + location + value;
  const averageRating = totalRating / 6;
  
  // Round to 1 decimal place
  return Math.round(averageRating * 10) / 10;
}

// Function to validate rating values (should be between 1 and 5)
function validateRatings(ratings: ReviewSubmissionRequest['ratings']): boolean {
  const ratingValues = Object.values(ratings);
  return ratingValues.every(rating => 
    typeof rating === 'number' && 
    rating >= 1 && 
    rating <= 5 && 
    Number.isFinite(rating)
  );
}

console.log("Add Review Function initialized")

Deno.serve(async (req) => {
  try {
    // Set CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    // Check if it's a POST request
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ 
          status: "error",
          message: 'Method not allowed' 
        }),
        { 
          status: 405,
          headers: { 
            ...corsHeaders,
            'Allow': 'POST'
          } 
        }
      );
    }

    // Parse the request body
    const requestBody: ReviewSubmissionRequest = await req.json();
    console.log("Received review submission:", JSON.stringify(requestBody));

    // Validate required fields
    if (!requestBody.listing_id || !requestBody.guest_id) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Missing required fields: listing_id or guest_id"
        }),
        { 
          status: 400,
          headers: corsHeaders 
        }
      );
    }

    // Validate ratings
    if (!requestBody.ratings || !validateRatings(requestBody.ratings)) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Invalid ratings. All ratings must be numbers between 1 and 5"
        }),
        { 
          status: 400,
          headers: corsHeaders 
        }
      );
    }

    // Calculate overall rating
    const overallRating = calculateOverallRating(requestBody.ratings);
    console.log(`Calculated overall rating: ${overallRating}`);

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if user has already reviewed this listing
    const { data: existingReview, error: checkError } = await supabase
      .from('reviews')
      .select('review_id')
      .eq('listing_id', requestBody.listing_id)
      .eq('guest_id', requestBody.guest_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing review:', checkError);
      throw new Error(`Database error: ${checkError.message}`);
    }

    if (existingReview) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: "You have already submitted a review for this listing"
        }),
        { 
          status: 409,
          headers: corsHeaders 
        }
      );
    }

    // Insert the main review record
    const { data: reviewData, error: reviewError } = await supabase
      .from('reviews')
      .insert({
        listing_id: requestBody.listing_id,
        guest_id: requestBody.guest_id,
        review_text: requestBody.review_text || '',
        overall_rating: overallRating
      })
      .select('review_id')
      .single();

    if (reviewError) {
      console.error('Error inserting review:', reviewError);
      throw new Error(`Failed to create review: ${reviewError.message}`);
    }

    console.log(`Review created with ID: ${reviewData.review_id}`);

    // Insert the detailed ratings
    const { error: ratingsError } = await supabase
      .from('review_ratings')
      .insert({
        review_id: reviewData.review_id,
        cleanliness: requestBody.ratings.cleanliness,
        accuracy: requestBody.ratings.accuracy,
        check_in: requestBody.ratings.check_in,
        communication: requestBody.ratings.communication,
        location: requestBody.ratings.location,
        value: requestBody.ratings.value
      });

    if (ratingsError) {
      console.error('Error inserting ratings:', ratingsError);
      
      // Rollback: Delete the review if ratings insertion failed
      await supabase
        .from('reviews')
        .delete()
        .eq('review_id', reviewData.review_id);
      
      throw new Error(`Failed to save ratings: ${ratingsError.message}`);
    }

    console.log(`Ratings saved for review ID: ${reviewData.review_id}`);

    // Prepare response
    const response: ReviewResponse = {
      review_id: reviewData.review_id,
      overall_rating: overallRating,
      ratings: requestBody.ratings
    };

    return new Response(
      JSON.stringify({
        status: "success",
        message: "Review submitted successfully",
        data: response
      }),
      { 
        status: 201,
        headers: corsHeaders 
      }
    );

  } catch (error) {
    console.error('Error in add-review function:', error);
    
    return new Response(
      JSON.stringify({ 
        status: "error",
        message: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' 
        } 
      }
    );
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  Submit a review with ratings:
  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/add-review' \
    --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
    --header 'Content-Type: application/json' \
    --data '{
      "listing_id": "listing_789",
      "guest_id": "guest_456",
      "review_text": "Perfect base for exploring London. Family of five fitted comfortably. Immaculately clean. Easy walk to multiple tube stations. Nice neighborhood and quiet street with very little traffic. Easy to find.",
      "ratings": {
        "cleanliness": 4.6,
        "accuracy": 4.2,
        "check_in": 4.6,
        "communication": 4.6,
        "location": 4.6,
        "value": 4.6
      }
    }'

  Example response:
  {
    "status": "success",
    "message": "Review submitted successfully",
    "data": {
      "review_id": 1,
      "overall_rating": 4.5,
      "ratings": {
        "cleanliness": 4.6,
        "accuracy": 4.2,
        "check_in": 4.6,
        "communication": 4.6,
        "location": 4.6,
        "value": 4.6
      }
    }
  }

*/
