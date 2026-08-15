import { useState } from "react";
import { deleteClass, resetPoints, updateClass } from "../lib/store";
import type { Classroom, Settings } from "../lib/types";
import { ConfirmSheet, Modal } from "./Modal";

const CLASS_EMOJI = ["🍎", "⭐", "🌈", "🚀", "🦉", "🐝", "🌻", "📚", "✏️", "🎨", "🧩", "🦖"];

interface ClassSettingsSheetProps {
  classroom: Classroom;
  settings: Settings;
  onClose: () => void;
  onDeleted: () => void;
}

export function ClassSettingsSheet({ classroom, settings, onClose, onDeleted }: ClassSettingsSheetProps) {
  const [name, setName] = useState(classroom.name);
  const [teacher, setTeacher] = useState(classroom.teacher);
  const [emoji, setEmoji] = useState(classroom.emoji);
  const [jarTarget, setJarTarget] = useState(String(classroom.starJarTarget ?? settings.starJarTarget));
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = () => {
    const trimmed = name.trim();
    const target = parseInt(jarTarget, 10);
    const patch: Parameters<typeof updateClass>[1] = {};
    if (trimmed) {
      patch.name = trimmed;
      patch.teacher = teacher.trim();
      patch.emoji = emoji;
    }
    // The jar goal belongs to this class only.
    if (!Number.isNaN(target) && target >= 5 && target <= 10000) {
      patch.starJarTarget = target;
    }
    if (Object.keys(patch).length > 0) updateClass(classroom.id, patch);
    onClose();
  };

  return (
    <>
      <Modal title="Class settings" onClose={onClose}>
        <div className="field">
          <label htmlFor="clsName">Class name</label>
          <input id="clsName" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="clsTeacher">Teacher</label>
          <input id="clsTeacher" value={teacher} onChange={(e) => setTeacher(e.target.value)} />
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
        <div className="field">
          <label htmlFor="jarTarget">Star Jar goal (class party at…)</label>
          <input
            id="jarTarget"
            type="number"
            min={5}
            max={10000}
            value={jarTarget}
            onChange={(e) => setJarTarget(e.target.value)}
          />
        </div>

        <div className="sheet__footer" style={{ justifyContent: "flex-start" }}>
          <button className="btn btn--ghost" onClick={() => setConfirmReset(true)}>
            Start fresh (reset stars)
          </button>
          <button className="btn btn--danger" onClick={() => setConfirmDelete(true)}>
            Delete class
          </button>
          <span style={{ flex: 1 }} />
          <button className="btn btn--primary" onClick={save}>
            Save
          </button>
        </div>
      </Modal>

      {confirmReset && (
        <ConfirmSheet
          title="Start fresh?"
          body={`Every student in ${classroom.name} goes back to 0 stars, and the Star Jar empties. This can't be undone.`}
          confirmLabel="Reset stars"
          onConfirm={() => {
            resetPoints(classroom.id);
            onClose();
          }}
          onClose={() => setConfirmReset(false)}
        />
      )}

      {confirmDelete && (
        <ConfirmSheet
          title={`Delete ${classroom.name}?`}
          body="The class, its students, and all star history will be deleted. This can't be undone."
          confirmLabel="Delete class"
          danger
          onConfirm={() => {
            deleteClass(classroom.id);
            onDeleted();
          }}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}
