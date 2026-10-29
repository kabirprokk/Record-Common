import { isAdminSessionValid } from "@/lib/server";

export async function GET() {
  return Response.json(
    { authenticated: await isAdminSessionValid() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
