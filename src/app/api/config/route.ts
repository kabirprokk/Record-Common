import { publicConfig } from "@/lib/server";
import { connection } from "next/server";

export async function GET() {
  await connection();
  return Response.json(await publicConfig(), { headers: { "Cache-Control": "no-store" } });
}
