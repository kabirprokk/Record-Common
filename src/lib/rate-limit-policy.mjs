const POLICIES = Object.freeze({
  "upload-sign-burst": Object.freeze({ limit: 5, windowSeconds: 15 * 60 }),
  "upload-sign-daily": Object.freeze({ limit: 10, windowSeconds: 24 * 60 * 60 }),
  submission: Object.freeze({ limit: 5, windowSeconds: 60 * 60 }),
  "admin-login": Object.freeze({ limit: 5, windowSeconds: 15 * 60 }),
});

/** @param {string} name @returns {{limit: number, windowSeconds: number}} */
export function rateLimitPolicy(name) {
  if (!Object.hasOwn(POLICIES, name)) throw new Error("Unknown rate-limit policy.");
  return POLICIES[name];
}
