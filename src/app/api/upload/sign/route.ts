import { randomUUID } from "node:crypto";
import { cloudinaryConfig, cloudinarySignature, configuredUploadRelayUrl, consumeRateLimit, createUploadProof, hasSameOrigin } from "@/lib/server";

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return Response.json({ error: "Request origin rejected." }, { status: 403 });

  let data: Record<string, unknown>;
  try { data = await request.json() as Record<string, unknown>; }
  catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }

  if (typeof data.website === "string" && data.website.length > 0) return Response.json({ ok: true });

  try {
    for (const policy of ["upload-sign-burst", "upload-sign-daily"] as const) {
      const limit = await consumeRateLimit(policy, request);
      if (!limit.allowed) return Response.json(
        { error: "Upload limit reached. Try again later." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }
    const { apiKey, apiSecret, uploadPreset } = cloudinaryConfig();
    const relayUrl = configuredUploadRelayUrl();
    if (!relayUrl) throw new Error("Upload relay is required.");
    const uploadUrl = relayUrl;
    const timestamp = Math.floor(Date.now() / 1000);
    // Keep the folder path inside public_id only. Sending both `folder` and a
    // path-prefixed public_id makes Cloudinary prepend the path again in legacy
    // folder mode, so its returned public_id no longer matches the signed proof.
    const publicId = `open-record/pending/${randomUUID()}`;
    const transformation = "fl_force_strip";
    const params = { overwrite: "false", public_id: publicId, timestamp: String(timestamp), upload_preset: uploadPreset, transformation };
    const signature = cloudinarySignature(params, apiSecret);
    return Response.json({
      apiKey,
      timestamp,
      publicId,
      uploadPreset,
      transformation,
      signature,
      proof: createUploadProof(publicId),
      uploadUrl,
      uploadRelayEnabled: Boolean(relayUrl),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Upload protection or video hosting is not configured." }, { status: 503 });
  }
}
