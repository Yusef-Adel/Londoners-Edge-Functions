// Guesty Booking Engine - Listing Search Function
// Based on: https://booking-api-docs.guesty.com/reference/getapplicationlistingslist
// This function searches for available listings using the Guesty Booking Engine API

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js";

// Initialize Supabase connection details
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Constants for optimization
const BOOKING_ENGINE_API_TIMEOUT = 30000; // 30 seconds
const RATING_API_TIMEOUT = 5000; // 5 seconds for ratings
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second base delay

// Simple circuit breaker to prevent cascading failures
let circuitBreakerState = {
  failureCount: 0,
  lastFailureTime: 0,
  isOpen: false
};

const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute

function checkCircuitBreaker(): boolean {
  const now = Date.now();
  
  // Reset circuit breaker after timeout
  if (circuitBreakerState.isOpen && now - circuitBreakerState.lastFailureTime > CIRCUIT_BREAKER_TIMEOUT) {
    console.log('Circuit breaker reset');
    circuitBreakerState.isOpen = false;
    circuitBreakerState.failureCount = 0;
  }
  
  return !circuitBreakerState.isOpen;
}

function recordFailure(): void {
  circuitBreakerState.failureCount++;
  circuitBreakerState.lastFailureTime = Date.now();
  
  if (circuitBreakerState.failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
    console.log('Circuit breaker opened due to consecutive failures');
    circuitBreakerState.isOpen = true;
  }
}

function recordSuccess(): void {
  circuitBreakerState.failureCount = 0;
  circuitBreakerState.isOpen = false;
}

