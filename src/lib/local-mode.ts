/** Fixed id of the local-only owner profile (a profiles row; it has no auth account or password). */
export const LOCAL_OWNER_ID = "00000000-0000-4000-8000-000000000001";

/**
 * Local owner mode skips the login so the owner can test on their own computer.
 * It is impossible to enable in production: it needs NODE_ENV to be non-production,
 * LOCAL_OWNER_MODE=true, and no VERCEL environment.
 */
export function isLocalOwnerMode(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.LOCAL_OWNER_MODE === "true" && !process.env.VERCEL;
}
