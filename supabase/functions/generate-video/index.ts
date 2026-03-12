import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Vertex AI (Veo) JWT auth helpers ───

function base64url(data: Uint8Array): string {
  let binary = "";
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN .*-----/, "")
    .replace(/-----END .*-----/, "")
    .replace(/\s/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function getVertexAccessToken(serviceAccountJson: string): Promise<{ token: string; projectId: string }> {
  // Defensive parsing: handle double-encoded or quote-wrapped JSON
  let cleaned = serviceAccountJson.trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    try {
      cleaned = JSON.parse(cleaned); // unwrap double-encoded string
    } catch (_) {
      // If unwrapping fails, try as-is
    }
  }
  let sa: Record<string, string>;
  try {
    sa = JSON.parse(cleaned);
  } catch (e) {
    console.error("[Veo] Failed to parse service account JSON. First 20 chars:", cleaned.substring(0, 20));
    throw new Error("Invalid GOOGLE_SERVICE_ACCOUNT_KEY format — please re-enter the service account JSON");
  }
  const now = Math.floor(Date.now() / 1000);

  const header = base64url(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const payload = base64url(
    new TextEncoder().encode(
      JSON.stringify({
        iss: sa.client_email,
        sub: sa.client_email,
        aud: "https://oauth2.googleapis.com/token",
        scope: "https://www.googleapis.com/auth/cloud-platform",
        iat: now,
        exp: now + 3600,
      })
    )
  );

  const signingInput = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = base64url(
    new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(signingInput)))
  );

  const jwt = `${signingInput}.${signature}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Google OAuth failed: ${err}`);
  }
  const { access_token } = await tokenRes.json();
  return { token: access_token, projectId: sa.project_id };
}

// ─── Veo 3.1 (Vertex AI) ───

async function generateWithVeo(
  imageUrl: string,
  prompt: string,
  duration: number,
  aspectRatio: string,
  resolution: string
): Promise<string> {
  const saJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
  if (!saJson) throw new Error("Google service account not configured");

  const { token, projectId } = await getVertexAccessToken(saJson);

  // Fetch the image and convert to base64
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error("Failed to fetch source image");
  const imgBytes = new Uint8Array(await imgRes.arrayBuffer());
  let binary = "";
  for (const byte of imgBytes) binary += String.fromCharCode(byte);
  const imgBase64 = btoa(binary);

  const contentType = imgRes.headers.get("content-type") || "image/jpeg";
  const mimeType = contentType.includes("png") ? "image/png" : "image/jpeg";

  // Map aspect ratio from UI format (e.g. "9:16") to Veo format
  const veoAspectRatio = aspectRatio || "9:16";
  const veoDuration = Math.min(duration, 8); // Veo max 8s
  const veoResolution = resolution === "1080p" ? "1080p" : "720p";
  const modelId = "veo-3.1-generate-001";

  const body = {
    instances: [
      {
        prompt: prompt || "Product showcase video with smooth motion",
        referenceImages: [
          {
            image: {
              bytesBase64Encoded: imgBase64,
              mimeType,
            },
            referenceType: "asset",
          },
        ],
      },
    ],
    parameters: {
      aspectRatio: veoAspectRatio,
      durationSeconds: veoDuration,
      resolution: veoResolution,
      sampleCount: 1,
    },
  };

  const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/${modelId}:predictLongRunning`;

  console.log(`[Veo] Submitting to ${endpoint}`);
  const submitRes = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text();
    console.error("[Veo] Submit error:", submitRes.status, errText);
    throw new Error(`Veo submission failed (${submitRes.status}): ${errText}`);
  }

  const operation = await submitRes.json();
  const operationName = operation.name;
  if (!operationName) throw new Error("No operation name returned from Veo");

  console.log(`[Veo] Operation: ${operationName}`);

  // Poll using the full operation name — do NOT strip the publisher/model path
  const pollUrl = `https://us-central1-aiplatform.googleapis.com/v1/${operationName}`;
  console.log(`[Veo] Poll URL: ${pollUrl}`);

  const maxAttempts = 24; // ~2 minutes at 5s intervals (stay within edge function limits)
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 5000));

    const pollRes = await fetch(pollUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!pollRes.ok) {
      console.error("[Veo] Poll error:", pollRes.status);
      continue;
    }

    const pollData = await pollRes.json();
    if (pollData.done) {
      if (pollData.error) {
        throw new Error(`Veo failed: ${JSON.stringify(pollData.error)}`);
      }
      const videos =
        pollData.response?.generateVideoResponse?.generatedSamples ||
        pollData.response?.predictions;
      if (!videos || videos.length === 0) {
        throw new Error("Veo returned no videos");
      }
      const videoUri = videos[0]?.video?.gcsUri || videos[0]?.video?.uri;
      if (!videoUri) {
        throw new Error("Veo returned no video URI");
      }
      console.log(`[Veo] Video ready: ${videoUri}`);
      return videoUri;
    }
    console.log(`[Veo] Polling... attempt ${i + 1}/${maxAttempts}`);
  }

  throw new Error("Veo generation timed out after 2 minutes");
}

// ─── Runway ML ───

