import { useEffect } from "react";

/**
 * Fires the callback when a secret sequence is typed (or entered with arrow
 * keys). Sequences are matched against `KeyboardEvent.key`, case-insensitive.
 */
export function useSecretCode(sequence: string[], onMatch: () => void) {
  useEffect(() => {
    let progress = 0;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        progress = 0;
        return;
      }
      const key = e.key.toLowerCase();
      if (key === sequence[progress]?.toLowerCase()) {
        progress += 1;
        if (progress === sequence.length) {
          progress = 0;
          onMatch();
        }
      } else {
        progress = key === sequence[0]?.toLowerCase() ? 1 : 0;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [sequence, onMatch]);
}

export const KONAMI = [
  "arrowup", "arrowup", "arrowdown", "arrowdown",
  "arrowleft", "arrowright", "arrowleft", "arrowright",
  "b", "a",
];

export const TREX = ["t", "r", "e", "x"];
