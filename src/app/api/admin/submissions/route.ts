import { clearAdminSession, hasSameOrigin, isAdminSessionValid, supabaseRequest } from "@/lib/server";

export async function GET() {
  if (!await isAdminSessionValid()) return Response.json({ error: "Moderator session required." }, { status: 401 });
  try {
    const rows = await supabaseRequest(
      "video_submissions?select=id,title,description,media_url,public_id,source_url,tags,status,created_at&status=eq.pending&order=created_at.asc&limit=100",
      {},
      true,
    );
    return Response.json(rows, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Could not load pending submissions." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  if (!hasSameOrigin(request)) return Response.json({ error: "Request origin rejected." }, { status: 403 });
  if (!await isAdminSessionValid()) return Response.json({ error: "Moderator session required." }, { status: 401 });

  let data: Record<string, unknown>;
  try { data = await request.json() as Record<string, unknown>; }
  catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }

  const id = typeof data.id === "string" ? data.id : "";
  const status = data.status;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) || (status !== "approved" && status !== "rejected")) {
    return Response.json({ error: "Invalid review action." }, { status: 400 });
  }

  try {
    const result = await supabaseRequest(
      `video_submissions?id=eq.${encodeURIComponent(id)}&status=eq.pending&select=id`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ status, reviewed_at: new Date().toISOString() }),
      },
      true,
    );
    if (!Array.isArray(result) || result.length !== 1) return Response.json({ error: "This submission was already reviewed." }, { status: 409 });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Could not update the submission." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  if (!hasSameOrigin(request)) return Response.json({ error: "Request origin rejected." }, { status: 403 });
  await clearAdminSession();
  return Response.json({ ok: true });
}
