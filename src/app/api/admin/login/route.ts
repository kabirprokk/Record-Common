import { consumeRateLimit, createAdminSession, hasSameOrigin, verifyAdminPassword } from "@/lib/server";

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return Response.json({ error: "Request origin rejected." }, { status: 403 });
  try {
    const limit = await consumeRateLimit("admin-login", request);
    if (!limit.allowed) return Response.json(
      { error: "Too many sign-in attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  } catch {
    return Response.json({ error: "Sign-in protection is temporarily unavailable." }, { status: 503 });
  }

  let data: Record<string, unknown>;
  try { data = await request.json() as Record<string, unknown>; }
  catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }

  const password = verifyAdminPassword(data.password);
  if (!password) return Response.json({ error: "Sign-in failed. Check the password." }, { status: 401 });

  try {
    await createAdminSession();
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Moderator access is not configured." }, { status: 503 });
  }
}
