import assert from "node:assert/strict";
import test from "node:test";
import { decryptSession, encryptSession } from "../src/lib/session-crypto.mjs";

const secret = "correct-horse-battery-staple-test-secret";

test("session encryption hides payload and round-trips with the secret", () => {
  const payload = JSON.stringify({ exp: 1900000000, role: "moderator" });
  const token = encryptSession(payload, secret);

  assert.equal(token.includes("moderator"), false);
  assert.equal(token.includes("1900000000"), false);
  assert.equal(decryptSession(token, secret), payload);
});

test("session decryption rejects tampering and a different secret", () => {
  const token = encryptSession("private-session-data", secret);
  const [version, iv, tag, ciphertext] = token.split(".");
  const changedCiphertext = `${ciphertext[0] === "A" ? "B" : "A"}${ciphertext.slice(1)}`;
  const tampered = [version, iv, tag, changedCiphertext].join(".");

  assert.equal(decryptSession(tampered, secret), null);
  assert.equal(decryptSession(token, "a-different-secret-with-sufficient-length"), null);
});

test("session decryption rejects malformed and unsupported tokens", () => {
  assert.equal(decryptSession("", secret), null);
  assert.equal(decryptSession("v2.invalid.token", secret), null);
  assert.equal(decryptSession("v1.***.***.***", secret), null);
});
