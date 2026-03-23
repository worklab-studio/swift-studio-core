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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const { assetId, editPrompt, modelReferenceUrls, supportReferenceUrls, identityLockSummary } = await req.json();

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

    // Fetch current asset
    const { data: currentAsset, error: assetErr } = await supabase
      .from("assets")
      .select("*")
      .eq("id", assetId)
      .single();

    if (assetErr || !currentAsset) {
      return new Response(JSON.stringify({ error: "Asset not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build message content with model references for face consistency
    const messageContent: any[] = [];

    // Add model reference photos first for identity lock
    const refUrls = Array.isArray(modelReferenceUrls) ? modelReferenceUrls.slice(0, 3) : [];
    if (refUrls.length > 0) {
      messageContent.push({
        type: "text",
        text: "MODEL REFERENCE PHOTOS — The following image(s) show the EXACT person who MUST remain in the edited image. Preserve their face shape, eyes, nose, lips, jawline, hairline, skin tone, and age. Do NOT replace or alter this person.",
      });
      for (const refUrl of refUrls) {
        messageContent.push({ type: "image_url", image_url: { url: refUrl } });
      }
    }

    messageContent.push({
      type: "text",
      text: `Edit this product photography image: ${editPrompt}. Keep the product intact and recognizable.${refUrls.length > 0 ? " Keep the model's face and identity EXACTLY the same — do not change the person." : ""} Professional commercial photography quality. No text, no watermarks.`,
    });
    messageContent.push({
      type: "image_url",
      image_url: { url: currentAsset.url },
    });

    // Call AI with existing image + edit prompt + model references
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          {
            role: "user",
            content: messageContent,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI edit error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Insufficient AI credits" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Image editing failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      console.error("No image in AI edit response");
      return new Response(JSON.stringify({ error: "No image generated" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upload to storage
    const base64Match = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      return new Response(JSON.stringify({ error: "Invalid image format" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const ext = base64Match[1] === "jpeg" ? "jpg" : base64Match[1];
    const base64Content = base64Match[2];
    const binaryData = Uint8Array.from(atob(base64Content), (c) => c.charCodeAt(0));
    const filePath = `${currentAsset.project_id}/edited-${Date.now()}.${ext}`;

    const { error: uploadErr } = await serviceClient.storage
      .from("originals")
      .upload(filePath, binaryData, {
        contentType: `image/${base64Match[1]}`,
        upsert: true,
      });

    if (uploadErr) {
      console.error("Upload error:", uploadErr);
      return new Response(JSON.stringify({ error: "Failed to upload edited image" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: publicUrlData } = serviceClient.storage
      .from("originals")
      .getPublicUrl(filePath);

    const newUrl = publicUrlData.publicUrl;

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

    // Log credit transaction
    await serviceClient.from("credit_transactions").insert({
      user_id: userId,
      amount: -1,
      description: "Edited shot",
      transaction_type: "debit",
    });

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
