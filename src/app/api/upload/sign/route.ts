import { randomUUID } from "node:crypto";
import { cloudinaryConfig, cloudinarySignature, consumeRateLimit, createUploadProof, hasSameOrigin } from "@/lib/server";

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
    const { cloudName, apiKey, apiSecret, uploadPreset } = cloudinaryConfig();
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = "open-record/pending";
    const publicId = `${folder}/${randomUUID()}`;
    const params = { folder, overwrite: "false", public_id: publicId, timestamp: String(timestamp), upload_preset: uploadPreset };
    const signature = cloudinarySignature(params, apiSecret);
    return Response.json({
      apiKey,
      timestamp,
      folder,
      publicId,
      uploadPreset,
      signature,
      proof: createUploadProof(publicId),
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Upload protection or video hosting is not configured." }, { status: 503 });
  }
}
