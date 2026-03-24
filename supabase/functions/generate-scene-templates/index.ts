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
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageUrl, category, productInfo } = await req.json();
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "No image URL provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { token, projectId } = await getVertexAccessToken(saJson);

    const productContext = productInfo
      ? `Product: "${productInfo.productName || "Unknown"}". Category: ${category || productInfo.category || "General"}. Colors: ${(productInfo.colors || []).join(", ")}. Material: ${productInfo.material || "unknown"}. Description: ${productInfo.description || "N/A"}.`
      : `Category: ${category || "General"}.`;

    const systemPrompt = `You are a world-class creative director for product photography. Given a product image and its details, generate 20 unique, tailored scene templates for photographing THIS SPECIFIC product.

CRITICAL RULES:
- Every template MUST be specifically designed for this product type. A lipstick should never get "Ghost Mannequin" or "Hanging on Rail". A ring should never get "Folded Stack".
- Each description must be 2-3 sentences of rich visual direction that references the product's actual colors, materials, and form factor.
- STRICTLY NO humans, models, hands, faces, or body parts in ANY template. Product-only scenes.
- Descriptions should be detailed enough for an AI image generator to produce the scene.

Generate exactly:
- 5 "Studio" templates: Clean, professional studio settings
- 5 "E-commerce" templates: Marketplace-ready, clean backgrounds, flat lays
- 5 "Mystic" templates: Surreal, fantastical, dramatic settings
- 5 "Showcase" templates: Editorial, lifestyle, contextual settings

Each template name should be unique, evocative, and 2-3 words max.
Product details: ${productContext}`;

    const imagePart = await toVertexPart(imageUrl);
    const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-flash:generateContent`;

    const aiResponse = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            imagePart,
            { text: "Analyze this product and generate 20 tailored scene templates for it. Make every template specifically relevant to this exact product." },
          ],
        }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        tools: [{
          functionDeclarations: [{
            name: "return_scene_templates",
            description: "Return 20 tailored scene templates for product photography",
            parameters: {
              type: "object",
              properties: {
                templates: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string", description: "Short template name (2-3 words)" },
                      description: { type: "string", description: "Rich 2-3 sentence visual direction" },
                      category_tag: { type: "string", enum: ["Studio", "E-commerce", "Mystic", "Showcase"] },
                    },
                    required: ["name", "description", "category_tag"],
                  },
                },
              },
              required: ["templates"],
            },
          }],
        }],
        toolConfig: {
          functionCallingConfig: { mode: "ANY", allowedFunctionNames: ["return_scene_templates"] },
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
      return new Response(JSON.stringify({ error: "Failed to generate templates" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const functionCall = aiData.candidates?.[0]?.content?.parts?.find((p: any) => p.functionCall)?.functionCall;

    if (!functionCall) {
      return new Response(JSON.stringify({ error: "No templates generated" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = functionCall.args;
    const CATEGORY_COLORS: Record<string, string> = {
      Studio: "hsl(220 15% 65% / 0.25)",
      "E-commerce": "hsl(0 0% 88% / 0.35)",
      Mystic: "hsl(270 40% 60% / 0.2)",
      Showcase: "hsl(30 50% 60% / 0.2)",
    };

    const templates = (result.templates || []).map((t: any, i: number) => ({
      id: `dynamic-${i}`,
      name: t.name,
      description: t.description,
      category: t.category_tag,
      color: CATEGORY_COLORS[t.category_tag] || "hsl(220 15% 65% / 0.25)",
    }));

    return new Response(JSON.stringify({ templates }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-scene-templates error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
