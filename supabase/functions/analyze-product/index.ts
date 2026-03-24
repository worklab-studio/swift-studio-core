import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Vertex AI auth helpers ───
function base64url(data: Uint8Array): string {
  let binary = "";
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----BEGIN .*-----/, "").replace(/-----END .*-----/, "").replace(/\s/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function getVertexAccessToken(serviceAccountJson: string): Promise<{ token: string; projectId: string }> {
  let cleaned = serviceAccountJson.trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    try { cleaned = JSON.parse(cleaned); } catch (_) {}
  }
  const sa = JSON.parse(cleaned);
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const payload = base64url(new TextEncoder().encode(JSON.stringify({
    iss: sa.client_email, sub: sa.client_email,
    aud: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/cloud-platform",
    iat: now, exp: now + 3600,
  })));
  const signingInput = `${header}.${payload}`;
  const key = await crypto.subtle.importKey("pkcs8", pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = base64url(new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(signingInput))));
  const jwt = `${signingInput}.${signature}`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  if (!tokenRes.ok) throw new Error(`Google OAuth failed: ${await tokenRes.text()}`);
  const { access_token } = await tokenRes.json();
  return { token: access_token, projectId: sa.project_id };
}

async function toVertexPart(imageUrlOrDataUri: string): Promise<any> {
  if (imageUrlOrDataUri.startsWith("data:")) {
    const match = imageUrlOrDataUri.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
    if (match) return { inlineData: { mimeType: match[1], data: match[2] } };
  }
  const res = await fetch(imageUrlOrDataUri);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const ct = res.headers.get("content-type") || "image/jpeg";
  return { inlineData: { mimeType: ct.split(";")[0], data: btoa(binary) } };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const saJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
    if (!saJson) {
      return new Response(JSON.stringify({ error: "Google service account not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { image } = await req.json();
    if (!image) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { token, projectId } = await getVertexAccessToken(saJson);

    const systemText = `You are a product photography and fashion expert. Analyze the product in the image and return structured information.

Special instructions for Apparel & Fashion products:
- Detect the specific garment type precisely (e.g., "slim-fit formal shirt", "embroidered kurta", "A-line midi dress", "distressed denim jacket").
- Suggest a complete complementary outfit pairing based on formality, color, and cultural context. For example, for a navy formal shirt suggest "charcoal slim-fit trousers, black leather belt, dark brown oxford shoes".
- For non-apparel products, set garmentType and outfitSuggestion to null.

Special instructions for Skincare / Beauty products:
- Detect the application area: face, hair, lips, eyes, body, nails, or fragrance. Set beautyApplication accordingly. Null for non-beauty.
- Detect product size: mini (lip balm, sample vial, travel size), standard (serum bottle, lipstick tube, cream jar), large (pump bottle, family-size lotion), extra-large (salon-size, bulk). Set beautySize accordingly. Null for non-beauty.
- REQUIRED: You MUST generate 4-5 outfit/clothing suggestions for model shoots with this beauty product. This field must NOT be null for any product categorized as Skincare, Beauty, or Personal Care. Tailor suggestions to the product's color palette, vibe, application area, and brand aesthetic. For face products suggest outfits that don't obstruct the face (off-shoulder tops, simple tanks). For body products suggest outfits showing the application area. For fragrance suggest elegant evening/sophisticated wear. For hair products suggest outfits that let hair be the focus. Each suggestion should be a complete outfit description (e.g., "White silk slip dress with delicate gold jewelry, hair down"). Set suggestedOutfits accordingly. Null ONLY for non-beauty/non-skincare/non-personal-care products.

Special instructions for FMCG products (packaged food, beverages, cleaning, personal care):
- Detect size: small (sachet, single-serve packet, candy bar), medium (standard bottle, cereal box, pouch up to 1kg), large (family-size bottle, 2L+ container), extra-large (bulk pack, 5kg+). Set fmcgSize accordingly. Null for non-FMCG.
- Detect packaging type: bottle, can, pouch, sachet, box, jar, tube, carton, bag. Set fmcgPackaging accordingly. Null for non-FMCG.
- Detect sub-type: food, beverage, spice, sauce, snack, cleaning, personal care, health supplement. Set fmcgSubType accordingly. Null for non-FMCG.

Background suggestions (for ALL products):
- suggestedModelShootBackgrounds: Generate 5-7 specific lifestyle background descriptions where a person would naturally use/wear/hold this product. Tailor to the product's color, material, vibe and category. Each should be 1-2 sentences describing the setting vividly. Examples: "Sun-drenched Mediterranean terrace with whitewashed walls and terracotta pots", "Modern minimalist bathroom with soft morning light through frosted glass".
- suggestedShowcaseBackgrounds: Generate 5-7 specific product-only showcase surface/setting descriptions for luxury product photography. Tailor to the product's aesthetic. Examples: "Polished black obsidian slab with scattered gold leaf flakes", "Lush moss-covered forest floor with dappled sunlight".

Model & Background detection (for ALL products):
- Detect whether a REAL, PHYSICAL human model is present in the photograph — meaning an actual person physically wearing, holding, or posing with the product in the scene.
- Do NOT count as a model:
  • Printed/illustrated faces or figures on product packaging, labels, or boxes
  • Brand ambassador photos printed on the product itself
  • Artistic illustrations, cartoons, or drawings of people on the product
  • Mannequins, busts, or display forms
  • Small thumbnail images of people on ingredient lists, instructions, or marketing text on packaging
- Only set hasModel to true if a real 3D human body is physically present in the photograph as a separate entity from the product.
- If no real model is detected, set modelNote to "No model detected, add in upcoming steps."
- If a real model IS detected on an apparel item, set modelNote to "Model detected — ghost mannequin extraction available."
- For non-apparel with a real model, set modelNote to "Model detected in image."
- Detect whether the product is on a clean white/studio background. If not, set hasWhiteBackground to false.`;

    const imagePart = await toVertexPart(image);

    const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-flash:generateContent`;

    const aiResponse = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            imagePart,
            { text: "Analyze this product image comprehensively. Identify category, colors, material, suggest a product name, write a brief description, detect garment type if apparel, suggest outfit pairing if apparel, detect beauty application area and size if skincare/beauty, detect FMCG size/packaging/sub-type if FMCG, detect if a human model is present, check if background is white/studio, and generate tailored model shoot and showcase background suggestions." },
          ],
        }],
        systemInstruction: { parts: [{ text: systemText }] },
        tools: [{
          functionDeclarations: [{
            name: "return_product_info",
            description: "Return structured product analysis with category-specific detection, model detection, background check, and AI-suggested backgrounds",
            parameters: {
              type: "object",
              properties: {
                category: {
                  type: "string",
                  enum: ["apparel_fashion", "jewellery", "bags_luggage", "beauty_personal_care", "fmcg", "footwear"],
                  description: "Product category",
                },
                colors: { type: "array", items: { type: "string" }, description: "Detected colors" },
                material: { type: "string", description: "Primary material" },
                suggestedShots: { type: "array", items: { type: "string" }, description: "Recommended shot types" },
                description: { type: "string", description: "Brief product description" },
                productName: { type: "string", description: "Suggested product name" },
                garmentType: { type: "string", nullable: true, description: "Specific garment type if apparel" },
                outfitSuggestion: { type: "string", nullable: true, description: "Outfit pairing for apparel" },
                beautyApplication: { type: "string", nullable: true, description: "Application area for beauty" },
                beautySize: { type: "string", nullable: true, description: "Size for beauty products" },
                suggestedOutfits: { type: "array", items: { type: "string" }, description: "Outfit suggestions for beauty model shoots" },
                fmcgSize: { type: "string", nullable: true, description: "Size for FMCG" },
                fmcgPackaging: { type: "string", nullable: true, description: "Packaging type for FMCG" },
                fmcgSubType: { type: "string", nullable: true, description: "Sub-type for FMCG" },
                suggestedModelShootBackgrounds: { type: "array", items: { type: "string" }, description: "Lifestyle background descriptions" },
                suggestedShowcaseBackgrounds: { type: "array", items: { type: "string" }, description: "Showcase background descriptions" },
                hasModel: { type: "boolean", description: "Whether a human model is detected" },
                hasWhiteBackground: { type: "boolean", description: "Whether background is white/studio" },
                modelNote: { type: "string", nullable: true, description: "Model detection note" },
              },
              required: ["category", "colors", "material", "suggestedShots", "description", "productName", "garmentType", "outfitSuggestion", "beautyApplication", "beautySize", "suggestedOutfits", "fmcgSize", "fmcgPackaging", "fmcgSubType", "suggestedModelShootBackgrounds", "suggestedShowcaseBackgrounds", "hasModel", "hasWhiteBackground", "modelNote"],
            },
          }],
        }],
        toolConfig: {
          functionCallingConfig: {
            mode: "ANY",
            allowedFunctionNames: ["return_product_info"],
          },
        },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("Vertex AI error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const functionCall = aiData.candidates?.[0]?.content?.parts?.find((p: any) => p.functionCall)?.functionCall;

    if (!functionCall) {
      return new Response(JSON.stringify({ error: "No analysis result" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const productInfo = functionCall.args;

    // Ensure suggestedOutfits is always an array for beauty/skincare
    if (['Skincare', 'Beauty', 'Personal Care'].includes(productInfo.category)) {
      if (!productInfo.suggestedOutfits || !Array.isArray(productInfo.suggestedOutfits) || productInfo.suggestedOutfits.length === 0) {
        productInfo.suggestedOutfits = [
          'White off-shoulder top with minimal gold jewelry, hair styled naturally',
          'Silk camisole in neutral tone with delicate chain necklace',
          'Simple black tank top with dewy skin and clean makeup',
          'Cream knit sweater with soft natural styling',
        ];
      }
    }

    return new Response(JSON.stringify(productInfo), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-product error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
