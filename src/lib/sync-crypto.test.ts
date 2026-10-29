import { describe, expect, it } from "vitest";
import {
  decryptState,
  encryptState,
  newSyncCode,
  normalizeSyncCode,
  syncDocId,
} from "./sync-crypto";

describe("encrypted sync", () => {
  it("round-trips state with a code", async () => {
    const code = newSyncCode();
    const state = JSON.stringify({ classes: [{ name: "Room 3" }], rev: 7 });
    const payload = await encryptState(state, code);
    expect(payload.ciphertext).not.toContain("Room 3");
    await expect(decryptState(payload, code)).resolves.toBe(state);
  });

  it("rejects a different code", async () => {
    const code = newSyncCode();
    const payload = await encryptState("secret", code);
    await expect(decryptState(payload, newSyncCode())).rejects.toThrow();
  });

  it("normalizes only 256-bit codes", () => {
    const code = newSyncCode();
    expect(normalizeSyncCode(`  ${code}  `)).toBe(code);
    expect(normalizeSyncCode("not-a-code")).toBeNull();
  });

  it("derives a stable, non-reversible document id", async () => {
    const code = newSyncCode();
    expect(await syncDocId(code)).toBe(await syncDocId(code));
    expect(await syncDocId(code)).toHaveLength(64);
    expect(await syncDocId(code)).not.toContain(code);
  });
});
