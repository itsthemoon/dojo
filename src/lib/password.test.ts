import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
  it("round-trips a password", async () => {
    const hash = await hashPassword("charlie-sadie");
    expect(hash.startsWith("pbkdf2$")).toBe(true);
    expect(await verifyPassword("charlie-sadie", hash)).toBe(true);
  });

  it("rejects wrong passwords and garbage hashes", async () => {
    const hash = await hashPassword("correct");
    expect(await verifyPassword("incorrect", hash)).toBe(false);
    expect(await verifyPassword("correct", "not-a-hash")).toBe(false);
    expect(await verifyPassword("correct", "")).toBe(false);
  });

  it("uses a fresh salt per hash", async () => {
    const a = await hashPassword("same");
    const b = await hashPassword("same");
    expect(a).not.toBe(b);
    expect(await verifyPassword("same", a)).toBe(true);
    expect(await verifyPassword("same", b)).toBe(true);
  });
});
