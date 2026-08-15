import { CATEGORIES } from "../lib/categories";
import type { Student } from "../lib/types";
import { Modal } from "./Modal";

interface AwardSheetProps {
  students: Student[];
  onAward: (categoryId: string) => void;
  onClose: () => void;
}

export function AwardSheet({ students, onAward, onClose }: AwardSheetProps) {
  const who =
    students.length === 1
      ? students[0].name
      : `${students.length} students`;

  return (
    <Modal title="Give a star for…" onClose={onClose} wide>
      <div className="award-who">
        {students.length === 1 ? (
          <span className="award-who__avatar" aria-hidden="true">
            {students[0].avatar}
          </span>
        ) : (
          <span className="award-who__avatar" aria-hidden="true">
            {students
              .slice(0, 3)
              .map((s) => s.avatar)
              .join("")}
          </span>
        )}
        <span>{who}</span>
      </div>
      <div className="cat-grid">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            className={`cat${cat.id === "star-student" ? " cat--gold" : ""}`}
            style={{ ["--cat-color" as string]: cat.color }}
            onClick={() => onAward(cat.id)}
          >
            <span className="cat__value">+{cat.value} ⭐</span>
            <span className="cat__emoji" aria-hidden="true">
              {cat.emoji}
            </span>
            <span className="cat__label">{cat.label}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
