import { useState } from "react";
import { CATEGORIES } from "../lib/categories";
import { AVATARS } from "../lib/avatars";
import { adjustPoints, adjustmentNet, categoryBreakdown, removeStudent, updateStudent } from "../lib/store";
import type { Student } from "../lib/types";
import { ConfirmSheet, Modal } from "./Modal";

interface StudentSheetProps {
  student: Student;
  points: number;
  onClose: () => void;
}

/** Per-student sheet: category breakdown, quick corrections, and editing. */
export function StudentSheet({ student, points, onClose }: StudentSheetProps) {
  const [name, setName] = useState(student.name);
  const [avatar, setAvatar] = useState(student.avatar);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const breakdown = categoryBreakdown(student.classId, student.id);
  const rows = CATEGORIES.map((c) => ({ cat: c, count: breakdown.get(c.id) ?? 0 })).filter(
    (r) => r.count > 0
  );
  const max = Math.max(1, ...rows.map((r) => r.count));
  const adjustments = adjustmentNet(student.classId, student.id);

  const saveEdits = () => {
    const trimmed = name.trim();
    if (trimmed && (trimmed !== student.name || avatar !== student.avatar)) {
      updateStudent(student.id, { name: trimmed, avatar });
    }
    onClose();
  };

  return (
    <>
      <Modal
        title={student.name}
        onClose={onClose}
        badge={
          <span className="award-who__avatar" aria-hidden="true">
            {student.avatar}
          </span>
        }
      >
        <div className="award-who" style={{ justifyContent: "space-between" }}>
          <span>⭐ {points} stars</span>
          <span style={{ display: "inline-flex", gap: 6 }}>
            <button
              className="btn btn--icon"
              onClick={() => adjustPoints(student.classId, student.id, -1)}
              disabled={points === 0}
              aria-label="Take away one star"
            >
              −
            </button>
            <button
              className="btn btn--icon"
              onClick={() => adjustPoints(student.classId, student.id, 1)}
              aria-label="Add one star"
            >
              +
            </button>
          </span>
        </div>

        {rows.length > 0 ? (
          <div className="breakdown">
            {rows
              .sort((a, b) => b.count - a.count)
              .map(({ cat, count }) => (
                <div key={cat.id} className="breakdown__row" title={cat.label}>
                  <span className="breakdown__emoji" aria-hidden="true">
                    {cat.emoji}
                  </span>
                  <div className="breakdown__bar">
                    <div
                      className="breakdown__fill"
                      style={{ width: `${(count / max) * 100}%`, ["--row-color" as string]: cat.color }}
                    />
                  </div>
                  <span className="breakdown__num">{count}</span>
                </div>
              ))}
            {adjustments !== 0 && (
              <div className="breakdown__row" title="Manual +/- corrections">
                <span className="breakdown__emoji" aria-hidden="true">
                  ✏️
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-soft)" }}>Corrections</span>
                <span className="breakdown__num">{adjustments > 0 ? `+${adjustments}` : adjustments}</span>
              </div>
            )}
          </div>
        ) : (
          <p style={{ color: "var(--ink-soft)", margin: "6px 0" }}>
            No stars yet this round — tap {student.name}&rsquo;s card to give the first one.
          </p>
        )}

        <div className="field" style={{ marginTop: 18 }}>
          <label htmlFor="editName">Name</label>
          <input id="editName" value={name} onChange={(e) => setName(e.target.value)} />
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
          <button className="btn btn--danger" onClick={() => setConfirmRemove(true)}>
            Remove student
          </button>
          <span style={{ flex: 1 }} />
          <button className="btn btn--primary" onClick={saveEdits}>
            Done
          </button>
        </div>
      </Modal>

      {confirmRemove && (
        <ConfirmSheet
          title={`Remove ${student.name}?`}
          body="Their stars and history will be removed too. This can't be undone."
          confirmLabel="Remove"
          danger
          onConfirm={() => {
            removeStudent(student.id);
            onClose();
          }}
          onClose={() => setConfirmRemove(false)}
        />
      )}
    </>
  );
}
