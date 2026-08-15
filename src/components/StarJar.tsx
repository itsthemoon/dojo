import type { JarRecord } from "../lib/types";

interface StarJarProps {
  total: number;
  target: number;
  jar: JarRecord;
}

/**
 * Whole-class goal: every star fills the jar; a full jar earns a class party.
 * Parties come from the recorded jar state, so changing the goal later never
 * rewrites what the class already earned.
 */
export function StarJar({ total, target, jar }: StarJarProps) {
  const progress = Math.max(0, Math.min(total - jar.base, target));
  const pct = Math.min(100, (progress / target) * 100);
  const partiesText = `${jar.parties} class ${jar.parties === 1 ? "party" : "parties"} earned`;

  return (
    <div className="starjar">
      <div className="starjar__frame">
        <span className="starjar__label">
          <span aria-hidden="true">🫙</span> Star Jar
        </span>
        <div
          className="starjar__track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={target}
          aria-valuenow={progress}
          aria-label="Class Star Jar"
        >
          <div className="starjar__fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="starjar__count">
          {progress} / {target}
        </span>
        {jar.parties > 0 && (
          <span className="starjar__parties" role="img" aria-label={partiesText} title={partiesText}>
            {"🎉".repeat(Math.min(jar.parties, 5))}
          </span>
        )}
      </div>
    </div>
  );
}
