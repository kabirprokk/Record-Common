import assert from "node:assert/strict";
import test from "node:test";
import relay from "../workers/upload-relay/worker.mjs";

const env = { ALLOWED_ORIGIN: "https://reccommons.vercel.app", CLOUDINARY_CLOUD_NAME: "test-cloud" };

test("relay streams uploads to fixed Cloudinary origin without forwarding visitor IP headers", async () => {
  const originalFetch = globalThis.fetch;
  let upstreamRequest;
  globalThis.fetch = async (url, init) => {
    upstreamRequest = { url, init };
    return new Response(JSON.stringify({ secure_url: "https://res.cloudinary.com/test-cloud/video/upload/a.mp4" }), {
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const response = await relay.fetch(new Request("https://relay.example/upload", {
      method: "POST",
      headers: {
        Origin: env.ALLOWED_ORIGIN,
        "Content-Type": "multipart/form-data; boundary=test",
        "Content-Range": "bytes 0-5/6",
        "X-Unique-Upload-Id": "upload-test",
        "X-Forwarded-For": "203.0.113.9",
      },
      body: "--test--",
    }), env);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), env.ALLOWED_ORIGIN);
    assert.equal(upstreamRequest.url, "https://api.cloudinary.com/v1_1/test-cloud/video/upload");
    assert.equal(upstreamRequest.init.headers.get("X-Forwarded-For"), null);
    assert.equal(upstreamRequest.init.headers.get("Content-Range"), "bytes 0-5/6");
    assert.equal(upstreamRequest.init.headers.get("X-Unique-Upload-Id"), "upload-test");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("relay rejects other origins and non-upload paths", async () => {
  const rejectedOrigin = await relay.fetch(new Request("https://relay.example/upload", {
    method: "POST", headers: { Origin: "https://attacker.example" }, body: "x",
  }), env);
  const wrongPath = await relay.fetch(new Request("https://relay.example/anything", {
    method: "POST", headers: { Origin: env.ALLOWED_ORIGIN }, body: "x",
  }), env);

  assert.equal(rejectedOrigin.status, 403);
  assert.equal(wrongPath.status, 404);
});

test("relay enforces a bounded chunk size", async () => {
  const response = await relay.fetch(new Request("https://relay.example/upload", {
    method: "POST",
    headers: {
      Origin: env.ALLOWED_ORIGIN,
      "Content-Type": "multipart/form-data; boundary=test",
      "Content-Length": String(8 * 1024 * 1024),
    },
    body: "x",
  }), env);

  assert.equal(response.status, 413);
});
