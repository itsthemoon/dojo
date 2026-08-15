import { useState } from "react";
import { AVATARS } from "../lib/avatars";
import { addStudent } from "../lib/store";
import { Modal } from "./Modal";

interface AddStudentSheetProps {
  classId: string;
  onClose: () => void;
}

export function AddStudentSheet({ classId, onClose }: AddStudentSheetProps) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [addedCount, setAddedCount] = useState(0);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    addStudent(classId, trimmed, avatar);
    setAddedCount((n) => n + 1);
    setName("");
    // Rotate to a fresh sticker suggestion so a whole class is quick to enter.
    setAvatar(AVATARS[(AVATARS.indexOf(avatar) + 1) % AVATARS.length]);
  };

  return (
    <Modal title="Add a student" onClose={onClose}>
      <div className="field">
        <label htmlFor="newStudentName">Name</label>
        <input
          id="newStudentName"
          value={name}
          placeholder="e.g. Ava"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
      </div>
      <div className="field">
        <label>Sticker</label>
        <div className="avatar-grid">
          {AVATARS.map((a) => (
            <button key={a} aria-pressed={a === avatar} onClick={() => setAvatar(a)} aria-label={`Sticker ${a}`}>
              {a}
            </button>
          ))}
        </div>
      </div>
      <div className="sheet__footer">
        {addedCount > 0 && (
          <span style={{ color: "var(--ink-soft)", alignSelf: "center", fontSize: 14, fontWeight: 700 }}>
            {addedCount} added
          </span>
        )}
        <span style={{ flex: 1 }} />
        <button className="btn btn--ghost" onClick={onClose}>
          Done
        </button>
        <button className="btn btn--primary" onClick={submit} disabled={!name.trim()}>
          Add student
        </button>
      </div>
    </Modal>
  );
}
