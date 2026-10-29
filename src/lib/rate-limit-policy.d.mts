export type RateLimitPolicyName =
  | "upload-sign-burst"
  | "upload-sign-daily"
  | "submission"
  | "admin-login";

export type RateLimitPolicy = { limit: number; windowSeconds: number };

export function rateLimitPolicy(name: string): RateLimitPolicy;
