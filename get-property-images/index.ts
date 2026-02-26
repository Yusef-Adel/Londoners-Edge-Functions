// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

interface PropertyImage {
  id: number;
  guesty_photo_id: string;
  guesty_photo_url: string;
  caption: string;
  created_at: string;
  updated_at: string;
  features: string;
  property_id: string;
  classified_as: string;
}

interface Room {
  name: string;           // e.g., "living area", "full kitchen", "full bathroom"
  features: string[];     // e.g., ["King bed", "Sofa bed", "Heating", "TV"]
  images: string[];       // Array of image URLs
  thumbnail: string;      // Primary image URL
}

interface PropertyPhotos {
  listingName: string;
  rating: number;
  rooms: Room[];
}

Deno.serve(async (req) => {
  try {
    // Comprehensive CORS headers to allow requests from any origin
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with, accept, origin, referer, user-agent',
      'Access-Control-Max-Age': '86400', // 24 hours
      'Access-Control-Allow-Credentials': 'false'
    }

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, { 
        status: 200,
        headers: corsHeaders 
      })
    }

    // Only allow POST method for this function
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed. Only POST requests are supported.' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { listing_id } = await req.json();

    if (!listing_id) {
      return new Response(
        JSON.stringify({ error: "listing_id is required" }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

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

    // Fetch listing details from Guesty API
    const guestyResponse = await fetch(
      `https://open-api.guesty.com/v1/listings/${listing_id}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }
    )

    if (!guestyResponse.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch listing details from Guesty: ${guestyResponse.statusText}` }),
        {
          status: guestyResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const listingData = await guestyResponse.json()
    const listingName = listingData.title || listingData.nickname || 'Unknown Property'

    // Fetch rating from reviews table
    const { data: reviewsData, error: reviewsError } = await supabaseClient
      .from('reviews')
      .select('overall_rating')
      .eq('listing_id', listing_id)

    let averageRating = 0
    if (!reviewsError && reviewsData && reviewsData.length > 0) {
      const totalRating = reviewsData.reduce((sum, review) => sum + (review.overall_rating || 0), 0)
      averageRating = parseFloat((totalRating / reviewsData.length).toFixed(1))
    }

    // Fetch all images for the specified listing_id
    const { data: images, error } = await supabaseClient
      .from("property_photos_classified")
      .select("*")
      .eq("property_id", listing_id)
      .order('classified_as', { ascending: true });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    if (!images || images.length === 0) {
      return new Response(
        JSON.stringify({ message: "No images found for this listing" }),
        { 
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const typedImages = images as PropertyImage[];
    
    // Group images by room type (classified_as)
    const roomsMap = new Map<string, Room>();
    
    // First, group images by room type
    const imagesByRoom = new Map<string, PropertyImage[]>();
    typedImages.forEach(img => {
      if (!img.classified_as) return;
      if (!imagesByRoom.has(img.classified_as)) {
        imagesByRoom.set(img.classified_as, []);
      }
      imagesByRoom.get(img.classified_as)?.push(img);
    });

    // Now process each room
    for (const [roomType, roomImages] of imagesByRoom) {
      // Sort images by creation timestamp, ascending order
      roomImages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      // Use first image as thumbnail
      const primaryImage = roomImages[0];

      // Find features in all images for this room
      let roomFeatures: string[] = [];
      
      // Log all images for debugging
      console.log(`Processing room: ${roomType} with ${roomImages.length} images`);
      roomImages.forEach((img, index) => {
        console.log(`Image ${index + 1}: feature = "${img.feature}", type = ${typeof img.feature}, url = ${img.image_url}`);
      });
      
      // Find the image with non-empty feature - check for null, undefined, empty string
      const imagesWithFeatures = roomImages
        .filter(img => {
          const hasFeature = img.features != null && 
                           img.features !== undefined && 
                           img.features !== '' && 
                           String(img.features).trim().length > 0;
          if (hasFeature) {
            console.log(`Image with features found: ${img.guesty_photo_url}, features: "${img.features}"`);
          }
          return hasFeature;
        })
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      console.log(`Found ${imagesWithFeatures.length} images with features for ${roomType}`);

      if (imagesWithFeatures.length > 0) {
        const featureImage = imagesWithFeatures[0]; // Take the first image that has features
        console.log(`Using features from image: ${featureImage.guesty_photo_url}`);
        
        try {
          // Convert features to string and trim
          const featureText = String(featureImage.features).trim();
          console.log(`Raw features text: "${featureText}"`);
          
          if (featureText.length === 0) {
            console.log(`Features text is empty after trimming`);
          } else {
            // Try to parse as JSON array first
            if (featureText.startsWith('[') && featureText.endsWith(']')) {
              try {
                roomFeatures = JSON.parse(featureText);
                console.log(`Successfully parsed features from JSON: ${JSON.stringify(roomFeatures)}`);
              } catch (jsonError) {
                console.error(`JSON parse error: ${jsonError}`);
                
                // Manual parsing as fallback
                const content = featureText.substring(1, featureText.length - 1); // Remove [ ]
                if (content.trim().length > 0) {
                  roomFeatures = content
                    .split(',')
                    .map(item => {
                      // Handle quotes properly
                      return item
                        .replace(/^["']/, '') // Remove leading quote
                        .replace(/["']$/, '') // Remove trailing quote
                        .trim();
                    })
                    .filter(f => f.length > 0);
                  
                  console.log(`Manual parsing result: ${JSON.stringify(roomFeatures)}`);
                }
              }
            } else if (featureText.includes(',')) {
              // Handle comma-separated values without brackets
              roomFeatures = featureText
                .split(',')
                .map(item => item.trim().replace(/^["']/, '').replace(/["']$/, ''))
                .filter(f => f.length > 0);
              console.log(`Parsed comma-separated features: ${JSON.stringify(roomFeatures)}`);
            } else {
              // Single feature
              roomFeatures = [featureText];
              console.log(`Using single feature: "${featureText}"`);
            }
          }
        } catch (e) {
          console.error(`Error processing features for ${roomType}: ${e}`);
          console.error(`Features value was: ${featureImage.features}`);
        }
      } else {
        console.log(`No images with features found for ${roomType}`);
      }

      console.log(`Final features for ${roomType}: ${JSON.stringify(roomFeatures)}`);

      // Create the room entry
      roomsMap.set(roomType, {
        name: roomType,
        features: roomFeatures,
        images: roomImages.map(img => img.guesty_photo_url),
        thumbnail: primaryImage.guesty_photo_url
      });
    }

    // Define room order priority - bedrooms first
    const getRoomPriority = (roomName: string): number => {
      const lowerName = roomName.toLowerCase();
      
      if (lowerName.includes('bedroom') || lowerName.includes('bed')) return 1;
      if (lowerName.includes('living')) return 2;
      if (lowerName.includes('kitchen')) return 3;
      if (lowerName.includes('bathroom') || lowerName.includes('bath')) return 4;
      if (lowerName.includes('garden') || lowerName.includes('outdoor') || lowerName.includes('patio') || lowerName.includes('terrace')) return 5;
      
      return 999; // Other rooms go last
    };

    // Convert the map to our final structure
    const propertyPhotos: PropertyPhotos = {
      listingName: listingName,
      rating: averageRating,
      rooms: Array.from(roomsMap.values())
        .filter(room => room.images.length > 0)
        .sort((a, b) => getRoomPriority(a.name) - getRoomPriority(b.name))
    };

    // Log final data for debugging
    console.log("Final response data:", JSON.stringify(propertyPhotos));

    // Return the structured data
    return new Response(
      JSON.stringify(propertyPhotos),
      { 
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "max-age=3600"
        } 
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with, accept, origin, referer, user-agent',
          "Content-Type": "application/json" 
        } 
      }
    );
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-property-images' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
