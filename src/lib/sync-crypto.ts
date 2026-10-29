/** Encrypted sync helpers. No secrets leave the device unencrypted. */

const CODE_BYTES = 32;
const IV_BYTES = 12;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array | null {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    const binary = atob(padded);
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

/** A 256-bit capability code. It is the only thing needed on another device. */
export function newSyncCode(): string {
  const bytes = new Uint8Array(CODE_BYTES);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

/** Canonical form of a pasted code, or null if it is not a 256-bit code. */
export function normalizeSyncCode(raw: string): string | null {
  const value = raw.trim().replace(/\s+/g, "");
  if (!value) return null;
  const bytes = fromBase64Url(value);
  return bytes && bytes.length === CODE_BYTES ? toBase64Url(bytes) : null;
}

/** Firestore document ID derived from the sync code; not reversible without the code. */
export async function syncDocId(code: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode("dojo-doc:" + code));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function syncKey(code: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode("dojo-data:" + code));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export interface EncryptedState {
  iv: string;
  ciphertext: string;
}

export async function encryptState(json: string, code: string): Promise<EncryptedState> {
  const iv = new Uint8Array(IV_BYTES);
  crypto.getRandomValues(iv);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await syncKey(code),
    encoder.encode(json)
  );
  return { iv: toBase64Url(iv), ciphertext: toBase64Url(new Uint8Array(ciphertext)) };
}

export async function decryptState(payload: EncryptedState, code: string): Promise<string> {
  const iv = fromBase64Url(payload.iv);
  const ciphertext = fromBase64Url(payload.ciphertext);
  if (!iv || iv.length !== IV_BYTES || !ciphertext?.length) throw new Error("Invalid encrypted payload");
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    await syncKey(code),
    ciphertext as BufferSource
  );
  return decoder.decode(plaintext);
}
