import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const SESSION_COOKIE = "open-record-review";
const SESSION_SECONDS = 60 * 60 * 8;

function env(name: string) {
  return process.env[name]?.trim() ?? "";
}

export function publicConfig() {
  const turnstileSiteKey = env("NEXT_PUBLIC_TURNSTILE_SITE_KEY");
  const contactEmail = env("NEXT_PUBLIC_CONTACT_EMAIL");
  const archiveEnabled = Boolean(env("NEXT_PUBLIC_SUPABASE_URL") && env("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
  const uploadsEnabled = Boolean(
    archiveEnabled &&
    env("SUPABASE_SERVICE_ROLE_KEY") && env("CLOUDINARY_CLOUD_NAME") &&
    env("CLOUDINARY_API_KEY") && env("CLOUDINARY_API_SECRET") && env("CLOUDINARY_UPLOAD_PRESET") &&
    env("TURNSTILE_SECRET_KEY") && turnstileSiteKey && env("ADMIN_PASSWORD") &&
    env("SESSION_SECRET"),
  );
  return { archiveEnabled, uploadsEnabled, turnstileSiteKey: turnstileSiteKey || null, contactEmail: contactEmail || null };
}

export function hasSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function verifyHuman(token: unknown, request: Request) {
  const secret = env("TURNSTILE_SECRET_KEY");
  if (!secret || typeof token !== "string" || token.length < 10 || token.length > 2048) return false;
  const body = new URLSearchParams({ secret, response: token });
  const ip = request.headers.get("cf-connecting-ip");
  if (ip) body.set("remoteip", ip);
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    const result = (await response.json()) as { success?: boolean; hostname?: string };
    const expectedHost = new URL(request.url).hostname;
    return response.ok && result.success === true && (!result.hostname || result.hostname === expectedHost);
  } catch {
    return false;
  }
}

export function supabaseConfig(requireServiceRole = false) {
  const url = env("NEXT_PUBLIC_SUPABASE_URL").replace(/\/$/, "");
  const anonKey = env("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || (requireServiceRole && !serviceKey)) throw new Error("Supabase is not configured.");
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new Error("Supabase URL is invalid."); }
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") throw new Error("Supabase URL must use HTTPS.");
  return { url, anonKey, serviceKey };
}

export async function supabaseRequest(path: string, options: RequestInit = {}, privileged = false) {
  const { url, anonKey, serviceKey } = supabaseConfig(privileged);
  const key = privileged ? serviceKey : anonKey;
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    cache: "no-store",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = null; }
  if (!response.ok) {
    const error = new Error("Database request failed.") as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return body;
}

export function cloudinaryConfig() {
  const cloudName = env("CLOUDINARY_CLOUD_NAME");
  const apiKey = env("CLOUDINARY_API_KEY");
  const apiSecret = env("CLOUDINARY_API_SECRET");
  const uploadPreset = env("CLOUDINARY_UPLOAD_PRESET");
  if (!cloudName || !apiKey || !apiSecret || !uploadPreset || !/^[a-zA-Z0-9_-]{1,64}$/.test(cloudName) || !/^[a-zA-Z0-9_-]{1,80}$/.test(uploadPreset)) {
    throw new Error("Video upload is not configured.");
  }
  return { cloudName, apiKey, apiSecret, uploadPreset };
}

export function cloudinarySignature(params: Record<string, string>, secret: string) {
  const serialized = Object.keys(params).sort().map((key) => `${key}=${params[key]}`).join("&");
  return createHash("sha1").update(`${serialized}${secret}`).digest("hex");
}

export function createUploadProof(publicId: string) {
  const payload = Buffer.from(JSON.stringify({ publicId, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  const signature = createHmac("sha256", sessionSecret()).update(`upload:${payload}`).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyUploadProof(value: unknown, publicId: string) {
  try {
    if (typeof value !== "string" || value.length > 2048) return false;
    const [payload, signature, extra] = value.split(".");
    if (!payload || !signature || extra) return false;
    const expected = Buffer.from(createHmac("sha256", sessionSecret()).update(`upload:${payload}`).digest("base64url"));
    const received = Buffer.from(signature);
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return false;
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { publicId?: string; exp?: number };
    const now = Math.floor(Date.now() / 1000);
    return decoded.publicId === publicId && typeof decoded.exp === "number" && decoded.exp > now && decoded.exp <= now + 3600;
  } catch {
    return false;
  }
}

export async function verifyCloudinaryAsset(publicId: string, expectedUrl: string, expectedBytes: unknown) {
  const { cloudName, apiKey, apiSecret } = cloudinaryConfig();
  if (!/^[a-zA-Z0-9_/-]{1,180}$/.test(publicId) || !publicId.startsWith("open-record/pending/")) return false;
  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/resources/video/upload/${publicId.split("/").map(encodeURIComponent).join("/")}`;
  try {
    const response = await fetch(endpoint, {
      headers: { Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}` },
      cache: "no-store",
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) return false;
    const asset = (await response.json()) as { public_id?: string; secure_url?: string; bytes?: number; resource_type?: string; format?: string };
    if (asset.public_id !== publicId || asset.resource_type !== "video" || typeof asset.bytes !== "number") return false;
    if (asset.bytes <= 0 || asset.bytes > MAX_VIDEO_BYTES || asset.bytes !== expectedBytes) return false;
    if (asset.secure_url !== expectedUrl || !asset.secure_url.startsWith(`https://res.cloudinary.com/${cloudName}/video/upload/`)) return false;
    return ["mp4", "webm", "mov"].includes((asset.format ?? "").toLowerCase());
  } catch {
    return false;
  }
}

function sessionSecret() {
  const secret = env("SESSION_SECRET");
  if (secret.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters.");
  return secret;
}

function signSession(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

export async function createAdminSession() {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = Buffer.from(JSON.stringify({ exp: expires, role: "moderator" })).toString("base64url");
  const jar = await cookies();
  jar.set(SESSION_COOKIE, `${payload}.${signSession(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function isAdminSessionValid() {
  try {
    const jar = await cookies();
    const value = jar.get(SESSION_COOKIE)?.value ?? "";
    const [payload, signature, extra] = value.split(".");
    if (!payload || !signature || extra) return false;
    const expected = Buffer.from(signSession(payload));
    const received = Buffer.from(signature);
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return false;
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: number; role?: string };
    return decoded.role === "moderator" && typeof decoded.exp === "number" && decoded.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function verifyAdminPassword(value: unknown) {
  const expected = env("ADMIN_PASSWORD");
  if (!expected || typeof value !== "string" || value.length > 200) return false;
  const expectedHash = createHash("sha256").update(expected).digest();
  const candidateHash = createHash("sha256").update(value).digest();
  return timingSafeEqual(expectedHash, candidateHash);
}

export async function clearAdminSession() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
}
