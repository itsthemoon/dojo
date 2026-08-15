import type { Student } from "../lib/types";
import { avatarHue } from "../lib/avatars";

export interface Pop {
  /** Changes every award so the CSS animation re-triggers. */
  key: number;
  delta: number;
}

interface StudentCardProps {
  student: Student;
  points: number;
  index: number;
  pop?: Pop;
  selected?: boolean;
  selecting?: boolean;
  waveDelay?: number | null;
  readOnly?: boolean;
  onPress?: () => void;
  onEdit?: () => void;
}

export function StudentCard({
  student,
  points,
  index,
  pop,
  selected,
  selecting,
  waveDelay,
  readOnly,
  onPress,
  onEdit,
}: StudentCardProps) {
  const classes = [
    "card",
    selected ? "card--selected" : "",
    pop ? "card--pop" : "",
    waveDelay != null ? "card--wave" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const cardStyle: React.CSSProperties = {
    ["--hue" as string]: avatarHue(student.id),
    animationDelay: waveDelay != null ? `${waveDelay}ms` : undefined,
  };

  // Entrance stagger lives on the wrapper so the edit pencil fades in with the card.
  const wrapStyle: React.CSSProperties = {
    animationDelay: `${Math.min(index * 35, 420)}ms`,
  };

  const body = (
    <>
      {selecting && selected && <span className="card__check">✓</span>}
      <span className="card__avatar" aria-hidden="true">
        {student.avatar}
      </span>
      <span className="card__name">{student.name}</span>
      <span key={pop?.key ?? "stars"} className="card__stars">
        <span aria-hidden="true">⭐</span>
        <span>{points}</span>
      </span>
      {pop && (
        <span key={pop.key} className="card__float" aria-hidden="true">
          +{pop.delta}
        </span>
      )}
    </>
  );

  if (readOnly) {
    return (
      <div className="card-wrap" style={wrapStyle}>
        <div className={classes} style={cardStyle} data-student-id={student.id}>
          {body}
        </div>
      </div>
    );
  }

  return (
    <div className="card-wrap" style={wrapStyle}>
      <button
        className={classes}
        style={cardStyle}
        data-student-id={student.id}
        onClick={onPress}
        aria-pressed={selecting ? selected : undefined}
        aria-label={
          selecting
            ? `${student.name}, ${points} stars, ${selected ? "selected" : "not selected"}`
            : `Give ${student.name} a star (${points} so far)`
        }
      >
        {body}
      </button>
      {!selecting && onEdit && (
        <button
          className="card__edit"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          aria-label={`Edit ${student.name}`}
        >
          ✏️
        </button>
      )}
    </div>
  );
}
