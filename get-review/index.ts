// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

// Interface for get reviews request
interface GetReviewsRequest {
  listing_id: string;
  limit?: number;
  offset?: number;
  sort_by?: 'newest' | 'oldest' | 'rating_high' | 'rating_low';
}

// Interface for individual review response
interface ReviewDetails {
  review_id: number;
  guest_id: string;
  review_text: string;
  overall_rating: number;
  created_at: string;
  ratings: {
    cleanliness: number;
    accuracy: number;
    check_in: number;
    communication: number;
    location: number;
    value: number;
  };
}

// Interface for review statistics
interface ReviewStatistics {
  total_reviews: number;
  overall_average_rating: number;
  rating_distribution: {
    [key: string]: number; // "5": 10, "4": 5, etc.
  };
  category_averages: {
    cleanliness: number;
    accuracy: number;
    check_in: number;
    communication: number;
    location: number;
    value: number;
  };
}

// Interface for complete response
interface GetReviewsResponse {
  listing_id: string;
  listing_status: 'has_reviews' | 'no_reviews' | 'unknown';
  statistics: ReviewStatistics;
  reviews: ReviewDetails[];
  pagination: {
    total_count: number;
    current_page: number;
    total_pages: number;
    has_next_page: boolean;
    has_previous_page: boolean;
  };
}

// Function to calculate rating distribution
function calculateRatingDistribution(ratings: number[]): { [key: string]: number } {
  const distribution = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  
  ratings.forEach(rating => {
    const rounded = Math.round(rating);
    if (rounded >= 1 && rounded <= 5) {
      distribution[rounded.toString()]++;
    }
  });
  
  return distribution;
}

// Function to calculate average ratings for categories
function calculateCategoryAverages(reviewRatings: any[]): ReviewStatistics['category_averages'] {
  if (reviewRatings.length === 0) {
    return {
      cleanliness: 0,
      accuracy: 0,
      check_in: 0,
      communication: 0,
      location: 0,
      value: 0
    };
  }

  const totals = {
    cleanliness: 0,
    accuracy: 0,
    check_in: 0,
    communication: 0,
    location: 0,
    value: 0
  };

  reviewRatings.forEach(rating => {
    totals.cleanliness += rating.cleanliness || 0;
    totals.accuracy += rating.accuracy || 0;
    totals.check_in += rating.check_in || 0;
    totals.communication += rating.communication || 0;
    totals.location += rating.location || 0;
    totals.value += rating.value || 0;
  });

  const count = reviewRatings.length;
  return {
    cleanliness: Math.round((totals.cleanliness / count) * 10) / 10,
    accuracy: Math.round((totals.accuracy / count) * 10) / 10,
    check_in: Math.round((totals.check_in / count) * 10) / 10,
    communication: Math.round((totals.communication / count) * 10) / 10,
    location: Math.round((totals.location / count) * 10) / 10,
    value: Math.round((totals.value / count) * 10) / 10
  };
}

console.log("Get Review Function initialized")

