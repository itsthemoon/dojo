import { useEffect, useRef, useState } from "react";
import { playTada, playTick } from "../lib/audio";
import { burstAt } from "../lib/celebrate";
import { recordPick, resetPicks } from "../lib/store";
import type { Student } from "../lib/types";
import { Modal } from "./Modal";

interface StarPickerProps {
  classId: string;
  students: Student[];
  pickedIds: string[];
  onClose: () => void;
}

type Phase = "idle" | "spinning" | "landed";

/**
 * Star Picker — fairly picks a student (line leader, helper, question time).
 * Everyone gets a turn before anyone is picked twice.
 */
export function StarPicker({ classId, students, pickedIds, onClose }: StarPickerProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [shown, setShown] = useState<Student | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const timeouts = useRef<number[]>([]);

  const eligible = students.filter((s) => !pickedIds.includes(s.id));
  const remaining = eligible.length;

  useEffect(() => {
    return () => timeouts.current.forEach(clearTimeout);
  }, []);

  const spin = () => {
    if (eligible.length === 0 || phase === "spinning") return;
    const winner = eligible[Math.floor(Math.random() * eligible.length)];
    const reel = students.length > 1 ? students : [winner];
    setPhase("spinning");

    // Flick through names, slowing down like a wheel losing momentum.
    let delay = 65;
    let elapsed = 0;
    let i = Math.floor(Math.random() * reel.length);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const spinFor = reduced ? 250 : 2600;

    const step = () => {
      elapsed += delay;
      if (elapsed >= spinFor) {
        setShown(winner);
        setPhase("landed");
        playTada();
        burstAt(stageRef.current);
        recordPick(classId, winner.id);
        return;
      }
      i = (i + 1) % reel.length;
      setShown(reel[i]);
      playTick();
      delay = Math.min(delay * 1.09, 320);
      timeouts.current.push(window.setTimeout(step, delay));
    };
    step();
  };

  return (
    <Modal title="Star Picker" onClose={onClose} badge={<span className="award-who__avatar">✨</span>}>
      <div className={`spinner spinner--${phase}`}>
        <div ref={stageRef} className="spinner__stage">
          {shown ? (
            <>
              <span className="spinner__avatar" aria-hidden="true">
                {shown.avatar}
              </span>
              <span className="spinner__name" aria-live={phase === "landed" ? "assertive" : "off"}>
                {shown.name}
                {phase === "landed" && " 🎉"}
              </span>
            </>
          ) : (
            <>
              <span className="spinner__avatar" aria-hidden="true">
                ✨
              </span>
              <span className="spinner__name" style={{ color: "var(--ink-soft)" }}>
                Who will it be?
              </span>
            </>
          )}
        </div>

        <button
          className="btn btn--star btn--lg"
          onClick={spin}
          disabled={phase === "spinning" || remaining === 0}
        >
          {phase === "landed" ? "Spin again" : "Spin"}
        </button>

        <p className="spinner__hint">
          {remaining === 0 ? (
            <>
              Everyone has had a turn!{" "}
              <button className="btn btn--ghost" onClick={() => resetPicks(classId)} style={{ fontSize: 14 }}>
                Start a new round
              </button>
            </>
          ) : (
            `Everyone gets a turn — ${remaining} ${remaining === 1 ? "name" : "names"} left this round.`
          )}
        </p>
      </div>
    </Modal>
  );
}
