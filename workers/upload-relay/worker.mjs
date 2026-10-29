const MAX_CHUNK_BYTES = 7 * 1024 * 1024;

function cors(origin, allowedOrigin) {
  return origin === allowedOrigin
    ? { "Access-Control-Allow-Origin": allowedOrigin, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Content-Range, X-Unique-Upload-Id", "Access-Control-Max-Age": "600", Vary: "Origin" }
    : null;
}

function limitBody(stream) {
  const reader = stream.getReader();
  let bytesRead = 0;
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await reader.read();
      if (done) return controller.close();
      bytesRead += value.byteLength;
      if (bytesRead > MAX_CHUNK_BYTES) {
        await reader.cancel();
        return controller.error(new Error("Chunk exceeds relay limit"));
      }
      controller.enqueue(value);
    },
    async cancel(reason) { await reader.cancel(reason); },
  });
}

const relay = {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") ?? "";
    const corsHeaders = cors(origin, env.ALLOWED_ORIGIN);
    if (!corsHeaders) return new Response("Origin rejected", { status: 403 });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (request.method !== "POST" || new URL(request.url).pathname !== "/upload") {
      return new Response("Not found", { status: 404, headers: corsHeaders });
    }

    const contentType = request.headers.get("Content-Type") ?? "";
    if (!contentType.toLowerCase().startsWith("multipart/form-data;")) {
      return new Response("Multipart upload required", { status: 415, headers: corsHeaders });
    }
    const contentLength = Number(request.headers.get("Content-Length") ?? 0);
    if (contentLength > MAX_CHUNK_BYTES) return new Response("Chunk too large", { status: 413, headers: corsHeaders });
    if (!request.body) return new Response("Empty upload", { status: 400, headers: corsHeaders });
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(env.CLOUDINARY_CLOUD_NAME ?? "")) {
      return new Response("Relay is not configured", { status: 503, headers: corsHeaders });
    }

    const headers = new Headers({ "Content-Type": contentType });
    for (const name of ["Content-Range", "X-Unique-Upload-Id"]) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    try {
      const upstream = await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/video/upload`, {
        method: "POST",
        headers,
        body: limitBody(request.body),
      });
      const responseHeaders = new Headers(corsHeaders);
      responseHeaders.set("Content-Type", upstream.headers.get("Content-Type") ?? "application/json");
      responseHeaders.set("Cache-Control", "no-store");
      return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
    } catch {
      return new Response(JSON.stringify({ error: { message: "Upload relay could not reach the video host." } }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }
  },
};

export default relay;