// Utility function to add timeout to fetch requests
function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  return Promise.race([
    fetch(url, options),
    new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timeout after ${timeout}ms`)), timeout)
    )
  ]);
}

// Interface for Booking Engine Listings API parameters
interface BookingEngineListingsParams {
  checkIn?: string; // ISO 8601 date format (YYYY-MM-DD)
  checkOut?: string; // ISO 8601 date format (YYYY-MM-DD)
  guests?: number; // Number of guests
  bedrooms?: number; // Minimum number of bedrooms
  bathrooms?: number; // Minimum number of bathrooms
  amenities?: string; // Comma-separated list of amenity IDs
  tags?: string; // Comma-separated list of tags
  propertyType?: string; // Property type filter
  city?: string; // City name
  country?: string; // Country code
  lat?: number; // Latitude for location-based search
  lng?: number; // Longitude for location-based search
  radius?: number; // Search radius in kilometers (used with lat/lng)
  minPrice?: number; // Minimum price per night
  maxPrice?: number; // Maximum price per night
  sort?: string; // Sorting option (e.g., "price", "-price", "rating")
  offset?: number; // Offset for pagination (0-indexed)
  limit?: number; // Results per page (max 100)
}

// Interface for structured listing response
interface StructuredListing {
  id: string;
  title: string;
  location: string;
  area: string;
  rating: number;
  reviews: number;
  bedroom: number;
  beds: number;
  bath: number;
  guests: number;
  dateRange: string;
  pricePerNight: number;
  totalPrice: number;
  images: string[];
  isFavorite: boolean;
  amenities: string[];
  propertyType?: string;
  description?: string;
}

// Function to get a valid Booking Engine token from the database
async function getBookingEngineToken(retryCount = 0): Promise<string> {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: tokens, error } = await supabase
      .from("guesty_booking_engine_tokens")
      .select("access_token, expires_at")
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw new Error(`Failed to fetch token: ${error.message}`);
    if (!tokens || tokens.length === 0) throw new Error("No Booking Engine token available");

    // Check if token is expired
    const expiresAt = new Date(tokens[0].expires_at);
    const now = new Date();
    
    if (expiresAt.getTime() <= now.getTime()) {
      throw new Error("Booking Engine token has expired. Please refresh the token.");
    }

    console.log("Successfully retrieved Booking Engine token");
    return tokens[0].access_token;
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(`Token fetch failed, retrying... (${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
      return getBookingEngineToken(retryCount + 1);
    }
    throw error;
  }
}

// Function to validate and sanitize request parameters
function validateAndSanitizeParams(requestBody: any): { params: BookingEngineListingsParams; guestyUserId?: string } {
  const params: BookingEngineListingsParams = {};
  const guestyUserId = requestBody.guesty_user_id;
  
  // Availability parameters
  if (requestBody.checkIn && typeof requestBody.checkIn === 'string') {
    params.checkIn = requestBody.checkIn.trim();
  }
  if (requestBody.checkOut && typeof requestBody.checkOut === 'string') {
    params.checkOut = requestBody.checkOut.trim();
  }
  
  // Guest count
  if (requestBody.guests !== undefined) {
    const guests = parseInt(String(requestBody.guests));
    params.guests = isNaN(guests) ? undefined : Math.max(1, guests);
  }
  
  // Bedrooms and bathrooms
  if (requestBody.bedrooms !== undefined) {
    const bedrooms = parseInt(String(requestBody.bedrooms));
    params.bedrooms = isNaN(bedrooms) ? undefined : Math.max(0, bedrooms);
  }
  if (requestBody.bathrooms !== undefined) {
    const bathrooms = parseInt(String(requestBody.bathrooms));
    params.bathrooms = isNaN(bathrooms) ? undefined : Math.max(0, bathrooms);
  }
  
  // Location filters
  if (requestBody.city && typeof requestBody.city === 'string') {
    params.city = requestBody.city.trim();
  }
  if (requestBody.country && typeof requestBody.country === 'string') {
    params.country = requestBody.country.trim();
  }
  
  // Geo-location search
  if (requestBody.lat !== undefined && requestBody.lng !== undefined) {
    const lat = parseFloat(String(requestBody.lat));
    const lng = parseFloat(String(requestBody.lng));
    if (!isNaN(lat) && !isNaN(lng)) {
      params.lat = lat;
      params.lng = lng;
      
      // Optional radius (default is usually handled by the API)
      if (requestBody.radius !== undefined) {
        const radius = parseFloat(String(requestBody.radius));
        params.radius = isNaN(radius) ? undefined : Math.max(0, radius);
      }
    }
  }
  
  // Price range
  if (requestBody.minPrice !== undefined) {
    const minPrice = parseFloat(String(requestBody.minPrice));
    params.minPrice = isNaN(minPrice) ? undefined : Math.max(0, minPrice);
  }
  if (requestBody.maxPrice !== undefined) {
    const maxPrice = parseFloat(String(requestBody.maxPrice));
    params.maxPrice = isNaN(maxPrice) ? undefined : Math.max(0, maxPrice);
  }
  
  // Filters
  if (requestBody.amenities && typeof requestBody.amenities === 'string') {
    params.amenities = requestBody.amenities;
  }
  if (requestBody.tags && typeof requestBody.tags === 'string') {
    params.tags = requestBody.tags;
  }
  if (requestBody.propertyType && typeof requestBody.propertyType === 'string') {
    params.propertyType = requestBody.propertyType;
  }
  
  // Sorting
  if (requestBody.sort && typeof requestBody.sort === 'string') {
    params.sort = requestBody.sort;
  }
  
  // Pagination - only add if explicitly provided
  if (requestBody.offset !== undefined) {
    const offset = parseInt(String(requestBody.offset));
    params.offset = isNaN(offset) ? undefined : Math.max(0, offset);
  }
  
  if (requestBody.limit !== undefined) {
    const limit = parseInt(String(requestBody.limit));
    params.limit = isNaN(limit) ? undefined : Math.min(Math.max(1, limit), 100);
  }
  
  return { params, guestyUserId };
}

// Optimized function to get ratings for multiple listings in a single batch call
async function getBatchRatingsForListings(listingIds: string[]): Promise<Record<string, { rating: number; reviews: number }>> {
  if (!listingIds || listingIds.length === 0) {
    return {};
  }

  try {
    console.log(`Fetching ratings for ${listingIds.length} listings in batch mode`);
    
    const ratingResponse = await fetchWithTimeout(
      `${supabaseUrl}/functions/v1/get-review`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          listing_ids: listingIds,
          mode: 'statistics_only'
        })
      },
      RATING_API_TIMEOUT
    );

    if (ratingResponse.ok) {
      const ratingData = await ratingResponse.json();
      
      // Transform batch response to lookup map
      const ratingsMap: Record<string, { rating: number; reviews: number }> = {};
      
      if (ratingData?.data?.listings) {
        for (const [listingId, data] of Object.entries(ratingData.data.listings)) {
          const listingData = data as any;
          ratingsMap[listingId] = {
            rating: listingData?.statistics?.overall_average_rating || 0,
            reviews: listingData?.statistics?.total_reviews || 0
          };
        }
      }
      
      console.log(`Successfully retrieved ratings for ${Object.keys(ratingsMap).length} listings`);
      return ratingsMap;
    } else {
      console.error(`Failed to fetch batch rating data:`, ratingResponse.status);
      return {};
    }
  } catch (error) {
    console.error(`Error fetching batch ratings:`, error);
    return {};
  }
}

