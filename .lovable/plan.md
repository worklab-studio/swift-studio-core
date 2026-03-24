

# Migrate All AI Calls from Lovable Gateway to Google Vertex AI

## Summary
Replace every `ai.gateway.lovable.dev` call across 12 edge functions with direct Google Vertex AI API calls using the existing `GOOGLE_SERVICE_ACCOUNT_KEY`. This eliminates all Lovable AI billing.

## Scope — 12 functions to migrate

**Text/Analysis functions** (tool calling / structured output):
1. `analyze-product` — gemini-2.5-flash, tool calling
2. `analyze-style-reference` — gemini-2.5-flash, tool calling
3. `analyze-model-photo` — gemini-2.5-flash, tool calling
4. `detect-views` — gemini-2.5-flash, tool calling
5. `generate-scene-templates` — gemini-2.5-flash, tool calling
6. `generate-video-prompts` — gemini-2.5-flash, tool calling
7. `generate-shots` (describeProduct helper) — gemini-2.5-flash, text completion

**Image generation/editing functions** (multimodal image output):
8. `generate-shots` (main generation) — image generation
9. `edit-shot` — image editing
10. `generate-model-portraits` — image generation
11. `generate-preset-images` — image generation
12. `generate-support-refs` — image generation
13. `remove-background` — image editing

## Key Changes Per Function

### Auth — replace `LOVABLE_API_KEY` with service account JWT
Every function already has `GOOGLE_SERVICE_ACCOUNT_KEY` available. Functions like `generate-shots`, `edit-shot`, and `generate-video` already have the `getVertexAccessToken()` helper. The same pattern will be added to the remaining 9 functions.

### API endpoint change
```
OLD: https://ai.gateway.lovable.dev/v1/chat/completions
NEW: https://us-central1-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/us-central1/publishers/google/models/{MODEL}:generateContent
```

### Request format — OpenAI → Vertex AI

**Text with tool calling:**
```typescript
// OLD (OpenAI format)
{ model: "...", messages: [...], tools: [...], tool_choice: {...} }

// NEW (Vertex AI format)
{
  contents: [{ role: "user", parts: [{ text: "..." }, { inlineData: { mimeType: "image/jpeg", data: "..." } }] }],
  systemInstruction: { parts: [{ text: "..." }] },
  tools: [{ functionDeclarations: [{ name: "...", parameters: {...} }] }],
  toolConfig: { functionCallingConfig: { mode: "ANY", allowedFunctionNames: ["..."] } }
}
```

**Image generation:**
```typescript
// OLD
{ model: "...", messages: [...], modalities: ["image", "text"] }

// NEW
{
  contents: [{ role: "user", parts: [{ text: "..." }, { inlineData: {...} }] }],
  generationConfig: { responseModalities: ["TEXT", "IMAGE"] }
}
```

### Response parsing — OpenAI → Vertex AI

**Tool calling:**
```typescript
// OLD
aiData.choices[0].message.tool_calls[0].function.arguments → JSON.parse

// NEW
aiData.candidates[0].content.parts.find(p => p.functionCall)?.functionCall.args → already an object
```

**Image output:**
```typescript
// OLD
aiData.choices[0].message.images[0].image_url.url → "data:image/png;base64,..."

// NEW
aiData.candidates[0].content.parts.find(p => p.inlineData)?.inlineData → { mimeType, data (base64) }
```

### Model mapping
| Lovable Gateway Model | Vertex AI Model ID |
|---|---|
| `google/gemini-3-flash-preview` | `gemini-2.5-flash` |
| `google/gemini-2.5-flash` | `gemini-2.5-flash` |
| `google/gemini-3.1-flash-image-preview` | `gemini-2.0-flash-exp` |

### Image URL handling
The Lovable gateway accepts `image_url.url` with both HTTPS URLs and base64 data URIs. Vertex AI uses `inlineData` with raw base64 (no `data:...` prefix) or `fileData` with GCS URIs. For HTTPS image URLs, the function will need to **fetch the image and convert to base64** before sending to Vertex AI, or use `fileData` with the URL. Vertex AI also supports passing image URLs directly in `fileData.fileUri` for publicly accessible URLs.

### Error handling
Replace 402/429 Lovable-specific error codes with Vertex AI equivalents (429 rate limit, 403 quota exceeded).

## Files Modified
All 12 edge function files listed above. Each gets:
1. `getVertexAccessToken()` helper (if not already present)
2. New request builder converting OpenAI format → Vertex AI format
3. New response parser for Vertex AI format
4. Removal of all `LOVABLE_API_KEY` references

## Risk Mitigation
- The `generate-video` function already works with Vertex AI using the same auth pattern — proven approach
- `generate-shots` and `edit-shot` already have the auth helpers for the upscale step — just need to use them for the main generation call too
- Will add proper error logging for Vertex AI responses to debug any format issues

