import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const { assetId, editPrompt } = await req.json();

    if (!assetId || !editPrompt) {
      return new Response(JSON.stringify({ error: "Missing assetId or editPrompt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check credits
    const { data: profileData } = await supabase
      .from("profiles")
      .select("credits_remaining")
      .eq("user_id", userId)
      .single();

    if (!profileData || profileData.credits_remaining < 1) {
      return new Response(JSON.stringify({ error: "Insufficient credits" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For MVP: generate a new placeholder URL with slight variation
    // In production this would call an image generation API
    const newImageUrls = [
      "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=800&q=80",
      "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=800&q=80",
      "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&q=80",
      "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=800&q=80",
    ];
    const newUrl = newImageUrls[Math.floor(Math.random() * newImageUrls.length)];

    // Update asset
    const { data: updatedAsset, error: updateErr } = await supabase
      .from("assets")
      .update({ url: newUrl, prompt_used: editPrompt })
      .eq("id", assetId)
      .select()
      .single();

    if (updateErr) {
      console.error("Update error:", updateErr);
      return new Response(JSON.stringify({ error: "Failed to update asset" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduct 1 credit
    await supabase
      .from("profiles")
      .update({ credits_remaining: profileData.credits_remaining - 1 })
      .eq("user_id", userId);

    return new Response(JSON.stringify({ asset: updatedAsset }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("edit-shot error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
