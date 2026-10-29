import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const VERSION = "v1";

function keyFromSecret(secret) {
  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error("Session secret must contain at least 32 characters.");
  }
  return createHash("sha256").update("record-commons:admin-session:v1:").update(secret).digest();
}

/** @param {string} plaintext @param {string} secret */
export function encryptSession(plaintext, secret) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFromSecret(secret), iv);
  cipher.setAAD(Buffer.from(VERSION));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

/** @param {unknown} token @param {string} secret */
export function decryptSession(token, secret) {
  try {
    if (typeof token !== "string" || token.length > 4096) return null;
    const [version, encodedIv, encodedTag, encodedCiphertext, extra] = token.split(".");
    if (version !== VERSION || !encodedIv || !encodedTag || !encodedCiphertext || extra) return null;
    if (![encodedIv, encodedTag, encodedCiphertext].every((part) => /^[A-Za-z0-9_-]+$/.test(part))) return null;
    const iv = Buffer.from(encodedIv, "base64url");
    const tag = Buffer.from(encodedTag, "base64url");
    const ciphertext = Buffer.from(encodedCiphertext, "base64url");
    if (iv.length !== 12 || tag.length !== 16 || ciphertext.length === 0) return null;
    const decipher = createDecipheriv("aes-256-gcm", keyFromSecret(secret), iv);
    decipher.setAAD(Buffer.from(VERSION));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
