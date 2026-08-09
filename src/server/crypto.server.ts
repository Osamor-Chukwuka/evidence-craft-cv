import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function key(): Buffer {
  const raw = process.env["GITHUB_TOKEN_ENC_KEY"];
  if (!raw) throw new Error("GITHUB_TOKEN_ENC_KEY is not configured");
  return createHash("sha256").update(raw).digest();
}

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64");
}

export function decryptToken(stored: string): string {
  const buf = Buffer.from(stored, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

export function signState(userId: string): string {
  const payload = `${userId}.${randomBytes(8).toString("hex")}.${Date.now()}`;
  const mac = createHash("sha256").update(`${payload}${process.env["GITHUB_TOKEN_ENC_KEY"]}`).digest("hex");
  return `${Buffer.from(payload).toString("base64url")}.${mac}`;
}

export function verifyState(state: string): string {
  const [encoded, mac] = state.split(".");
  if (!encoded || !mac) throw new Error("Invalid OAuth state");
  const payload = Buffer.from(encoded, "base64url").toString("utf8");
  const expected = createHash("sha256").update(`${payload}${process.env["GITHUB_TOKEN_ENC_KEY"]}`).digest("hex");
  if (expected !== mac) throw new Error("Invalid OAuth state");
  const [userId, , issued] = payload.split(".");
  if (!userId || !issued || Date.now() - Number(issued) > 15 * 60 * 1000) {
    throw new Error("Expired OAuth state");
  }
  return userId;
}
