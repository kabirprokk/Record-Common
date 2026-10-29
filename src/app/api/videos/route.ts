import { cloudinaryConfig, consumeRateLimit, hasSameOrigin, supabaseRequest, verifyCloudinaryAsset, verifyUploadProof } from "@/lib/server";

const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const TITLE_MAX = 120;
const DESCRIPTION_MAX = 1200;

function validOptionalHttpsUrl(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  if (typeof value !== "string" || value.length > 500) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : false;
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const rows = await supabaseRequest(
      "video_submissions?select=id,title,description,media_url,source_url,tags,created_at&status=eq.approved&order=created_at.desc&limit=100",
    );
    return Response.json(rows, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "The archive is not configured or is temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return Response.json({ error: "Request origin rejected." }, { status: 403 });

  let data: Record<string, unknown>;
  try { data = await request.json() as Record<string, unknown>; }
  catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }

  if (typeof data.website === "string" && data.website.length > 0) return Response.json({ ok: true });

  try {
    const limit = await consumeRateLimit("submission", request);
    if (!limit.allowed) return Response.json(
      { error: "Submission limit reached. Try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  } catch {
    return Response.json({ error: "Submission protection is temporarily unavailable." }, { status: 503 });
  }

  const title = typeof data.title === "string" ? data.title.trim() : "";
  const description = typeof data.description === "string" ? data.description.trim() : "";
  const sourceUrl = validOptionalHttpsUrl(data.sourceUrl);
  const publicId = typeof data.publicId === "string" ? data.publicId : "";
  const mediaUrl = typeof data.mediaUrl === "string" ? data.mediaUrl : "";
  const bytes = data.bytes;
  const tags = Array.isArray(data.tags)
    ? data.tags.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim().slice(0, 40)).filter(Boolean).slice(0, 8)
    : [];

  if (title.length < 3 || title.length > TITLE_MAX || description.length < 10 || description.length > DESCRIPTION_MAX) {
    return Response.json({ error: "Add a title (3–120 characters) and context (10–1,200 characters)." }, { status: 400 });
  }
  if (data.rightsConfirmed !== true) return Response.json({ error: "Confirm that you have the right to submit this video." }, { status: 400 });
  if (sourceUrl === false || !Number.isInteger(bytes) || Number(bytes) < 1 || Number(bytes) > MAX_VIDEO_BYTES) {
    return Response.json({ error: "The source link or video size is invalid." }, { status: 400 });
  }
  if (!verifyUploadProof(data.proof, publicId)) return Response.json({ error: "Upload authorization expired. Start the upload again." }, { status: 400 });
  try { cloudinaryConfig(); }
  catch { return Response.json({ error: "Video hosting is not configured." }, { status: 503 }); }

  const verified = await verifyCloudinaryAsset(publicId, mediaUrl, bytes);
  if (!verified) return Response.json({ error: "The uploaded video could not be verified. Try uploading it again." }, { status: 400 });

  try {
    await supabaseRequest("video_submissions", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        title,
        description,
        media_url: mediaUrl,
        public_id: publicId,
        source_url: sourceUrl,
        tags,
        status: "pending",
        rights_confirmed: true,
      }),
    }, true);
    return Response.json({ ok: true }, { status: 201 });
  } catch {
    return Response.json({ error: "The database could not save your submission. Contact the archive owner." }, { status: 503 });
  }
}
