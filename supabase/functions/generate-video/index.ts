import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
    } = await anonClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { assetId, duration, resolution, engine, projectId, aspectRatio, prompt } =
      await req.json();

    if (!assetId || !duration || !resolution || !engine || !projectId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const videoAspectRatio = aspectRatio || "9:16";

    // Calculate credit cost: base = duration seconds, 1080p = 2x multiplier
    const resolutionMultiplier = resolution === "1080p" ? 2 : 1;
    const creditCost = Math.ceil((duration / 2) * resolutionMultiplier);

    // Check credits
    const { data: profile } = await supabase
      .from("profiles")
      .select("credits_remaining")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.credits_remaining < creditCost) {
      return new Response(
        JSON.stringify({
          error: `Not enough credits. Need ${creditCost}, have ${profile?.credits_remaining ?? 0}.`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get the base image asset to verify ownership
    const { data: baseAsset } = await supabase
      .from("assets")
      .select("*, projects!inner(user_id)")
      .eq("id", assetId)
      .single();

    if (!baseAsset || (baseAsset as any).projects?.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Asset not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Simulate video generation delay (MVP placeholder)
    await new Promise((r) => setTimeout(r, 3000));

    // Placeholder video URL for MVP
    const placeholderVideos = [
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    ];
    const videoUrl =
      placeholderVideos[Math.floor(Math.random() * placeholderVideos.length)];

    // Insert video asset
    const { data: videoAsset, error: insertError } = await supabase
      .from("assets")
      .insert({
        project_id: projectId,
        asset_type: "video",
        url: videoUrl,
        shot_label: `video-${duration}s-${videoAspectRatio}`,
        preset_used: engine,
        prompt_used: prompt || `Generated from asset ${assetId}, ${duration}s ${resolution} ${videoAspectRatio} using ${engine}`,
      })
      .select()
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: "Failed to save video asset" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Deduct credits
    await supabase
      .from("profiles")
      .update({
        credits_remaining: profile.credits_remaining - creditCost,
      })
      .eq("user_id", user.id);

    return new Response(
      JSON.stringify({
        asset: videoAsset,
        creditsUsed: creditCost,
        creditsRemaining: profile.credits_remaining - creditCost,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
