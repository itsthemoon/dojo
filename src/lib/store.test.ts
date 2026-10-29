import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetForTests,
  addStudent,
  adjustPoints,
  award,
  categoryBreakdown,
  classTotal,
  createClass,
  deleteClass,
  pointTotals,
  recordPick,
  removeStudent,
  resetPoints,
  updateClass,
  getState,
} from "./store";

describe("store", () => {
  beforeEach(() => {
    __resetForTests();
  });

  it("creates classes and students", () => {
    const cls = createClass("Mrs. Walker's Kindergarten", "Mrs. Walker", "🍎");
    const ava = addStudent(cls.id, "Ava", "🦄");
    addStudent(cls.id, "Ben", "🐸");

    expect(getState().classes).toHaveLength(1);
    expect(getState().students).toHaveLength(2);
    expect(pointTotals(cls.id).get(ava.id)).toBe(0);
  });

  it("awards category stars and tracks the breakdown", () => {
    const cls = createClass("K", "T", "⭐");
    const ava = addStudent(cls.id, "Ava", "🦄");

    award(cls.id, [ava.id], "being-kind");
    award(cls.id, [ava.id], "being-kind");
    award(cls.id, [ava.id], "working-hard");
    award(cls.id, [ava.id], "star-student"); // worth +2

    expect(pointTotals(cls.id).get(ava.id)).toBe(5);
    const breakdown = categoryBreakdown(cls.id, ava.id);
    expect(breakdown.get("being-kind")).toBe(2);
    expect(breakdown.get("working-hard")).toBe(1);
    expect(breakdown.get("star-student")).toBe(2);
  });

  it("awards to many students at once", () => {
    const cls = createClass("K", "T", "⭐");
    const a = addStudent(cls.id, "Ava", "🦄");
    const b = addStudent(cls.id, "Ben", "🐸");

    award(cls.id, [a.id, b.id], "cleaning-up");

    expect(pointTotals(cls.id).get(a.id)).toBe(1);
    expect(pointTotals(cls.id).get(b.id)).toBe(1);
    expect(classTotal(cls.id)).toBe(2);
  });

  it("never lets a total drop below zero", () => {
    const cls = createClass("K", "T", "⭐");
    const a = addStudent(cls.id, "Ava", "🦄");

    adjustPoints(cls.id, a.id, -1);
    adjustPoints(cls.id, a.id, -1);
    award(cls.id, [a.id], "being-kind");

    expect(pointTotals(cls.id).get(a.id)).toBe(1);
  });

  it("start fresh zeroes totals, empties the jar, and compacts old events", () => {
    const cls = createClass("K", "T", "⭐");
    const a = addStudent(cls.id, "Ava", "🦄");
    award(cls.id, [a.id], "being-kind");

    resetPoints(cls.id);

    expect(pointTotals(cls.id).get(a.id)).toBe(0);
    expect(getState().events).toHaveLength(0);
    expect(getState().jars[cls.id]).toEqual({ base: 0, parties: 0 });
  });

  it("records jar parties when the class goal is crossed", () => {
    const cls = createClass("K", "T", "⭐");
    updateClass(cls.id, { starJarTarget: 5 });
    const a = addStudent(cls.id, "Ava", "🦄");
    const b = addStudent(cls.id, "Ben", "🐸");

    for (let i = 0; i < 2; i++) award(cls.id, [a.id, b.id], "being-kind"); // total 4
    expect(getState().jars[cls.id]).toBeUndefined();

    const result = award(cls.id, [a.id, b.id], "being-kind"); // total 6 — crosses 5
    expect(result.jarFull).toBe(true);
    expect(getState().jars[cls.id]).toEqual({ base: 5, parties: 1 });

    // Raising the goal later never rewrites earned parties.
    updateClass(cls.id, { starJarTarget: 50 });
    expect(getState().jars[cls.id].parties).toBe(1);
  });

  it("reports milestones when a student crosses a multiple of ten", () => {
    const cls = createClass("K", "T", "⭐");
    const a = addStudent(cls.id, "Ava", "🦄");
    for (let i = 0; i < 9; i++) award(cls.id, [a.id], "being-kind");

    const result = award(cls.id, [a.id], "being-kind"); // 9 → 10
    expect(result.milestone).toBe(true);
    expect(award(cls.id, [a.id], "being-kind").milestone).toBe(false); // 10 → 11
  });

  it("removing a student clears their events and picks", () => {
    const cls = createClass("K", "T", "⭐");
    const a = addStudent(cls.id, "Ava", "🦄");
    addStudent(cls.id, "Ben", "🐸");
    award(cls.id, [a.id], "being-kind");
    recordPick(cls.id, a.id);

    removeStudent(a.id);

    expect(getState().events).toHaveLength(0);
    expect(getState().pickedStudentIds[cls.id]).toEqual([]);
  });

  it("deleting a class removes everything belonging to it", () => {
    const cls = createClass("K", "T", "⭐");
    const other = createClass("First grade", "U", "🚀");
    const a = addStudent(cls.id, "Ava", "🦄");
    const b = addStudent(other.id, "Ben", "🐸");
    award(cls.id, [a.id], "being-kind");
    award(other.id, [b.id], "being-kind");

    deleteClass(cls.id);

    expect(getState().classes).toHaveLength(1);
    expect(getState().students.map((s) => s.id)).toEqual([b.id]);
    expect(getState().events).toHaveLength(1);
  });

  it("star picker gives everyone a turn before repeating", () => {
    const cls = createClass("K", "T", "⭐");
    const a = addStudent(cls.id, "Ava", "🦄");
    const b = addStudent(cls.id, "Ben", "🐸");

    recordPick(cls.id, a.id);
    expect(getState().pickedStudentIds[cls.id]).toEqual([a.id]);

    // Picking the last remaining student starts a fresh round.
    recordPick(cls.id, b.id);
    expect(getState().pickedStudentIds[cls.id]).toEqual([]);
  });
});
