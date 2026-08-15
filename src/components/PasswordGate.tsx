import { useState } from "react";
import { markUnlocked, verifyPassword } from "../lib/password";
import type { Classroom } from "../lib/types";

interface PasswordGateProps {
  classroom: Classroom;
  onUnlock: () => void;
  onOpenDisplay: () => void;
  onBack: () => void;
}

/** Lock screen for the teacher board. The read-only class view stays open. */
export function PasswordGate({ classroom, onUnlock, onOpenDisplay, onBack }: PasswordGateProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  const submit = async () => {
    if (!password || checking || !classroom.passwordHash) return;
    setChecking(true);
    const ok = await verifyPassword(password, classroom.passwordHash);
    setChecking(false);
    if (ok) {
      markUnlocked(classroom.id);
      onUnlock();
    } else {
      setError(true);
      setPassword("");
    }
  };

  return (
    <div className="gate">
      <div className="gate__card">
        <span className="gate__emoji" aria-hidden="true">
          {classroom.emoji}
        </span>
        <h1 className="gate__title">{classroom.name}</h1>
        <p className="gate__sub">This board is locked. Enter the class password to run it.</p>
        <div className="field" style={{ width: "100%", marginBottom: 10 }}>
          <label htmlFor="gatePassword">Class password</label>
          <input
            id="gatePassword"
            type="password"
            value={password}
            autoFocus
            onChange={(e) => {
              setPassword(e.target.value);
              setError(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
          />
        </div>
        {error && (
          <p className="gate__error" role="alert">
            That&rsquo;s not it — try again.
          </p>
        )}
        <button className="btn btn--primary btn--lg" onClick={() => void submit()} disabled={!password || checking}>
          {checking ? "Checking…" : "Unlock board"}
        </button>
        <div className="gate__links">
          <button className="btn btn--ghost" onClick={onOpenDisplay}>
            Open the class view instead
          </button>
          <button className="btn btn--ghost" onClick={onBack}>
            All classes
          </button>
        </div>
      </div>
    </div>
  );
}
