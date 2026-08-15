import { useState } from "react";
import { useAppState } from "../hooks/useStore";
import { hashPassword, markUnlocked } from "../lib/password";
import { createClass, hasStorageError, studentsOf } from "../lib/store";
import { Modal } from "./Modal";

const CLASS_EMOJI = ["🍎", "⭐", "🌈", "🚀", "🦉", "🐝", "🌻", "📚", "✏️", "🎨", "🧩", "🦖"];

interface ClassPickerProps {
  onOpenClass: (classId: string) => void;
}

export function ClassPicker({ onOpenClass }: ClassPickerProps) {
  const { classes } = useAppState();
  const [creating, setCreating] = useState(false);

  return (
    <div className="picker">
      <div className="picker__hero">
        <span className="picker__logo" aria-hidden="true">
          ⭐
        </span>
        <h1 className="picker__title">Star Catcher</h1>
        <p className="picker__tag">Catch your students being awesome.</p>
      </div>

      {hasStorageError() && (
        <div className="storage-warning" role="alert">
          ⚠️ Browser storage is full — changes may not stick on this device, but they still sync to the
          cloud when it&rsquo;s reachable.
        </div>
      )}

      <div className="class-grid" style={classes.length === 0 ? { maxWidth: 320, margin: "0 auto" } : undefined}>
        {classes.map((cls, i) => (
          <button
            key={cls.id}
            className="class-card"
            style={{ animationDelay: `${Math.min(i * 40, 300)}ms` }}
            onClick={() => onOpenClass(cls.id)}
          >
            <span className="class-card__emoji" aria-hidden="true">
              {cls.emoji}
            </span>
            <span className="class-card__name">{cls.name}</span>
            <span className="class-card__meta">
              {cls.teacher && `${cls.teacher} · `}
              {studentsOf(cls.id).length} students
              {cls.passwordHash && (
                <span title="Board is password-protected" aria-label="Board is password-protected">
                  {" "}🔒
                </span>
              )}
            </span>
          </button>
        ))}
        <button className="class-card class-card--new" onClick={() => setCreating(true)}>
          <span style={{ fontSize: 28 }} aria-hidden="true">
            +
          </span>
          New class
        </button>
      </div>

      {creating && (
        <CreateClassSheet
          onCreated={(id) => {
            setCreating(false);
            onOpenClass(id);
          }}
          onClose={() => setCreating(false)}
        />
      )}
    </div>
  );
}

function CreateClassSheet({ onCreated, onClose }: { onCreated: (id: string) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [teacher, setTeacher] = useState("");
  const [emoji, setEmoji] = useState(CLASS_EMOJI[0]);
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);

  const canSubmit = Boolean(name.trim()) && password.length >= 4 && !creating;

  const submit = async () => {
    if (!canSubmit) return;
    setCreating(true);
    const passwordHash = await hashPassword(password);
    const cls = createClass(name, teacher, emoji, passwordHash);
    markUnlocked(cls.id); // the creator shouldn't have to retype it immediately
    onCreated(cls.id);
  };

  return (
    <Modal title="New class" onClose={onClose}>
      <div className="field">
        <label htmlFor="newClsName">Class name</label>
        <input
          id="newClsName"
          value={name}
          placeholder="e.g. Mrs. Walker's Kindergarten"
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="newClsTeacher">Teacher (optional)</label>
        <input
          id="newClsTeacher"
          value={teacher}
          placeholder="e.g. Mrs. Walker"
          onChange={(e) => setTeacher(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="newClsPassword">Class password</label>
        <input
          id="newClsPassword"
          type="password"
          value={password}
          placeholder="At least 4 characters"
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
          }}
        />
        <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: 0 }}>
          Needed to run the board (the class view stays open for everyone). There is no way to reset it, so
          keep it somewhere safe.
        </p>
      </div>
      <div className="field">
        <label>Class emoji</label>
        <div className="avatar-grid">
          {CLASS_EMOJI.map((e) => (
            <button key={e} aria-pressed={e === emoji} onClick={() => setEmoji(e)} aria-label={`Emoji ${e}`}>
              {e}
            </button>
          ))}
        </div>
      </div>
      <div className="sheet__footer">
        <button className="btn btn--ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn--primary" onClick={() => void submit()} disabled={!canSubmit}>
          {creating ? "Creating…" : "Create class"}
        </button>
      </div>
    </Modal>
  );
}
