import { useCallback, useEffect, useRef, useState } from "react";
import { useAppState } from "../hooks/useStore";
import { playChime, playFanfare } from "../lib/audio";
import { getCategory } from "../lib/categories";
import { burstAt, milestoneBlast, starRain } from "../lib/celebrate";
import {
  award,
  classById,
  classTotal,
  hasStorageError,
  jarOf,
  jarTargetOf,
  pointTotals,
  studentsOf,
  updateSettings,
} from "../lib/store";
import type { Student } from "../lib/types";
import { isUnlocked } from "../lib/password";
import { displayUrl } from "../hooks/useHashRoute";
import { AddStudentSheet } from "./AddStudentSheet";
import { PasswordGate } from "./PasswordGate";
import { AwardSheet } from "./AwardSheet";
import { ClassSettingsSheet } from "./ClassSettingsSheet";
import { EggOverlays, useEasterEggs } from "./Eggs";
import { StarJar } from "./StarJar";
import { StarPicker } from "./StarPicker";
import { StudentCard, type Pop } from "./StudentCard";
import { StudentSheet } from "./StudentSheet";

interface TeacherBoardProps {
  classId: string;
  onExit: () => void;
}

export function TeacherBoard({ classId, onExit }: TeacherBoardProps) {
  const state = useAppState();
  const classroom = classById(classId);
  const students = studentsOf(classId);
  const totals = pointTotals(classId);
  const total = classTotal(classId);
  const jar = jarOf(classId);
  const jarTarget = jarTargetOf(classId);
  const { settings } = state;

  // Transient UI state
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [awardTargets, setAwardTargets] = useState<Student[] | null>(null);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [adding, setAdding] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [jarParty, setJarParty] = useState(false);
  const [pops, setPops] = useState<Record<string, Pop>>({});
  const [waveKey, setWaveKey] = useState<number | null>(null);

  const [unlocked, setUnlocked] = useState(() => isUnlocked(classId));
  const popTimers = useRef<Record<string, number>>({});
  const emojiClicks = useRef<number[]>([]);
  const eggs = useEasterEggs();

  useEffect(() => {
    setUnlocked(isUnlocked(classId));
  }, [classId]);

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

  const handleAward = (categoryId: string) => {
    if (!awardTargets || awardTargets.length === 0) return;
    const cat = getCategory(categoryId);
    const ids = awardTargets.map((s) => s.id);

    const { milestone, jarFull } = award(classId, ids, categoryId);
    playChime();
    // Celebrate on the students' own cards (after the sheet has closed).
    requestAnimationFrame(() => {
      if (ids.length > 10) {
        milestoneBlast();
      } else {
        for (const id of ids) {
          burstAt(document.querySelector<HTMLElement>(`[data-student-id="${id}"]`), cat.color);
        }
      }
    });
    triggerPops(ids, cat.value);
    setAwardTargets(null);
    setSelecting(false);
    setSelectedIds(new Set());

    if (jarFull) {
      window.setTimeout(() => {
        setJarParty(true);
        starRain(4000);
        playFanfare();
        window.setTimeout(() => setJarParty(false), 5200);
      }, 350);
    } else if (milestone) {
      window.setTimeout(() => {
        milestoneBlast();
        playFanfare();
      }, 300);
    }
  };

  const toggleSelected = (student: Student) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(student.id)) next.delete(student.id);
      else next.add(student.id);
      return next;
    });
  };

  const onEmojiClick = () => {
    const now = Date.now();
    emojiClicks.current = [...emojiClicks.current.filter((t) => now - t < 1600), now];
    if (emojiClicks.current.length >= 5) {
      emojiClicks.current = [];
      setWaveKey(now);
      window.setTimeout(() => setWaveKey(null), 1200 + students.length * 70);
    }
  };

  if (!classroom) return null;

  if (classroom.passwordHash && !unlocked) {
    return (
      <PasswordGate
        classroom={classroom}
        onUnlock={() => setUnlocked(true)}
        onOpenDisplay={() => {
          window.location.hash = `#/display/${classId}`;
        }}
        onBack={onExit}
      />
    );
  }

  const selectedStudents = students.filter((s) => selectedIds.has(s.id));

  return (
    <div>
      <header className="header">
        <div className="header__row">
          <button className="btn btn--ghost btn--icon" onClick={onExit} aria-label="All classes">
            ←
          </button>
          <button className="header__emoji" onClick={onEmojiClick} aria-label="Class emoji">
            {classroom.emoji}
          </button>
          <div className="header__titles">
            <h1 className="header__title">{classroom.name}</h1>
            {classroom.teacher && <p className="header__subtitle">{classroom.teacher}</p>}
          </div>
          <div className="header__actions">
            <button
              className="btn btn--ghost btn--icon"
              onClick={() => window.open(displayUrl(classId), "_blank", "noopener")}
              title="Open the class view (for the projector)"
              aria-label="Open class view"
            >
              📺️
            </button>
            <button
              className="btn btn--ghost btn--icon"
              onClick={() => updateSettings({ soundOn: !settings.soundOn })}
              title={settings.soundOn ? "Sounds on" : "Sounds off"}
              aria-label={settings.soundOn ? "Turn sounds off" : "Turn sounds on"}
            >
              {settings.soundOn ? "🔊" : "🔇"}
            </button>
            <button
              className="btn btn--ghost btn--icon"
              onClick={() => setSettingsOpen(true)}
              title="Class settings"
              aria-label="Class settings"
            >
              ⚙️
            </button>
          </div>
        </div>
      </header>

      {hasStorageError() && (
        <div className="storage-warning" role="alert">
          ⚠️ Browser storage is full — changes may not stick on this device, but they still sync to the
          cloud when it&rsquo;s reachable.
        </div>
      )}

      <StarJar total={total} target={jarTarget} jar={jar} />

      <main className="board">
        <div className="board__toolbar">
          <button className="btn btn--primary" onClick={() => setAdding(true)}>
            + Add student
          </button>
          {students.length > 0 && (
            <>
              <button className="btn btn--star" onClick={() => setAwardTargets(students)}>
                ⭐ Whole class
              </button>
              <button
                className={"btn"}
                aria-pressed={selecting}
                onClick={() => {
                  setSelecting(!selecting);
                  setSelectedIds(new Set());
                }}
              >
                {selecting ? "Done selecting" : "☑️ Select a few"}
              </button>
              <span className="board__spacer" />
              <button className="btn" onClick={() => setPickerOpen(true)}>
                ✨ Star Picker
              </button>
            </>
          )}
        </div>

        {students.length === 0 ? (
          <div className="empty">
            <span className="empty__emoji" aria-hidden="true">
              🎒
            </span>
            <h2>No students yet</h2>
            <p>Add your class to get started — each student gets a sticker and a star count.</p>
          </div>
        ) : (
          <div className="grid">
            {students.map((student, i) => (
              <StudentCard
                key={student.id}
                student={student}
                points={totals.get(student.id) ?? 0}
                index={i}
                pop={pops[student.id]}
                selecting={selecting}
                selected={selectedIds.has(student.id)}
                waveDelay={waveKey != null ? i * 70 : null}
                onPress={() => (selecting ? toggleSelected(student) : setAwardTargets([student]))}
                onEdit={() => setEditStudent(student)}
              />
            ))}
          </div>
        )}
      </main>

      {selecting && (
        <div className="action-bar">
          <span className="action-bar__count">
            {selectedIds.size} {selectedIds.size === 1 ? "student" : "students"}
          </span>
          <button
            className="action-bar__link"
            onClick={() => setSelectedIds(new Set(students.map((s) => s.id)))}
          >
            Select all
          </button>
          <button
            className="btn btn--star"
            disabled={selectedIds.size === 0}
            onClick={() => setAwardTargets(selectedStudents)}
          >
            ⭐ Give stars
          </button>
        </div>
      )}

      {awardTargets && (
        <AwardSheet students={awardTargets} onAward={handleAward} onClose={() => setAwardTargets(null)} />
      )}
      {editStudent && (
        <StudentSheet
          student={editStudent}
          points={totals.get(editStudent.id) ?? 0}
          onClose={() => setEditStudent(null)}
        />
      )}
      {adding && <AddStudentSheet classId={classId} onClose={() => setAdding(false)} />}
      {pickerOpen && (
        <StarPicker
          classId={classId}
          students={students}
          pickedIds={state.pickedStudentIds[classId] ?? []}
          onClose={() => setPickerOpen(false)}
        />
      )}
      {settingsOpen && (
        <ClassSettingsSheet
          classroom={classroom}
          settings={settings}
          onClose={() => setSettingsOpen(false)}
          onDeleted={onExit}
        />
      )}

      {jarParty && (
        <div className="party-hero" role="status">
          <div className="party-hero__title">🎉 Star Jar full! 🎉</div>
          <p className="party-hero__sub">
            {classroom.name} earned a class party — way to go!
          </p>
        </div>
      )}

      <EggOverlays trexGifOn={eggs.trexGifOn} partyOn={eggs.partyOn} />
    </div>
  );
}
