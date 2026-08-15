import { useCallback, useEffect, useRef, useState } from "react";
import { useAppState } from "../hooks/useStore";
import { playChime, playFanfare } from "../lib/audio";
import { burstAt, milestoneBlast, starRain } from "../lib/celebrate";
import { classById, classTotal, jarOf, jarTargetOf, onCelebrate, pointTotals, studentsOf } from "../lib/store";
import { EggOverlays, useEasterEggs } from "./Eggs";
import { StarJar } from "./StarJar";
import { StudentCard, type Pop } from "./StudentCard";

interface DisplayBoardProps {
  classId: string;
  onExit: () => void;
}

/**
 * The class view — read-only, sized for a projector or smartboard. Updates
 * live (and celebrates!) as the teacher awards stars from another window.
 */
export function DisplayBoard({ classId, onExit }: DisplayBoardProps) {
  useAppState();
  const classroom = classById(classId);
  const students = studentsOf(classId);
  const totals = pointTotals(classId);
  const total = classTotal(classId);
  const jar = jarOf(classId);
  const jarTarget = jarTargetOf(classId);

  const [pops, setPops] = useState<Record<string, Pop>>({});
  const [jarParty, setJarParty] = useState(false);
  const popTimers = useRef<Record<string, number>>({});
  const eggs = useEasterEggs();

  useEffect(() => {
    if (!classroom) onExit();
  }, [classroom, onExit]);

  const triggerPops = useCallback((studentIds: string[], delta: number) => {
    const key = Date.now();
    setPops((prev) => {
      const next = { ...prev };
      for (const id of studentIds) next[id] = { key, delta };
      return next;
    });
    for (const id of studentIds) {
      clearTimeout(popTimers.current[id]);
      popTimers.current[id] = window.setTimeout(() => {
        setPops((prev) => {
          if (prev[id]?.key !== key) return prev;
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }, 900);
    }
  }, []);

  useEffect(() => () => Object.values(popTimers.current).forEach(clearTimeout), []);

  useEffect(() => {
    return onCelebrate((msg) => {
      if (msg.classId !== classId) return;
      playChime();
      triggerPops(msg.studentIds, msg.delta);

      // Mirror the teacher-side guard: one big blast for whole-class awards.
      if (msg.studentIds.length > 10) {
        milestoneBlast();
      } else {
        for (const id of msg.studentIds) {
          burstAt(document.querySelector<HTMLElement>(`[data-student-id="${id}"]`));
        }
      }

      // Milestone/jar were decided once, at award time, in the store.
      if (msg.jarFull) {
        window.setTimeout(() => {
          setJarParty(true);
          starRain(4000);
          playFanfare();
          window.setTimeout(() => setJarParty(false), 5200);
        }, 350);
      } else if (msg.milestone) {
        window.setTimeout(() => {
          milestoneBlast();
          playFanfare();
        }, 300);
      }
    });
  }, [classId, triggerPops]);

  if (!classroom) return null;

  return (
    <div className="display">
      <header className="header">
        <div className="header__row">
          <span className="header__emoji" role="img" aria-label="Class emoji">
            {classroom.emoji}
          </span>
          <div className="header__titles">
            <h1 className="header__title">{classroom.name}</h1>
            {classroom.teacher && <p className="header__subtitle">{classroom.teacher}</p>}
          </div>
          <div className="header__actions">
            <button
              className="btn btn--ghost btn--icon"
              onClick={() => {
                if (document.fullscreenElement) void document.exitFullscreen();
                else void document.documentElement.requestFullscreen?.();
              }}
              title="Fullscreen"
              aria-label="Toggle fullscreen"
            >
              ⛶
            </button>
            <button className="btn btn--ghost btn--icon" onClick={onExit} aria-label="Leave class view">
              ✕
            </button>
          </div>
        </div>
      </header>

      <StarJar total={total} target={jarTarget} jar={jar} />

      <main className="board">
        {students.length === 0 ? (
          <div className="empty">
            <span className="empty__emoji" aria-hidden="true">
              🎒
            </span>
            <h2>No students yet</h2>
            <p>Students appear here as soon as the teacher adds them.</p>
          </div>
        ) : (
          <div className="grid grid--display">
            {students.map((student, i) => (
              <StudentCard
                key={student.id}
                student={student}
                points={totals.get(student.id) ?? 0}
                index={i}
                pop={pops[student.id]}
                readOnly
              />
            ))}
          </div>
        )}
      </main>

      {jarParty && (
        <div className="party-hero" role="status">
          <div className="party-hero__title">🎉 Star Jar full! 🎉</div>
          <p className="party-hero__sub">{classroom.name} earned a class party — way to go!</p>
        </div>
      )}

      <EggOverlays trexOn={eggs.trexOn} partyOn={eggs.partyOn} />
    </div>
  );
}
