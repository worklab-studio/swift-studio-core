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

    const { images } = await req.json();
    if (!images || !Array.isArray(images) || images.length === 0) {
      return new Response(JSON.stringify({ error: "No images provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { token, projectId } = await getVertexAccessToken(saJson);

    // Build Vertex AI parts
    const parts: any[] = [
      {
        text: `You are given ${images.length} product photo(s). For each image, detect the camera view/angle of the product. Assign one of these labels: front, back, left-side, right-side, detail-closeup, top, bottom, 3/4-front, 3/4-back, flat-lay. Consider the product's orientation, visible features (labels, logos = usually front), and camera perspective.`,
      },
    ];

    for (let i = 0; i < images.length; i++) {
      parts.push({ text: `Image ${i + 1}:` });
      parts.push(await toVertexPart(images[i]));
    }

    parts.push({ text: "Now classify each image's view using the tool." });

    const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-flash:generateContent`;

    const aiResponse = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        tools: [{
          functionDeclarations: [{
            name: "return_view_labels",
            description: "Return the detected view/angle label for each product image",
            parameters: {
              type: "object",
              properties: {
                views: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      index: { type: "number", description: "0-based image index" },
                      view: {
                        type: "string",
                        enum: ["front", "back", "left-side", "right-side", "detail-closeup", "top", "bottom", "3/4-front", "3/4-back", "flat-lay"],
                        description: "Detected view label",
                      },
                      confidence: {
                        type: "string",
                        enum: ["high", "medium", "low"],
                        description: "Confidence in the detection",
                      },
                    },
                    required: ["index", "view", "confidence"],
                  },
                },
              },
              required: ["views"],
            },
          }],
        }],
        toolConfig: {
          functionCallingConfig: {
            mode: "ANY",
            allowedFunctionNames: ["return_view_labels"],
          },
        },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("Vertex AI error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "View detection failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const functionCall = aiData.candidates?.[0]?.content?.parts?.find((p: any) => p.functionCall)?.functionCall;

    if (!functionCall) {
      return new Response(JSON.stringify({ error: "No detection result" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = functionCall.args;

    // Build a Record<url, viewLabel>
    const viewMap: Record<string, string> = {};
    for (const item of result.views) {
      if (item.index >= 0 && item.index < images.length) {
        viewMap[images[item.index]] = item.view;
      }
    }

    return new Response(JSON.stringify({ views: viewMap }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("detect-views error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
