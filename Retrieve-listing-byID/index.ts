// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

console.log("Retrieve Listing by ID function initialized")

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Comprehensive interface for Guesty listing response
interface GuestyListingResponse {
  id: string
  title: string
  description: string
  location: {
    city: string
    country: string
    address: string
    neighborhood: string
    coordinates: {
      lat: number
      lng: number
    }
    zipcode?: string
    state?: string
    timeZone?: string
  }
  pricing: {
    basePrice: number
    currency: string
    cleaningFee?: number
    serviceFee?: number
    securityDeposit?: number
  }
  capacity: {
    bedrooms: number
    bathrooms: number
    beds: number
    guests: number
  }
  amenities: string[]
  pictures: string[]
  ratings: {
    rating: number
    reviewCount: number
  }
  checkInOut: {
    checkInTime: string
    checkOutTime: string
  }
  host: {
    name: string
    phone?: string
  }
  policies: {
    cancellationPolicy?: string
    houseRules?: string[]  }
  rates?: {
    platform: 'bookingCom'
    internalRatePlanId: string
    externalRatePlanId: string
    status: string
    rateName: string
    currency: string
    hotelId: number
  }[]
  // Additional Guesty fields
  propertyType?: string
  roomType?: string
  listingType?: string
  accommodates?: number
  bathrooms_text?: string
  beds_text?: string
  publicDescription?: any
  amenitiesNotIncluded?: string[]
  taxes?: any[]
  pictures_count?: number
  defaultCheckInTime?: string
  defaultCheckOutTime?: string
  instantBookable?: boolean
  isListed?: boolean
  active?: boolean
  receptionistsService?: any
  calendarRules?: any
  integrations?: any[]
  nickname?: string
  accountId?: string
  SaaS?: any
  createdAt?: string
  lastUpdatedAt?: string
  customFields?: any[]
}

// Helper function to extract rates from integrations
function extractRatesFromIntegrations(integrations: any[]): any[] {
  const allRates: any[] = []
  
  for (const integration of integrations) {
    // Extract rates only from bookingCom integration
    if (integration.platform === 'bookingCom' && integration.bookingCom?.rates) {
      for (const rate of integration.bookingCom.rates) {
        allRates.push({
          platform: 'bookingCom',
          internalRatePlanId: rate.internalRatePlanId,
          externalRatePlanId: rate.externalRatePlanId,
          status: rate.status,
          rateName: integration.bookingCom.rateName,
          currency: integration.bookingCom.currency,
          hotelId: integration.bookingCom.hotelId
        })
      }
    }
  }
  
  return allRates
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Parse request body
    const { id } = await req.json()

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Listing ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
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

    // Make request to Guesty API
    const guestyResponse = await fetch(`https://open-api.guesty.com/v1/listings/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    })

    if (!guestyResponse.ok) {
      const errorText = await guestyResponse.text()
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch listing from Guesty',
          details: errorText,
          status: guestyResponse.status
        }),
        {
          status: guestyResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const listingData = await guestyResponse.json()
    
    // Transform the Guesty response to comprehensive structure
    const structuredListing: GuestyListingResponse = {
      id: listingData._id || listingData.id || id,
      title: listingData.title || listingData.nickname || 'Untitled Property',
      description: listingData.publicDescription?.summary || 
                  listingData.publicDescription?.space || 
                  listingData.description ||                  'No description available',
      
      location: {
        city: listingData.address?.city || '',
        country: listingData.address?.country || '',
        address: listingData.address?.full || 
                listingData.address?.street || 
                `${listingData.address?.street || ''} ${listingData.address?.city || ''} ${listingData.address?.country || ''}`.trim(),
        neighborhood: listingData.address?.neighborhood || listingData.address?.region || '',
        coordinates: {
          lat: listingData.address?.lat || 0,
          lng: listingData.address?.lng || 0
        },
        zipcode: listingData.address?.zipcode,
        state: listingData.address?.state,
        timeZone: listingData.timeZone
      },

      pricing: {
        basePrice: listingData.prices?.basePrice || 
                  listingData.prices?.nightlyRate || 
                  listingData.defaultDailyPrice || 0,
        currency: listingData.prices?.currency || 
                 listingData.currency || 'USD',
        cleaningFee: listingData.prices?.cleaningFee || 0,
        serviceFee: listingData.prices?.serviceFee || 0,
        securityDeposit: listingData.prices?.securityDeposit || 0
      },

      capacity: {
        bedrooms: listingData.bedrooms || 0,
        bathrooms: listingData.bathrooms || 0,
        beds: listingData.beds || listingData.bedrooms || 0,
        guests: listingData.accommodates || listingData.maxGuests || 1
      },

      amenities: listingData.amenities || [],
      
      pictures: (listingData.pictures || []).map((pic: any) => 
        pic.original || pic.large || pic.thumbnail || pic.url || pic
      ).filter(Boolean),

      ratings: {
        rating: listingData.avgRating || 
               listingData.rating?.value || 
               listingData.stats?.rating?.value || 0,
        reviewCount: listingData.reviewsCount || 
                    listingData.stats?.reviewsCount || 
                    listingData.reviewCount || 0
      },

      checkInOut: {
        checkInTime: listingData.defaultCheckInTime || 
                    listingData.checkInTime || '3:00 PM',
        checkOutTime: listingData.defaultCheckOutTime ||                     listingData.checkOutTime || '11:00 AM'
      },

      host: {
        name: listingData.owners?.[0]?.fullName || 
             listingData.host?.name || 
             listingData.accountHolder?.fullName || 'Host',
        phone: listingData.contactPhone || 
              listingData.owners?.[0]?.phone || 
              listingData.host?.phone
      },

      policies: {
        cancellationPolicy: listingData.cancellationPolicy || 
                           listingData.terms?.cancellationPolicy,
        houseRules: listingData.houseRules || 
                   listingData.terms?.houseRules || []
      },

      rates: extractRatesFromIntegrations(listingData.integrations || []),
      
      // Additional comprehensive Guesty fields
      propertyType: listingData.propertyType,
      roomType: listingData.roomType,
      listingType: listingData.listingType,
      accommodates: listingData.accommodates,
      bathrooms_text: listingData.bathrooms_text,
      beds_text: listingData.beds_text,
      publicDescription: listingData.publicDescription,
      amenitiesNotIncluded: listingData.amenitiesNotIncluded,
      taxes: listingData.taxes,
      pictures_count: listingData.pictures_count,
      defaultCheckInTime: listingData.defaultCheckInTime,
      defaultCheckOutTime: listingData.defaultCheckOutTime,
      instantBookable: listingData.instantBookable,
      isListed: listingData.isListed,
      active: listingData.active,
      receptionistsService: listingData.receptionistsService,
      calendarRules: listingData.calendarRules,
      integrations: listingData.integrations,
      nickname: listingData.nickname,
      accountId: listingData.accountId,
      SaaS: listingData.SaaS,
      createdAt: listingData.createdAt,
      lastUpdatedAt: listingData.lastUpdatedAt,
      customFields: listingData.customFields
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        data: structuredListing 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in retrieve-listing-byID function:', error)
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
