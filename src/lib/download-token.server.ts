// Server-only signed token for time-limited download links.
// HMAC-SHA256 over `${manualId}.${userId}.${exp}` using SUPABASE_SERVICE_ROLE_KEY as secret.
import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET_ENV = "SUPABASE_SERVICE_ROLE_KEY";
const TTL_SECONDS = 60 * 10; // 10 minutes

function secret(): string {
  const s = process.env[SECRET_ENV];
  if (!s) throw new Error(`${SECRET_ENV} is not set`);
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function issueDownloadToken(manualId: string, userId: string): { token: string; expiresAt: number } {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const payload = `${manualId}.${userId}.${exp}`;
  const sig = sign(payload);
  return { token: `${exp}.${Buffer.from(userId).toString("base64url")}.${sig}`, expiresAt: exp };
}

export function verifyDownloadToken(manualId: string, token: string): { userId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [expStr, userIdB64, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
  const userId = Buffer.from(userIdB64, "base64url").toString("utf8");
  const expected = sign(`${manualId}.${userId}.${exp}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { userId };
}
