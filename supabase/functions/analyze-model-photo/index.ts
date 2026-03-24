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

    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "Missing imageBase64" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { token, projectId } = await getVertexAccessToken(saJson);
    const imagePart = await toVertexPart(imageBase64);

    const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-flash:generateContent`;

    const aiResponse = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            imagePart,
            {
              text: `Analyze this photo of a person in extreme detail for identity-locked AI image generation. You must capture enough detail that another AI could reproduce this EXACT person — not a lookalike.

Focus on:
1. FACE: exact face shape (oval/round/square/heart/oblong/diamond), eye shape & set (deep-set/wide-set/close-set, almond/round/hooded/monolid), eye color, nose shape (button/aquiline/straight/broad/narrow bridge), lip shape (full/thin/bow-shaped/wide), jawline (sharp/rounded/square/pointed), cheekbone prominence, eyebrow shape (arched/straight/thick/thin), forehead height
2. HAIR: color, texture (straight/wavy/curly/coily/kinky), length, style, parting, volume
3. SKIN: exact tone description, any notable marks/freckles/dimples
4. BODY: frame/build, shoulder width relative to frame, approximate proportions visible
5. AGE: precise estimated range
6. VISIBILITY: what is visible in this photo — face-only, head-shoulders, waist-up, or full-body

Generate a compact "identity lock summary" — a single paragraph (80-120 words) that an image generator can use as a text anchor to reproduce this exact person. Be specific, not generic.

Call the extract_model_attributes function with all detected values.`,
            },
          ],
        }],
        tools: [{
          functionDeclarations: [{
            name: "extract_model_attributes",
            description: "Extract detailed physical attributes and identity profile of a person from a photo.",
            parameters: {
              type: "object",
              properties: {
                gender: { type: "string", enum: ["female", "male"] },
                ethnicity: { type: "string" },
                bodyType: { type: "string", enum: ["slim", "athletic", "average", "curvy", "plus size"] },
                skinTone: { type: "string" },
                ageRange: { type: "string" },
                facialFeatures: { type: "string" },
                suggestedName: { type: "string" },
                identityProfile: {
                  type: "object",
                  properties: {
                    faceShape: { type: "string" }, eyeShape: { type: "string" }, eyeColor: { type: "string" },
                    noseShape: { type: "string" }, lipShape: { type: "string" }, jawline: { type: "string" },
                    cheekbones: { type: "string" }, eyebrowShape: { type: "string" }, foreheadHeight: { type: "string" },
                    hairColor: { type: "string" }, hairTexture: { type: "string" }, hairLength: { type: "string" },
                    hairStyle: { type: "string" }, shoulderFrame: { type: "string" }, distinguishingMarks: { type: "string" },
                  },
                },
                bodyVisibility: { type: "string", enum: ["face-only", "head-shoulders", "waist-up", "full-body"] },
                identityLockSummary: { type: "string", description: "80-120 word paragraph for identity reproduction" },
              },
              required: ["gender", "ethnicity", "bodyType", "skinTone", "ageRange", "facialFeatures", "suggestedName", "identityProfile", "bodyVisibility", "identityLockSummary"],
            },
          }],
        }],
        toolConfig: {
          functionCallingConfig: { mode: "ANY", allowedFunctionNames: ["extract_model_attributes"] },
        },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("Vertex AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const functionCall = aiData.candidates?.[0]?.content?.parts?.find((p: any) => p.functionCall)?.functionCall;

    if (!functionCall?.args) {
      console.error("No function call in response:", JSON.stringify(aiData).substring(0, 500));
      return new Response(JSON.stringify({ error: "AI could not analyze the photo" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(functionCall.args), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-model-photo error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