async function generateWithRunway(
  imageUrl: string,
  prompt: string,
  duration: number,
  aspectRatio: string
): Promise<string> {
  const apiKey = Deno.env.get("RUNWAY_API_KEY");
  if (!apiKey) throw new Error("Runway API key not configured");

  // Map aspect ratio to Runway's resolution format
  const ratioMap: Record<string, string> = {
    "9:16": "720:1280",
    "16:9": "1280:720",
    "1:1": "960:960",
    "4:3": "1104:832",
    "3:4": "832:1104",
  };
  const ratio = ratioMap[aspectRatio] || "720:1280";
  const runwayDuration = Math.max(2, Math.min(duration, 10));

  const body = {
    model: "gen4_turbo",
    promptImage: [
      {
        uri: imageUrl,
        position: "first",
      },
    ],
    promptText: prompt || "Smooth product showcase video with natural motion",
    ratio,
    duration: runwayDuration,
  };

  console.log("[Runway] Submitting task...");
  const submitRes = await fetch("https://api.dev.runwayml.com/v1/image_to_video", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Runway-Version": "2024-11-06",
    },
    body: JSON.stringify(body),
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text();
    console.error("[Runway] Submit error:", submitRes.status, errText);
    if (submitRes.status === 429) throw new Error("Runway rate limit exceeded");
    if (submitRes.status === 401) throw new Error("Invalid Runway API key");
    throw new Error(`Runway submission failed (${submitRes.status}): ${errText}`);
  }

  const task = await submitRes.json();
  const taskId = task.id;
  if (!taskId) throw new Error("No task ID returned from Runway");

  console.log(`[Runway] Task ID: ${taskId}`);

  // Poll for completion
  const maxAttempts = 36; // ~3 minutes at 5s intervals
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 5000));

    const pollRes = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Runway-Version": "2024-11-06",
      },
    });

    if (!pollRes.ok) {
      console.error("[Runway] Poll error:", pollRes.status);
      continue;
    }

    const pollData = await pollRes.json();
    console.log(`[Runway] Status: ${pollData.status} (attempt ${i + 1}/${maxAttempts})`);

    if (pollData.status === "SUCCEEDED") {
      const videoUrl = pollData.output?.[0];
      if (!videoUrl) throw new Error("Runway returned no video URL");
      console.log(`[Runway] Video ready: ${videoUrl}`);
      return videoUrl;
    }

    if (pollData.status === "FAILED") {
      throw new Error(`Runway generation failed: ${pollData.failure || "Unknown error"}`);
    }
  }

  throw new Error("Runway generation timed out after 3 minutes");
}

// ─── Download video and upload to Supabase storage ───

async function uploadVideoToStorage(
  supabase: ReturnType<typeof createClient>,
  videoUrl: string,
  projectId: string
): Promise<string> {
  console.log(`[Storage] Downloading video from: ${videoUrl}`);

  // Handle GCS URIs by converting to public URL (for Veo)
  let fetchUrl = videoUrl;
  if (videoUrl.startsWith("gs://")) {
    // GCS URI → needs to be downloaded via GCS JSON API
    const bucket = videoUrl.replace("gs://", "").split("/")[0];
    const path = videoUrl.replace(`gs://${bucket}/`, "");
    fetchUrl = `https://storage.googleapis.com/${bucket}/${path}`;
  }

  const videoRes = await fetch(fetchUrl);
  if (!videoRes.ok) throw new Error(`Failed to download video: ${videoRes.status}`);

  const videoBytes = new Uint8Array(await videoRes.arrayBuffer());
  const filePath = `${projectId}/video-${Date.now()}.mp4`;

  const { error: uploadErr } = await supabase.storage
    .from("originals")
    .upload(filePath, videoBytes, {
      contentType: "video/mp4",
      upsert: true,
    });

  if (uploadErr) {
    console.error("[Storage] Upload error:", uploadErr);
    throw new Error("Failed to upload video to storage");
  }

  const { data: publicUrlData } = supabase.storage
    .from("originals")
    .getPublicUrl(filePath);

  console.log(`[Storage] Uploaded: ${publicUrlData.publicUrl}`);
  return publicUrlData.publicUrl;
}

// ─── Main handler ───

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

    // ─── Generate video with the selected engine ───
    let videoUrl: string;

    try {
      if (engine === "veo") {
        const rawUrl = await generateWithVeo(
          baseAsset.url,
          prompt || `Product showcase video, ${duration}s, smooth motion`,
          duration,
          videoAspectRatio,
          resolution
        );
        // Upload to our storage
        videoUrl = await uploadVideoToStorage(supabase, rawUrl, projectId);
      } else if (engine === "runway") {
        const rawUrl = await generateWithRunway(
          baseAsset.url,
          prompt || `Product showcase video, ${duration}s, smooth motion`,
          duration,
          videoAspectRatio
        );
        // Upload to our storage
        videoUrl = await uploadVideoToStorage(supabase, rawUrl, projectId);
      } else {
        return new Response(
          JSON.stringify({ error: `Unsupported engine: ${engine}. Use "veo" or "runway".` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    } catch (genError) {
      console.error(`[${engine}] Generation failed:`, genError);
      // Do NOT deduct credits on failure
      return new Response(
        JSON.stringify({
          error: genError instanceof Error ? genError.message : "Video generation failed",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

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

    // Deduct credits only on success
    await supabase
      .from("profiles")
      .update({
        credits_remaining: profile.credits_remaining - creditCost,
      })
      .eq("user_id", user.id);

    // Log credit transaction
    await supabase.from("credit_transactions").insert({
      user_id: user.id,
      amount: -creditCost,
      description: "Generated video",
      transaction_type: "debit",
    });

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
    console.error("[generate-video] Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
