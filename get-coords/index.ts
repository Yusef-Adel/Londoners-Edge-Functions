// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

console.log("Nearby listings function initialized!")

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || ""
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const supabase = createClient(supabaseUrl, supabaseKey)

Deno.serve(async (req) => {
  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
        },
      })
    }

    const { listing_id } = await req.json()

    if (!listing_id) {
      return new Response(
        JSON.stringify({ error: "listing_id is required" }),
        { 
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            'Access-Control-Allow-Origin': '*'
          } 
        }
      )
    }

    // Get coordinates for the specified listing using listingId column
    const { data: targetListing, error: targetError } = await supabase
      .from('property_coordinates')
      .select('listingId, latitude, longitude')
      .eq('listingId', listing_id)
      .maybeSingle()

    if (!targetListing || !targetListing.latitude || !targetListing.longitude) {
      // Enhanced debugging information
      console.log('Target listing not found or missing coordinates')
      console.log('Searching for listingId:', listing_id)
      
      // Check sample data to help debug
      const { data: sampleListings } = await supabase
        .from('property_coordinates')
        .select('listingId, latitude, longitude')
        .limit(3)
      
      return new Response(
        JSON.stringify({ 
          error: "Listing not found or coordinates not available",
          debug_info: {
            searched_listing_id: listing_id,
            error_details: targetError?.message || 'No specific error',
            sample_data: sampleListings || [],
            note: "Check if your listing ID exists in the 'listingId' column"
          }
        }),
        { 
          status: 404,
          headers: { 
            "Content-Type": "application/json",
            'Access-Control-Allow-Origin': '*'
          } 
        }
      )
    }

    const { latitude: targetLat, longitude: targetLng } = targetListing
    const actualListingId = targetListing.listingId

    // =============================================
    // 🎯 CHANGE RADIUS HERE (in kilometers)
    const SEARCH_RADIUS_KM = 3 // ← Change this value to adjust search radius
    // =============================================

    console.log("Using JavaScript-based distance calculation")
    
    // Get all other listings to calculate distances using listingId column
    const { data: allListings, error: fetchError } = await supabase
      .from('property_coordinates')
      .select('listingId, latitude, longitude')
      .neq('listingId', actualListingId)

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch listings" }),
        { 
          status: 500,
          headers: { 
            "Content-Type": "application/json",
            'Access-Control-Allow-Origin': '*'
          } 
        }
      )
    }

    // Calculate distances and filter within specified radius
    const nearbyListingsWithDistance = (allListings || [])
      .filter((listing: any) => listing.latitude && listing.longitude) // Only include listings with coordinates
      .map((listing: any) => {
        const distance = calculateDistance(
          targetLat, targetLng,
          listing.latitude, listing.longitude
        )
        return { 
          listing_id: listing.listingId,
          latitude: listing.latitude,
          longitude: listing.longitude,
          distance_km: Math.round(distance * 100) / 100
        }
      })
      .filter((listing: any) => listing.distance_km <= SEARCH_RADIUS_KM) // ← Uses the radius variable
      .sort((a: any, b: any) => a.distance_km - b.distance_km)

    // Get Guesty access token from database
    const { data: tokenData, error: tokenError } = await supabase
      .from('guesty_tokens')
      .select('access_token')
      .limit(1)
      .single()

    if (tokenError || !tokenData?.access_token) {
      console.error('Failed to fetch Guesty token:', tokenError)
      return new Response(
        JSON.stringify({ error: "Failed to fetch Guesty access token" }),
        { 
          status: 500,
          headers: { 
            "Content-Type": "application/json",
            'Access-Control-Allow-Origin': '*'
          } 
        }
      )
    }

    // Fetch detailed information from Guesty API and ratings for each nearby listing
    const nearbyListingsWithDetails = await Promise.all(
      nearbyListingsWithDistance.map(async (listing: any) => {
        try {
          // Fetch Guesty data
          const guestyResponse = await fetch(
            `https://open-api.guesty.com/v1/listings/${listing.listing_id}`,
            {
              headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
                'Content-Type': 'application/json'
              }
            }
          )

          // Fetch rating data from get-review edge function
          const ratingResponse = await fetch(
            `https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/get-review`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ listing_id: listing.listing_id })
            }
          )

          let guestyData: any = null
          let ratingData: any = null

          if (guestyResponse.ok) {
            guestyData = await guestyResponse.json()
          } else {
            console.error(`Failed to fetch Guesty data for listing ${listing.listing_id}:`, guestyResponse.status)
          }

          if (ratingResponse.ok) {
            ratingData = await ratingResponse.json()
          } else {
            console.error(`Failed to fetch rating data for listing ${listing.listing_id}:`, ratingResponse.status)
          }

          if (!guestyData) {
            return {
              ...listing,
              guesty_data: null,
              overall_average_rating: ratingData?.data?.statistics?.overall_average_rating || "no rating",
              error: `Failed to fetch from Guesty API (Status: ${guestyResponse.status})`
            }
          }
          
          return {
            listing_id: listing.listing_id,
            distance_km: listing.distance_km,
            latitude: listing.latitude,
            longitude: listing.longitude,
            title: guestyData.title || 'N/A',
            location: {
              full_address: guestyData.address?.full || 'N/A',
              city: guestyData.address?.city || 'N/A',
              country: guestyData.address?.country || 'N/A',
              published_address: guestyData.publishedAddress?.full || 'N/A'
            },
            bedrooms: guestyData.bedrooms || 0,
            bathrooms: guestyData.bathrooms || 0,
            beds: guestyData.beds || 0,
            guests: guestyData.accommodates || 0,
            price_per_night: {
              base_price: guestyData.prices?.basePrice || 0,
              base_price_usd: guestyData.prices?.basePriceUSD || 0,
              currency: guestyData.prices?.currency || 'USD',
              cleaning_fee: guestyData.prices?.cleaningFee || 0,
              extra_person_fee: guestyData.prices?.extraPersonFee || 0,
              guests_included: guestyData.prices?.guestsIncludedInRegularFee || 0
            },
            property_type: guestyData.propertyType || 'N/A',
            room_type: guestyData.roomType || 'N/A',
            overall_average_rating: ratingData?.data?.statistics?.overall_average_rating || "no rating available",
            pictures: guestyData.pictures?.slice(0, 3).map((pic: any) => ({
              thumbnail: pic.thumbnail,
              regular: pic.regular,
              caption: pic.caption
            })) || []
          }
        } catch (error) {
          console.error(`Error fetching data for listing ${listing.listing_id}:`, error)
          return {
            ...listing,
            guesty_data: null,
            overall_average_rating: null,
            error: 'Failed to fetch from APIs'
          }
        }
      })
    )

    // Also fetch target listing details from Guesty API and rating
    let targetListingDetails: any = null
    try {
      const targetGuestyResponse = await fetch(
        `https://open-api.guesty.com/v1/listings/${actualListingId}`,
        {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      // Fetch rating data for target listing
      const targetRatingResponse = await fetch(
        `https://oaumvyuwtzuyhkwzzxtb.supabase.co/functions/v1/get-review`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ listing_id: actualListingId })
        }
      )

      let targetRatingData: any = null
      if (targetRatingResponse.ok) {
        targetRatingData = await targetRatingResponse.json()
      } else {
        console.error(`Failed to fetch target rating data for listing ${actualListingId}:`, targetRatingResponse.status)
      }

      if (targetGuestyResponse.ok) {
        const targetGuestyData = await targetGuestyResponse.json()
        targetListingDetails = {
          listing_id: actualListingId,
          latitude: targetLat,
          longitude: targetLng,
          title: targetGuestyData.title || 'N/A',
          location: {
            full_address: targetGuestyData.address?.full || 'N/A',
            city: targetGuestyData.address?.city || 'N/A',
            country: targetGuestyData.address?.country || 'N/A'
          },
          bedrooms: targetGuestyData.bedrooms || 0,
          bathrooms: targetGuestyData.bathrooms || 0,
          beds: targetGuestyData.beds || 0,
          guests: targetGuestyData.accommodates || 0,
          price_per_night: {
            base_price: targetGuestyData.prices?.basePrice || 0,
            base_price_usd: targetGuestyData.prices?.basePriceUSD || 0,
            currency: targetGuestyData.prices?.currency || 'USD'
          },
          overall_average_rating: targetRatingData?.data?.statistics?.overall_average_rating || null
        }
      }
    } catch (error) {
      console.error('Error fetching target listing details from Guesty:', error)
    }

    return new Response(
      JSON.stringify({
        target_listing: targetListingDetails || {
          listing_id: actualListingId,
          latitude: targetLat,
          longitude: targetLng,
          note: "Could not fetch details from Guesty API"
        },
        nearby_listings: nearbyListingsWithDetails || [],
        count: (nearbyListingsWithDetails || []).length,
        search_radius_km: SEARCH_RADIUS_KM,
        method_used: 'javascript_calculation_with_guesty_api'
      }),
      { 
        headers: { 
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*'
        } 
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { 
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*'
        } 
      }
    )
  }
})

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}


