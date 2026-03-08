import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHOT_LABELS_CAMPAIGN = ["hero", "detail", "lifestyle", "alternate", "editorial", "flat_lay"];
const SHOT_LABELS_SINGLE = ["hero"];

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

    const { projectId, preset, shotCount, additionalContext, category, shotType, modelConfig, stylePrompt, productImageUrl, aspectRatio, keepOriginalModel } = await req.json();

    if (!projectId || !preset || !shotCount) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify project belongs to user
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("id, user_id")
      .eq("id", projectId)
      .eq("user_id", userId)
      .single();

    if (projErr || !project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isCampaign = shotCount === "campaign";
    const creditCost = isCampaign ? 6 : 1;
    const labels = isCampaign ? SHOT_LABELS_CAMPAIGN : SHOT_LABELS_SINGLE;

    // Check credits
    const { data: profileData, error: profileErr } = await supabase
      .from("profiles")
      .select("credits_remaining")
      .eq("user_id", userId)
      .single();

    if (profileErr || !profileData) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profileData.credits_remaining < creditCost) {
      return new Response(JSON.stringify({ error: "Insufficient credits" }), {
        status: 402,
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

    // Service client for storage uploads
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Build prompts for each shot
    const ratioInstruction = aspectRatio ? `Image aspect ratio: ${aspectRatio}.` : "";
    const keepModelInstruction = keepOriginalModel
      ? " Use the EXACT same model visible in the reference product image. Maintain the same person, face, body type, and styling across all shots."
      : "";
    const consistencyInstruction = shotType === "model_shot"
      ? `IMPORTANT: Every image MUST show ONLY the model wearing/holding the product. Do NOT show the product alone without a model.${keepModelInstruction}`
      : "IMPORTANT: Every image MUST show ONLY the product. Do NOT include any human model in the image.";

    const shotPrompts = labels.map((label) => {
      const baseStyle = stylePrompt || `${preset} style photography`;
      const shotTypeDesc: Record<string, string> = {
        hero: "Hero shot — primary product showcase, clean and striking, the definitive product image",
        detail: "Close-up detail shot — macro-style focus on texture, stitching, material quality, fine details",
        lifestyle: "Lifestyle shot — product in natural use context, environmental storytelling, aspirational setting",
        alternate: "Alternate angle — different perspective showing product from side or back, revealing hidden details",
        editorial: "Editorial shot — magazine-worthy composition, artistic styling, fashion-forward presentation",
        flat_lay: "Flat lay — top-down bird's eye view, styled arrangement on a clean surface with complementary props",
      };
      const modelDesc = shotType === "model_shot" && modelConfig
        ? `The product is worn/held by a ${modelConfig.gender || ""} ${modelConfig.ethnicity || ""} model with ${modelConfig.bodyType || "average"} build. Background: ${modelConfig.backgroundPrompt || modelConfig.background || "studio"}.`
        : "Product-only shot, no human model.";

      return `${shotTypeDesc[label] || label}. ${baseStyle}. Category: ${category}. ${modelDesc} ${consistencyInstruction}${additionalContext ? ` Additional direction: ${additionalContext}` : ""}. ${ratioInstruction} Professional commercial photography, high resolution, no text, no watermarks.`;
    });

    // Generate images sequentially to avoid rate limits
    const insertedAssets: any[] = [];

    for (let i = 0; i < labels.length; i++) {
      const label = labels[i];
      const prompt = shotPrompts[i];

      console.log(`Generating shot ${i + 1}/${labels.length}: ${label}`);

      // Build message content with product image reference if available
      const messageContent: any[] = [{ type: "text", text: prompt }];
      if (productImageUrl) {
        messageContent.push({
          type: "image_url",
          image_url: { url: productImageUrl },
        });
      }

      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-pro-image-preview",
            messages: [{ role: "user", content: messageContent }],
            modalities: ["image", "text"],
          }),
        });

        if (!aiResponse.ok) {
          const errText = await aiResponse.text();
          console.error(`AI error for ${label}:`, aiResponse.status, errText);

          if (aiResponse.status === 429) {
            // Wait and retry once
            console.log("Rate limited, waiting 10s and retrying...");
            await new Promise((r) => setTimeout(r, 10000));
            const retryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-3-pro-image-preview",
                messages: [{ role: "user", content: messageContent }],
                modalities: ["image", "text"],
              }),
            });
            if (!retryResponse.ok) {
              console.error(`Retry also failed for ${label}`);
              continue;
            }
            const retryData = await retryResponse.json();
            const retryImage = retryData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
            if (retryImage) {
              const url = await uploadBase64Image(serviceClient, retryImage, projectId, label);
              if (url) {
                const { data: asset } = await supabase.from("assets").insert({
                  project_id: projectId, asset_type: "ai_generated", url,
                  shot_label: label, preset_used: preset, prompt_used: prompt,
                }).select().single();
                if (asset) insertedAssets.push(asset);
              }
            }
            continue;
          }

          if (aiResponse.status === 402) {
            return new Response(JSON.stringify({ error: "Insufficient AI credits" }), {
              status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          continue;
        }

        const aiData = await aiResponse.json();
        const imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (!imageData) {
          console.error(`No image in response for ${label}`);
          continue;
        }

        const url = await uploadBase64Image(serviceClient, imageData, projectId, label);
        if (!url) continue;

        const { data: asset } = await supabase.from("assets").insert({
          project_id: projectId, asset_type: "ai_generated", url,
          shot_label: label, preset_used: preset, prompt_used: prompt,
        }).select().single();

        if (asset) insertedAssets.push(asset);
      } catch (shotErr) {
        console.error(`Error generating ${label}:`, shotErr);
        continue;
      }

      // Small delay between shots to avoid rate limits
      if (i < labels.length - 1) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    if (insertedAssets.length === 0) {
      return new Response(JSON.stringify({ error: "Failed to generate any images" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduct credits
    await supabase.from("profiles").update({
      credits_remaining: profileData.credits_remaining - creditCost,
    }).eq("user_id", userId);

    // Update project status
    await supabase.from("projects").update({ status: "complete" }).eq("id", projectId);

    return new Response(JSON.stringify({ assets: insertedAssets }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-shots error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function uploadBase64Image(
  serviceClient: any,
  dataUrl: string,
  projectId: string,
  label: string
): Promise<string | null> {
  const base64Match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!base64Match) {
    console.error("Invalid image format from AI");
    return null;
  }

  const ext = base64Match[1] === "jpeg" ? "jpg" : base64Match[1];
  const base64Content = base64Match[2];
  const binaryData = Uint8Array.from(atob(base64Content), (c) => c.charCodeAt(0));
  const filePath = `${projectId}/generated-${label}-${Date.now()}.${ext}`;

  const { error: uploadErr } = await serviceClient.storage
    .from("originals")
    .upload(filePath, binaryData, {
      contentType: `image/${base64Match[1]}`,
      upsert: true,
    });

  if (uploadErr) {
    console.error("Storage upload error:", uploadErr);
    return null;
  }

  const { data: publicUrlData } = serviceClient.storage
    .from("originals")
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}
