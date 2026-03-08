import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHOT_LABELS_CAMPAIGN = ["hero", "detail", "lifestyle", "alternate", "editorial"];
const SHOT_LABELS_SINGLE = ["hero"];

// Curated Unsplash images per preset for MVP placeholders
const PRESET_IMAGES: Record<string, string[]> = {
  classic: [
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80",
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80",
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80",
    "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=800&q=80",
    "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&q=80",
  ],
  minimalist: [
    "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
    "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&q=80",
    "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=800&q=80",
    "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=800&q=80",
  ],
  luxury: [
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80",
    "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=800&q=80",
    "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80",
    "https://images.unsplash.com/photo-1558171813-01ac71e4c6a3?w=800&q=80",
    "https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=800&q=80",
  ],
};

// Default fallback images
const DEFAULT_IMAGES = [
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80",
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80",
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80",
  "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=800&q=80",
  "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&q=80",
];

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

    const { projectId, preset, shotCount, additionalContext, category, shotType, modelConfig, stylePrompt } = await req.json();

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
    const creditCost = isCampaign ? 5 : 1;
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

    // Use AI to generate descriptive prompts for each shot
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let shotPrompts: string[] = labels.map((l) => `${preset} style ${l} shot`);

    if (LOVABLE_API_KEY) {
      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: "You generate short creative image prompts for product photography. Return ONLY a JSON array of strings, one prompt per shot.",
              },
              {
                role: "user",
                content: `Generate ${labels.length} image prompt(s) for a ${category} product. ${stylePrompt ? `Style direction: ${stylePrompt}.` : `Style: ${preset}.`} Shot types: ${labels.join(", ")}. ${shotType === "model_shot" && modelConfig ? `Model: ${modelConfig.gender || ""} ${modelConfig.ethnicity || ""} ${modelConfig.bodyType || ""}. Background: ${modelConfig.backgroundPrompt || modelConfig.background || "studio"}.` : "Product showcase, no model."} ${additionalContext ? `Additional direction: ${additionalContext}` : ""}`,
              },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "return_prompts",
                  description: "Return generated image prompts",
                  parameters: {
                    type: "object",
                    properties: {
                      prompts: {
                        type: "array",
                        items: { type: "string" },
                      },
                    },
                    required: ["prompts"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "return_prompts" } },
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall) {
            const parsed = JSON.parse(toolCall.function.arguments);
            if (Array.isArray(parsed.prompts) && parsed.prompts.length >= labels.length) {
              shotPrompts = parsed.prompts.slice(0, labels.length);
            }
          }
        }
      } catch (e) {
        console.error("AI prompt generation failed, using defaults:", e);
      }
    }

    // Get placeholder images based on preset
    const presetImages = PRESET_IMAGES[preset] || DEFAULT_IMAGES;

    // Insert assets
    const assetsToInsert = labels.map((label, i) => ({
      project_id: projectId,
      asset_type: "ai_generated",
      url: presetImages[i % presetImages.length],
      shot_label: label,
      preset_used: preset,
      prompt_used: shotPrompts[i] || `${preset} ${label}`,
    }));

    const { data: insertedAssets, error: insertErr } = await supabase
      .from("assets")
      .insert(assetsToInsert)
      .select();

    if (insertErr) {
      console.error("Insert error:", insertErr);
      return new Response(JSON.stringify({ error: "Failed to save generated assets" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduct credits
    await supabase
      .from("profiles")
      .update({ credits_remaining: profileData.credits_remaining - creditCost })
      .eq("user_id", userId);

    // Update project status
    await supabase
      .from("projects")
      .update({ status: "complete" })
      .eq("id", projectId);

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