Deno.serve(async (req) => {
  try {
    // Set CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
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

    // Check if it's a POST or GET request
    if (req.method !== 'POST' && req.method !== 'GET') {
      return new Response(
        JSON.stringify({ 
          status: "error",
          message: 'Method not allowed. Use POST or GET.' 
        }),
        { 
          status: 405,
          headers: { 
            ...corsHeaders,
            'Allow': 'POST, GET'
          } 
        }
      );
    }

    let requestBody: GetReviewsRequest;

    // Parse request based on method
    if (req.method === 'POST') {
      requestBody = await req.json();
    } else {
      // GET method - parse query parameters
      const url = new URL(req.url);
      const listing_id = url.searchParams.get('listing_id');
      const limit = url.searchParams.get('limit');
      const offset = url.searchParams.get('offset');
      const sort_by = url.searchParams.get('sort_by') as GetReviewsRequest['sort_by'];

      if (!listing_id) {
        return new Response(
          JSON.stringify({
            status: "error",
            message: "Missing required parameter: listing_id"
          }),
          { 
            status: 400,
            headers: corsHeaders 
          }
        );
      }

      requestBody = {
        listing_id,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
        sort_by: sort_by || 'newest'
      };
    }

    console.log("Received get reviews request:", JSON.stringify(requestBody));

    // Validate required fields
    if (!requestBody.listing_id) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Missing required field: listing_id"
        }),
        { 
          status: 400,
          headers: corsHeaders 
        }
      );
    }

    // Set default values
    const limit = requestBody.limit && requestBody.limit > 0 ? Math.min(requestBody.limit, 100) : 20;
    const offset = requestBody.offset && requestBody.offset >= 0 ? requestBody.offset : 0;
    const sortBy = requestBody.sort_by || 'newest';

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get total count for pagination and validate listing exists
    const { count: totalCount, error: countError } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('listing_id', requestBody.listing_id);

    if (countError) {
      console.error('Error getting review count:', countError);
      throw new Error(`Failed to get review count: ${countError.message}`);
    }

    // Determine listing status
    const listingStatus: GetReviewsResponse['listing_status'] = 
      totalCount === null ? 'unknown' : 
      totalCount === 0 ? 'no_reviews' : 'has_reviews';

    console.log(`Listing ${requestBody.listing_id} status: ${listingStatus} (${totalCount || 0} reviews)`);

    // OPTION 1: Return 404 error for listings with no reviews (strict validation)
    // Uncomment this if you want to return an error for non-existent listings
    if (listingStatus === 'no_reviews') {
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Listing not found or has no reviews",
          code: "LISTING_NOT_FOUND",
          listing_id: requestBody.listing_id
        }),
        { 
          status: 404,
          headers: corsHeaders 
        }
      );
    }

    // OPTION 2: Continue and return empty results with status indicator (current behavior)
    // This is useful if you want to show "No reviews yet" in your UI
    // Comment out the above if block if you prefer this approach

    // Build sort clause
    let orderClause = 'created_at.desc'; // default: newest first
    switch (sortBy) {
      case 'oldest':
        orderClause = 'created_at.asc';
        break;
      case 'rating_high':
        orderClause = 'overall_rating.desc';
        break;
      case 'rating_low':
        orderClause = 'overall_rating.asc';
        break;
      default:
        orderClause = 'created_at.desc';
    }

    // Get reviews with ratings
    const { data: reviewsData, error: reviewsError } = await supabase
      .from('reviews')
      .select(`
        review_id,
        guest_id,
        review_text,
        overall_rating,
        created_at,
        review_ratings (
          cleanliness,
          accuracy,
          check_in,
          communication,
          location,
          value
        )
      `)
      .eq('listing_id', requestBody.listing_id)
      .order(orderClause.split('.')[0], { ascending: orderClause.includes('asc') })
      .range(offset, offset + limit - 1);

    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError);
      throw new Error(`Failed to fetch reviews: ${reviewsError.message}`);
    }

    console.log(`Found ${reviewsData?.length || 0} reviews for listing ${requestBody.listing_id}`);

    // Get all review ratings for statistics (not paginated)
    const { data: allRatingsData, error: ratingsError } = await supabase
      .from('reviews')
      .select(`
        overall_rating,
        review_ratings (
          cleanliness,
          accuracy,
          check_in,
          communication,
          location,
          value
        )
      `)
      .eq('listing_id', requestBody.listing_id);

    if (ratingsError) {
      console.error('Error fetching ratings for statistics:', ratingsError);
      throw new Error(`Failed to fetch ratings: ${ratingsError.message}`);
    }

    // Transform reviews data
    const reviews: ReviewDetails[] = (reviewsData || []).map(review => ({
      review_id: review.review_id,
      guest_id: review.guest_id,
      review_text: review.review_text || '',
      overall_rating: review.overall_rating || 0,
      created_at: review.created_at,
      ratings: {
        cleanliness: review.review_ratings?.[0]?.cleanliness || 0,
        accuracy: review.review_ratings?.[0]?.accuracy || 0,
        check_in: review.review_ratings?.[0]?.check_in || 0,
        communication: review.review_ratings?.[0]?.communication || 0,
        location: review.review_ratings?.[0]?.location || 0,
        value: review.review_ratings?.[0]?.value || 0
      }
    }));

    // Calculate statistics
    const overallRatings = (allRatingsData || []).map(r => r.overall_rating || 0);
    const overallAverage = overallRatings.length > 0 
      ? Math.round((overallRatings.reduce((sum, rating) => sum + rating, 0) / overallRatings.length) * 10) / 10
      : 0;

    const ratingDistribution = calculateRatingDistribution(overallRatings);
    const allReviewRatings = (allRatingsData || []).map(r => r.review_ratings?.[0]).filter(Boolean);
    const categoryAverages = calculateCategoryAverages(allReviewRatings);

    const statistics: ReviewStatistics = {
      total_reviews: totalCount || 0,
      overall_average_rating: overallAverage,
      rating_distribution: ratingDistribution,
      category_averages: categoryAverages
    };

    // Calculate pagination info
    const totalPages = Math.ceil((totalCount || 0) / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    const pagination = {
      total_count: totalCount || 0,
      current_page: currentPage,
      total_pages: totalPages,
      has_next_page: currentPage < totalPages,
      has_previous_page: currentPage > 1
    };

    // Prepare response
    const response: GetReviewsResponse = {
      listing_id: requestBody.listing_id,
      listing_status: listingStatus,
      statistics,
      reviews,
      pagination
    };

    return new Response(
      JSON.stringify({
        status: "success",
        message: "Reviews retrieved successfully",
        data: response
      }),
      { 
        status: 200,
        headers: corsHeaders 
      }
    );

  } catch (error) {
    console.error('Error in get-review function:', error);
    
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

  GET method:
  curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/get-review?listing_id=listing_789&limit=10&sort_by=newest' \
    --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY'

  POST method:
  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-review' \
    --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
    --header 'Content-Type: application/json' \
    --data '{
      "listing_id": "listing_789",
      "limit": 10,
      "offset": 0,
      "sort_by": "newest"
    }'

  Example response:
  {
    "status": "success",
    "message": "Reviews retrieved successfully",
    "data": {
      "listing_id": "listing_789",
      "statistics": {
        "total_reviews": 15,
        "overall_average_rating": 4.3,
        "rating_distribution": {
          "1": 0,
          "2": 1,
          "3": 2,
          "4": 7,
          "5": 5
        },
        "category_averages": {
          "cleanliness": 4.5,
          "accuracy": 4.2,
          "check_in": 4.4,
          "communication": 4.6,
          "location": 4.3,
          "value": 4.1
        }
      },
      "reviews": [...],
      "pagination": {
        "total_count": 15,
        "current_page": 1,
        "total_pages": 2,
        "has_next_page": true,
        "has_previous_page": false
      }
    }
  }

*/
