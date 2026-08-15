// Class passwords are hashed with PBKDF2-SHA256 via WebCrypto — no extra
// dependency, and never stored or synced in plain text. There is deliberately
// no reset flow.

const ITERATIONS = 150_000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;

function toB64(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return btoa(String.fromCharCode(...arr));
}

function fromB64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    HASH_BYTES * 8
  );
  return toB64(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toB64(salt)}$${hash}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, iterStr, saltB64, expected] = stored.split("$");
    if (scheme !== "pbkdf2") return false;
    const actual = await derive(password, fromB64(saltB64), parseInt(iterStr, 10));
    return actual === expected;
  } catch {
    return false;
  }
}

// --- Per-tab unlock state ----------------------------------------------------

const unlockKey = (classId: string) => `dojo.unlocked.${classId}`;

export function isUnlocked(classId: string): boolean {
  try {
    return sessionStorage.getItem(unlockKey(classId)) === "1";
  } catch {
    return false;
  }
}

export function markUnlocked(classId: string): void {
  try {
    sessionStorage.setItem(unlockKey(classId), "1");
  } catch {
    // Session-only convenience; ignore storage failures.
  }
}
