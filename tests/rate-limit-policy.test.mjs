import assert from "node:assert/strict";
import test from "node:test";
import { rateLimitPolicy } from "../src/lib/rate-limit-policy.mjs";

test("anonymous upload signing has burst and daily limits", () => {
  assert.deepEqual(rateLimitPolicy("upload-sign-burst"), { limit: 5, windowSeconds: 900 });
  assert.deepEqual(rateLimitPolicy("upload-sign-daily"), { limit: 10, windowSeconds: 86400 });
});

test("submissions and moderator login have independent limits", () => {
  assert.deepEqual(rateLimitPolicy("submission"), { limit: 5, windowSeconds: 3600 });
  assert.deepEqual(rateLimitPolicy("admin-login"), { limit: 5, windowSeconds: 900 });
});

test("unknown policy names fail closed", () => {
  assert.throws(() => rateLimitPolicy("unknown"), /Unknown rate-limit policy/);
});
