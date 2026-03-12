import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHOT_LABELS_CAMPAIGN = ["hero", "detail", "lifestyle", "alternate", "editorial", "flat_lay"];
const SHOT_LABELS_CAMPAIGN_ADD = ["detail", "lifestyle", "alternate", "editorial", "flat_lay"];
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

    const { projectId, preset, shotCount, additionalContext, category, shotType, modelConfig, stylePrompt, productImageUrl, aspectRatio, keepOriginalModel, productLabel, sceneTemplate } = await req.json();

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
    const isCampaignAdd = shotCount === "campaign_add";
    const creditCost = isCampaign ? 6 : isCampaignAdd ? 5 : 1;
    const labels = isCampaign ? SHOT_LABELS_CAMPAIGN : isCampaignAdd ? SHOT_LABELS_CAMPAIGN_ADD : SHOT_LABELS_SINGLE;

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

    // Product shoot masterpiece quality booster
    const MASTERPIECE_BOOSTER = "MASTERPIECE PRODUCT PHOTOGRAPHY DIRECTIVE: Create an ultra-high-end advertising campaign image. The product must be the absolute hero and centerpiece, perfectly preserved in its EXACT original form — same color, shape, texture, every detail intact and unaltered. The scene around it should be surreal, fantastical, and jaw-dropping — the kind of visual that stops viewers mid-scroll. Think award-winning commercial photography meets digital art. Cinematic lighting with extraordinary attention to detail. The product should look like a precious artifact on display. 8K hyper-detailed, photorealistic rendering.";

    // Category-aware style modifiers
    const CATEGORY_MODIFIERS: Record<string, string> = {
      "Apparel": "The garment should appear alive and dynamic — fabric billowing, sleeves flowing, material catching wind as if frozen mid-movement, natural drape and folds showing the garment's silhouette and construction. The clothing should float, twist, or cascade dramatically as if worn by an invisible figure in motion. Show the fabric's weight, texture, and movement quality.",
      "Fashion": "The garment should appear alive and dynamic — fabric billowing, sleeves flowing, material catching wind as if frozen mid-movement, natural drape and folds showing the garment's silhouette and construction. The clothing should float, twist, or cascade dramatically as if worn by an invisible figure in motion. Show the fabric's weight, texture, and movement quality.",
      "Footwear": "The shoe should be the sculptural hero — show sole architecture, material texture, lace detail. Angle to reveal both profile and 3/4 view. Treat it like a piece of industrial design art.",
      "Skincare": "Show the product with its texture — cream swirls, liquid droplets, ingredient splashes (botanicals, honey, citrus). The packaging should gleam with dewy freshness.",
      "Beauty": "Show the product with its texture — cream swirls, liquid droplets, ingredient splashes (botanicals, honey, citrus). The packaging should gleam with dewy freshness and luminosity.",
      "Jewelry": "Capture light refractions, gemstone fire, metal luster. Dramatic macro-close energy even in wide shots. Every facet should sparkle with brilliance.",
      "Watch": "Capture light refractions, metal luster, dial details, crystal clarity. Dramatic macro-close energy even in wide shots. Precision engineering visible.",
      "Electronics": "Sleek tech product launch feel — screen glow, interface reflections, precision engineering visible. Futuristic and minimal aesthetic.",
      "Food": "Appetite appeal — condensation, steam, fresh ingredients, pour shots, splashes frozen in time. Sensory and visceral.",
      "Beverage": "Appetite appeal — condensation droplets, liquid splashes frozen in time, ice crystals, effervescence. Sensory and refreshing.",
      "FMCG": "Show the product packaging with tactile appeal — texture of materials, label details, complementary lifestyle elements that reinforce the brand story.",
    };

    const categoryModifier = CATEGORY_MODIFIERS[category] || "Showcase the product's most distinctive material qualities, textures, and design details.";

    const isApparel = ["Apparel", "Fashion"].includes(category);

    // Apparel-specific shot shape directives
    const apparelShotShapes: Record<string, string> = {
      hero: "The garment floats upright as if worn by an invisible figure — fabric gently billowing, sleeves naturally spread, collar structured, showing the full silhouette with life and volume. NOT flat or static.",
      detail: "Extreme close-up of the fabric — show the weave, stitching, texture with natural draping folds. The material should look tactile and luxurious, caught mid-drape.",
      lifestyle: "The garment caught mid-swirl or flowing in wind — dynamic frozen movement, fabric trailing and twisting elegantly. As if someone just spun and the clothing is still dancing.",
      alternate: "The garment from behind or side, floating with natural body shape implied. Back panel details visible, fabric flowing outward as if caught in a gentle breeze.",
      editorial: "Dramatic fabric explosion — the garment unfurling, cascading, or twisting in a bold artistic shape. Haute couture energy, the clothing as abstract sculpture.",
      flat_lay: "Artfully arranged from above with natural flowing shape — NOT pressed flat. Gentle folds, natural curves, as if the garment just landed softly on the surface.",
    };

    const productShotTypeDesc: Record<string, string> = {
      hero: "Hero product shot — the product is the undeniable star, perfectly centered and fully visible at its most flattering angle, dramatic lighting sculpting every surface and edge, the scene built entirely to frame and elevate the product as a masterpiece.",
      detail: "Intimate detail shot — extreme close-up revealing the product's finest craftsmanship details (texture, stitching, material quality, surface finish, hardware), shallow depth of field with creamy bokeh, the scene elements still visible but softly blurred in the background, macro lens quality.",
      lifestyle: "Aspirational lifestyle scene — the product placed in a breathtaking real-world context that communicates desire and aspiration, environmental storytelling with the product as the focal hero, cinematic depth and atmosphere, golden hour or dramatic natural lighting.",
      alternate: "Dramatic alternate angle — the product shown from a completely different perspective (3/4 back, profile, low angle looking up, or overhead), revealing hidden details and dimensions not visible in the hero shot, the scene adapted to complement this new viewing angle.",
      editorial: "Editorial masterpiece — the product in a high-art composition worthy of a museum exhibition or luxury magazine cover, unconventional camera angle (low Dutch tilt, extreme perspective), powerful directional lighting creating dramatic chiaroscuro, bold asymmetric composition with intentional negative space, completely different mood and energy from all other shots.",
      flat_lay: "Artistic flat lay — breathtaking top-down bird's eye view, the product surrounded by carefully curated complementary elements (botanicals, textures, lifestyle objects) arranged with gallery-level precision on a beautiful surface, perfectly even overhead lighting, every element chosen to reinforce the premium brand story.",
    };

    const shotPrompts = labels.map((label) => {
      const isProductShoot = sceneTemplate?.description && shotType !== "model_shot";

      if (isProductShoot) {
        const shotDesc = productShotTypeDesc[label] || label;
        const apparelDirective = isApparel ? ` GARMENT SHAPE: ${apparelShotShapes[label] || apparelShotShapes.hero}` : "";
        return `${MASTERPIECE_BOOSTER} PRODUCT STYLE: ${categoryModifier}${apparelDirective} ${shotDesc} SCENE DIRECTION: ${sceneTemplate.description}. Product category: ${category}. Product-only shot, absolutely no human model in the image. ${consistencyInstruction}${additionalContext ? ` Additional creative direction: ${additionalContext}` : ""}. ${ratioInstruction} No text, no watermarks, no logos.`;
      }

      // Original flow for model shots and non-template shoots
      const baseStyle = stylePrompt || `${preset} style photography`;
      const shotTypeDesc: Record<string, string> = {
        hero: "Hero shot — front-facing, full body or full product visible, hands relaxed at sides or product centered, straight-on camera at eye level, clean symmetrical framing, the definitive primary product image. The model/product should be still, poised, and directly engaging the camera.",
        detail: "Close-up detail shot — extreme macro-style focus on texture, stitching, material quality, fine craftsmanship details. Tight crop on a specific area (fabric weave, hardware, logo, seam). Shallow depth of field, f/2.8 macro lens feel.",
        lifestyle: "Lifestyle shot — candid mid-action pose: walking, turning, reaching, or adjusting the product naturally. Shot from a 3/4 angle (not straight-on). Environmental context with props and setting that tell a story. Slight sense of movement and energy, natural body language, relaxed authentic expression. The scene should feel aspirational and relatable.",
        alternate: "Alternate angle — show the product from the back or side view, over-the-shoulder perspective or profile angle. Reveal hidden details, back panel, side seams, or structural elements not visible in the hero shot. Different body orientation than hero (if hero is front, this is back/side).",
        editorial: "Editorial shot — high-fashion dramatic pose with strong angles: a confident lean, crossed arms, or asymmetric weight shift. Shot from a low camera angle or slight Dutch tilt for drama. Strong directional lighting with deep shadows on one side. Asymmetric composition with intentional negative space. Magazine cover worthy, fashion-forward, artistic and bold. Completely different mood from the hero shot.",
        flat_lay: "Flat lay — top-down bird's eye view from directly above, product laid flat on a clean surface, styled arrangement with complementary props (accessories, fabrics, botanicals), organized grid or artful scatter composition. No model visible.",
      };
      const modelDesc = shotType === "model_shot" && modelConfig
        ? `The product is worn/held by a ${modelConfig.gender || ""} ${modelConfig.ethnicity || ""} model with ${modelConfig.bodyType || "average"} build. Background: ${modelConfig.backgroundPrompt || modelConfig.background || "studio"}.`
        : "Product-only shot, no human model.";

      return `${shotTypeDesc[label] || label}. ${baseStyle}. Category: ${category}. ${modelDesc} ${consistencyInstruction}${additionalContext ? ` Additional direction: ${additionalContext}` : ""}. ${ratioInstruction} Professional commercial photography, high resolution, no text, no watermarks.`;
    });

    // Generate images in parallel batches
    const insertedAssets: any[] = [];

    async function generateSingleShot(label: string, prompt: string): Promise<any | null> {
      const messageContent: any[] = [{ type: "text", text: prompt }];
      if (productImageUrl) {
        messageContent.push({ type: "image_url", image_url: { url: productImageUrl } });
      }

      const callAI = async () => {
        const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        return resp;
      };

      let aiResponse = await callAI();

      if (aiResponse.status === 429) {
        console.log(`Rate limited for ${label}, waiting 10s and retrying...`);
        await new Promise((r) => setTimeout(r, 10000));
        aiResponse = await callAI();
      }

      if (aiResponse.status === 402) {
        throw new Error("INSUFFICIENT_AI_CREDITS");
      }

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error(`AI error for ${label}:`, aiResponse.status, errText);
        return null;
      }

      const aiData = await aiResponse.json();
      const imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!imageData) {
        console.error(`No image in response for ${label}`);
        return null;
      }

      const url = await uploadBase64Image(serviceClient, imageData, projectId, label);
      if (!url) return null;

      const { data: asset } = await supabase.from("assets").insert({
        project_id: projectId, asset_type: "ai_generated", url,
        shot_label: label, preset_used: preset, prompt_used: prompt,
        product_label: productLabel || null,
      }).select().single();

      return asset || null;
    }

    // Process in batches of 3
    const batchSize = 3;
    for (let i = 0; i < labels.length; i += batchSize) {
      const batchLabels = labels.slice(i, i + batchSize);
      const batchPrompts = shotPrompts.slice(i, i + batchSize);

      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}: ${batchLabels.join(", ")}`);

      const results = await Promise.allSettled(
        batchLabels.map((label, idx) => generateSingleShot(label, batchPrompts[idx]))
      );

      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          insertedAssets.push(result.value);
        } else if (result.status === "rejected" && result.reason?.message === "INSUFFICIENT_AI_CREDITS") {
          return new Response(JSON.stringify({ error: "Insufficient AI credits" }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Pause between batches
      if (i + batchSize < labels.length) {
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
