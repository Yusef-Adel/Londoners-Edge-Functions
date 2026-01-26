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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: tokenData, error: tokenError } = await supabase
      .from("guesty_tokens")
      .select("access_token")
      .single();

    if (tokenError || !tokenData?.access_token) {
      console.error("Error fetching Guesty token:", tokenError);
      return new Response(JSON.stringify({ error: "Failed to retrieve Guesty API token" }), {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        },
      });
    }

    const guestyResponse = await fetch("https://open-api.guesty.com/v1/listings", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
      },
    });

    if (!guestyResponse.ok) {
      const errorText = await guestyResponse.text();
      console.error("Guesty API error:", errorText);
      return new Response(JSON.stringify({ error: "Failed to fetch listings from Guesty" }), {
        status: guestyResponse.status,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        },
      });
    }

    const listings = await guestyResponse.json();
    const listingIds = listings.map((listing: { _id: string }) => listing._id);

    return new Response(
      JSON.stringify({ listingIds, count: listingIds.length }),
      { 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        } 
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        ...corsHeaders
      },
    });
  }
});
