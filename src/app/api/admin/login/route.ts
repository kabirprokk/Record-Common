import { createAdminSession, hasSameOrigin, verifyAdminPassword, verifyHuman } from "@/lib/server";

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return Response.json({ error: "Request origin rejected." }, { status: 403 });
  let data: Record<string, unknown>;
  try { data = await request.json() as Record<string, unknown>; }
  catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }

  const human = await verifyHuman(data.token, request);
  const password = verifyAdminPassword(data.password);
  if (!human || !password) return Response.json({ error: "Sign-in failed. Check the password and spam-prevention check." }, { status: 401 });

  try {
    await createAdminSession();
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Moderator access is not configured." }, { status: 503 });
  }
}
