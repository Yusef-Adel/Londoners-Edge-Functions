import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request body to get propertyId
    const { propertyId } = await req.json();

    if (!propertyId) {
      return new Response(
        JSON.stringify({ error: "propertyId is required" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Retrieve Guesty access token from database
    const { data: tokenData, error: tokenError } = await supabase
      .from("guesty_tokens")
      .select("access_token")
      .single();

    if (tokenError || !tokenData?.access_token) {
      console.error("Error fetching Guesty token:", tokenError);
      return new Response(
        JSON.stringify({ error: "Failed to retrieve Guesty API token" }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // Fetch property photos from Guesty API
    const guestyResponse = await fetch(
      `https://open-api.guesty.com/v1/properties-api/property-photos/property-photos/${propertyId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!guestyResponse.ok) {
      const errorText = await guestyResponse.text();
      console.error("Guesty API error:", errorText);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch property photos from Guesty",
          details: errorText,
        }),
        {
          status: guestyResponse.status,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    const photos = await guestyResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        propertyId,
        photos,
        count: Array.isArray(photos) ? photos.length : 0,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
});