// Optimized function to check if listings are in user's favorites
async function checkListingsFavorites(listingIds: string[], guestyUserId?: string): Promise<Record<string, boolean>> {
  if (!guestyUserId || !listingIds.length) {
    return {};
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Favorites check timeout')), 5000)
    );

    const favoritesPromise = supabase
      .from('users')
      .select('favorites')
      .eq('guesty_user_id', guestyUserId)
      .single();

    const { data: userData, error: userError } = await Promise.race([favoritesPromise, timeoutPromise]) as any;

    if (userError || !userData?.favorites || !Array.isArray(userData.favorites)) {
      console.log(`No favorites found for user ${guestyUserId}`);
      return {};
    }

    const favoritesSet = new Set(userData.favorites);
    const favoritesMap: Record<string, boolean> = {};
    listingIds.forEach(listingId => {
      favoritesMap[listingId] = favoritesSet.has(listingId);
    });

    return favoritesMap;
  } catch (error) {
    console.error('Error checking favorites:', error);
    return {};
  }
}

// Helper function to build query string from params object
function buildQueryString(params: Record<string, any>): string {
  const parts: string[] = [];
  
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    
    if (typeof value === 'boolean') {
      parts.push(`${key}=${value}`);
    } else {
      parts.push(`${key}=${encodeURIComponent(String(value))}`);
    }
  }
  
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

// Helper function to extract pricing from Booking Engine listing
function extractPricingFromListing(listing: any, checkIn?: string, checkOut?: string) {
  // Booking Engine API may return pricing differently than Open API
  // Check for price, basePrice, or other pricing fields
  const price = listing.price || listing.basePrice || listing.nightlyRate || 0;
  const cleaningFee = listing.cleaningFee || 0;
  const currency = listing.currency || 'USD';
  
  // Calculate total price if we have check-in and check-out dates
  let totalPrice = price;
  if (checkIn && checkOut) {
    const nights = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));
    totalPrice = (price * nights) + cleaningFee;
  } else {
    // Default to 7 nights if dates not provided
    totalPrice = (price * 7) + cleaningFee;
  }
  
  return {
    pricePerNight: price,
    cleaningFee,
    totalPrice,
    currency
  };
}

