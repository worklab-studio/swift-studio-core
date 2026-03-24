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

    const { image, shootType, productCategory } = await req.json();
    if (!image) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { token, projectId } = await getVertexAccessToken(saJson);
    const isModelShoot = shootType === "model" || shootType === "model_shot";

    const systemText = `You are an expert photography director and art director. Analyze the reference image and extract the visual style, pose direction, camera angle, lighting setup, composition approach, color palette, and mood. Return structured data that can be used to recreate a similar look for ${isModelShoot ? "a model wearing/holding" : "a product showcase of"} a ${productCategory || "fashion/lifestyle"} product.

For model shoots, focus on:
- Pose: body position, hand placement, gaze direction, stance, posture
- Angle: camera height, tilt, distance, focal length feel
- Lighting: key light position, fill, rim/hair light, ambient, shadows
- Composition: framing, rule of thirds, negative space, crop style

For product shoots, focus on:
- Pose: product orientation, angle of display, hero positioning
- Angle: camera height relative to product, tilt, perspective distortion
- Lighting: highlight placement, shadow direction, specular vs diffuse
- Composition: centering, prop arrangement, background depth`;

    const imagePart = await toVertexPart(image);
    const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-flash:generateContent`;

    const aiResponse = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            imagePart,
            { text: `Analyze this reference image for a ${isModelShoot ? "model" : "product"} photoshoot. Extract the complete visual style settings.` },
          ],
        }],
        systemInstruction: { parts: [{ text: systemText }] },
        tools: [{
          functionDeclarations: [{
            name: "return_style_analysis",
            description: "Return structured style analysis from a reference image",
            parameters: {
              type: "object",
              properties: {
                styleName: { type: "string", description: "Short descriptive name for this style" },
                pose: { type: "string", description: "Detailed pose description" },
                angle: { type: "string", description: "Camera angle and perspective" },
                lighting: { type: "string", description: "Complete lighting setup" },
                composition: { type: "string", description: "Composition and framing approach" },
                colorPalette: { type: "array", items: { type: "string" }, description: "Dominant colors (3-5)" },
                mood: { type: "string", description: "Overall mood and atmosphere" },
                fullPrompt: { type: "string", description: "Complete photography prompt to recreate this style" },
              },
              required: ["styleName", "pose", "angle", "lighting", "composition", "colorPalette", "mood", "fullPrompt"],
            },
          }],
        }],
        toolConfig: {
          functionCallingConfig: { mode: "ANY", allowedFunctionNames: ["return_style_analysis"] },
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
      return new Response(JSON.stringify({ error: "Style analysis failed" }), {
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

    return new Response(JSON.stringify(functionCall.args), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-style-reference error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