// Optimized function to transform Booking Engine listing data
async function transformListingData(
  bookingEngineData: any, 
  guestyUserId?: string,
  checkIn?: string,
  checkOut?: string
): Promise<StructuredListing[]> {
  try {
    // Booking Engine API may return data in different formats
    // Check for results array or items array
    const listings = bookingEngineData.results || bookingEngineData.items || bookingEngineData.data || [];
    
    if (!Array.isArray(listings)) {
      console.log("No results found in Booking Engine data or invalid format");
      return [];
    }

    console.log(`Found ${listings.length} listings in Booking Engine response`);
    
    // Extract all listing IDs for favorites checking
    const listingIds = listings.map((listing: any) => listing.id || listing._id).filter(Boolean);
    
    // Check favorites for all listings at once
    let favoritesMap: Record<string, boolean> = {};
    try {
      favoritesMap = await checkListingsFavorites(listingIds, guestyUserId);
    } catch (error) {
      console.error('Failed to check favorites, continuing without:', error);
    }
    
    // Get ratings for all listings in a single batch call
    let ratingsMap: Record<string, { rating: number; reviews: number }> = {};
    try {
      ratingsMap = await getBatchRatingsForListings(listingIds);
    } catch (error) {
      console.error('Failed to fetch batch ratings, continuing without:', error);
    }
    
    // Build location string helper
    const buildFullLocation = (address: any) => {
      const parts: string[] = [];
      
      const street = address?.street || address?.address || address?.line1;
      const neighborhood = address?.neighborhood || address?.district;
      const city = address?.city;
      
      if (street) parts.push(street);
      if (neighborhood) parts.push(neighborhood);
      if (city && !parts.join(' ').includes(city)) parts.push(city);
      
      return parts.length > 0 ? parts.join(', ') : "Location not specified";
    };
    
    // Transform all listings synchronously now that we have all data
    const results: StructuredListing[] = listings.map((listing: any, index: number) => {
      const listingId = listing.id || listing._id || `listing_${index + 1}`;
      
      // Extract pricing information
      const pricingInfo = extractPricingFromListing(listing, checkIn, checkOut);
      
      // Get rating data from batch results
      const ratingData = ratingsMap[listingId] || { rating: 0, reviews: 0 };
      
      // Build date range string
      let dateRange = "Available Now";
      if (checkIn && checkOut) {
        const checkInDate = new Date(checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const checkOutDate = new Date(checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dateRange = `${checkInDate} - ${checkOutDate}`;
      }
      
      return {
        id: listingId,
        title: listing.title || listing.name || "Unknown Property",
        location: buildFullLocation(listing.address || listing.location),
        area: listing.address?.street || listing.address?.neighborhood || listing.address?.city || "Area not specified",
        rating: ratingData.rating,
        reviews: ratingData.reviews,
        bedroom: Math.max(0, listing.bedrooms || listing.bedroomCount || 0),
        beds: Math.max(0, listing.beds || listing.bedCount || 0),
        bath: Math.max(0, listing.bathrooms || listing.bathroomCount || 0),
        guests: Math.max(0, listing.accommodates || listing.maxGuests || listing.guests || 0),
        dateRange: dateRange,
        pricePerNight: Math.max(0, pricingInfo.pricePerNight || 0),
        totalPrice: Math.max(0, pricingInfo.totalPrice || 0),
        images: (listing.pictures || listing.images || listing.photos || [])
          .map((pic: any) => {
            if (typeof pic === 'string') return pic;
            return pic.url || pic.original || pic.large || pic.regular || pic.thumbnail || "";
          })
          .filter((url: string) => url !== "")
          .slice(0, 5),
        isFavorite: favoritesMap[listingId] || false,
        amenities: Array.isArray(listing.amenities) ? listing.amenities : [],
        propertyType: listing.propertyType || listing.type,
        description: listing.description || listing.publicDescription?.summary
      };
    });
    
    return results;
  } catch (error) {
    console.error('Error in transformListingData:', error);
    return [];
  }
}

console.log("Booking Engine Listing Search Function initialized");

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
        JSON.stringify({ error: 'Method not allowed' }),
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
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          status: "error",
          message: "Invalid JSON in request body",
          details: error instanceof Error ? error.message : 'JSON parse error'
        }),
        { 
          status: 400,
          headers: corsHeaders 
        }
      );
    }
    
    console.log("Received request body:", JSON.stringify(requestBody));
    
    // Validate and sanitize parameters
    const { params, guestyUserId } = validateAndSanitizeParams(requestBody);
    
    console.log("Prepared API params:", JSON.stringify(params));
    
    // Check circuit breaker before making requests
    if (!checkCircuitBreaker()) {
      return new Response(
        JSON.stringify({ 
          status: "error",
          message: "Service temporarily unavailable - too many recent failures",
          details: "Circuit breaker is open, please try again later"
        }),
        { 
          status: 503,
          headers: corsHeaders 
        }
      );
    }
    
    // Get the Booking Engine token from the database
    const bookingEngineToken = await getBookingEngineToken();

    // Make request to Booking Engine API with timeout and retry logic
    const queryString = buildQueryString(params);
    const apiUrl = `https://booking.guesty.com/api/listings${queryString}`;
    console.log("Making request to Booking Engine API:", apiUrl);
    
    let bookingEngineResponse;
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        console.log(`Booking Engine API attempt ${attempt + 1}/${MAX_RETRIES}`);
        
        const response = await fetchWithTimeout(apiUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${bookingEngineToken}`,
            'Content-Type': 'application/json',
          },
        }, BOOKING_ENGINE_API_TIMEOUT);

        console.log(`Booking Engine API response status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Booking Engine API error response:", errorText);
          
          // Don't retry auth errors
          if (response.status === 401 || response.status === 403) {
            throw new Error(`Booking Engine API authentication error: ${response.status} - ${errorText}`);
          }
          
          // Handle rate limiting
          if (response.status === 429) {
            if (attempt < MAX_RETRIES - 1) {
              console.log('Rate limited, waiting before retry...');
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (attempt + 1) * 2));
              continue;
            }
          }
          
          // Retry server errors
          if (response.status >= 500) {
            if (attempt < MAX_RETRIES - 1) {
              console.log('Server error, retrying with backoff...');
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, attempt)));
              continue;
            }
          }
          
          throw new Error(`Booking Engine API error: ${response.status} - ${errorText}`);
        }

        bookingEngineResponse = await response.json();
        recordSuccess();
        break;
        
      } catch (error) {
        lastError = error as Error;
        console.error(`Booking Engine API attempt ${attempt + 1} failed:`, error);
        
        if (attempt < MAX_RETRIES - 1) {
          const delay = RETRY_DELAY * Math.pow(2, attempt);
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    if (!bookingEngineResponse) {
      recordFailure();
      throw new Error(`Failed to fetch from Booking Engine API after ${MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`);
    }

    console.log(`Got response from Booking Engine API`);
    
    // Transform the data into our structured format
    const structuredListings = await transformListingData(
      bookingEngineResponse, 
      guestyUserId,
      params.checkIn,
      params.checkOut
    );
    
    // Calculate total count (from API response or actual results)
    const totalCount = bookingEngineResponse.total || 
                      bookingEngineResponse.count || 
                      bookingEngineResponse.totalCount ||
                      structuredListings.length;

    // Return formatted response
    return new Response(
      JSON.stringify({
        status: "success",
        message: "Listings retrieved successfully",
        data: structuredListings,
        totalCount: totalCount,
        offset: params.offset || 0,
        limit: params.limit || structuredListings.length
      }),
      { 
        status: 200,
        headers: corsHeaders 
      }
    );
  } catch (error) {
    console.error('Error in booking engine listing search function:', error);
    
    // Determine the appropriate error response
    let statusCode = 500;
    let errorMessage = 'Internal server error';
    
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        statusCode = 504;
        errorMessage = 'Request timeout - please try again';
      } else if (error.message.includes('authentication') || error.message.includes('401') || error.message.includes('403')) {
        statusCode = 503;
        errorMessage = 'Service temporarily unavailable - authentication issue';
      } else if (error.message.includes('429')) {
        statusCode = 429;
        errorMessage = 'Too many requests - please try again later';
      } else if (error.message.includes('No Booking Engine token')) {
        statusCode = 503;
        errorMessage = 'Service temporarily unavailable - no valid token';
      } else if (error.message.includes('expired')) {
        statusCode = 503;
        errorMessage = 'Authentication token expired - please refresh token';
      }
    }
    
    return new Response(
      JSON.stringify({ 
        status: "error",
        message: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      { 
        status: statusCode, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' 
        } 
      }
    );
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  Basic search (all listings):
  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/booking-engine-listing-search' \
    --header 'Content-Type: application/json' \
    --data-raw '{}'

  Search with availability dates:
  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/booking-engine-listing-search' \
    --header 'Content-Type: application/json' \
    --data-raw '{"checkIn":"2026-07-01","checkOut":"2026-07-07","guests":2,"limit":25}'

  Search with filters (city, bedrooms, price range):
  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/booking-engine-listing-search' \
    --header 'Content-Type: application/json' \
    --data-raw '{"city":"Miami","bedrooms":2,"minPrice":100,"maxPrice":500,"checkIn":"2026-08-01","checkOut":"2026-08-07","guests":4}'

  Search with geo-location:
  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/booking-engine-listing-search' \
    --header 'Content-Type: application/json' \
    --data-raw '{"lat":25.7617,"lng":-80.1918,"radius":10,"guests":2,"checkIn":"2026-09-01","checkOut":"2026-09-05"}'

  Pagination example:
  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/booking-engine-listing-search' \
    --header 'Content-Type: application/json' \
    --data-raw '{"offset":0,"limit":20}'

  Notes:
  - Uses Booking Engine token from guesty_booking_engine_tokens table
  - Automatically checks user favorites if guesty_user_id is provided
  - Returns structured listing data with ratings, images, and pricing
  - Supports pagination with offset and limit parameters
  - All date parameters should be in ISO 8601 format (YYYY-MM-DD)
  - If no limit is specified, all available results are returned
*/
