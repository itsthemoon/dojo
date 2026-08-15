import type { AppState, Classroom, JarRecord, PointEvent, Settings, Student } from "./types";
import { getCategory } from "./categories";

const STORAGE_KEY = "dojo.v2";
const CHANNEL_NAME = "dojo-sync";

/** Every 10th star earns a student a bigger celebration. */
export const MILESTONE_EVERY = 10;

export interface CelebrateMessage {
  type: "celebrate";
  classId: string;
  studentIds: string[];
  categoryId: string;
  delta: number;
  /** Computed once, at award time, so every window celebrates consistently. */
  milestone: boolean;
  jarFull: boolean;
}

type SyncMessage = { type: "sync" } | CelebrateMessage;

function defaultState(): AppState {
  return {
    version: 2,
    rev: 0,
    classes: [],
    students: [],
    events: [],
    pickedStudentIds: {},
    jars: {},
    settings: { soundOn: true, starJarTarget: 100 },
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Coerce anything JSON-shaped into a valid AppState. Used for localStorage
 * loads, backup imports, and cloud documents, so no malformed payload can
 * brick the app.
 */
function normalizeState(parsed: unknown): AppState {
  const base = defaultState();
  if (!isRecord(parsed)) return base;

  const classes = Array.isArray(parsed.classes)
    ? (parsed.classes as unknown[]).filter(
        (c): c is Classroom => isRecord(c) && typeof c.id === "string" && typeof c.name === "string"
      ).map((c) => ({ ...c, pointsEpoch: Number.isFinite(c.pointsEpoch) ? c.pointsEpoch : 0 }))
    : [];

  const students = Array.isArray(parsed.students)
    ? (parsed.students as unknown[]).filter(
        (s): s is Student =>
          isRecord(s) && typeof s.id === "string" && typeof s.name === "string" && typeof s.classId === "string"
      )
    : [];

  const events = Array.isArray(parsed.events)
    ? (parsed.events as unknown[]).filter(
        (e): e is PointEvent =>
          isRecord(e) &&
          typeof e.studentId === "string" &&
          typeof e.classId === "string" &&
          typeof e.ts === "number" &&
          typeof e.delta === "number" &&
          Number.isFinite(e.delta)
      )
    : [];

  const pickedStudentIds: Record<string, string[]> = {};
  if (isRecord(parsed.pickedStudentIds)) {
    for (const [k, v] of Object.entries(parsed.pickedStudentIds)) {
      if (Array.isArray(v)) pickedStudentIds[k] = v.filter((i): i is string => typeof i === "string");
    }
  }

  const jars: Record<string, JarRecord> = {};
  if (isRecord(parsed.jars)) {
    for (const [k, v] of Object.entries(parsed.jars)) {
      if (isRecord(v)) {
        jars[k] = {
          base: Number.isFinite(v.base) ? Math.max(0, v.base as number) : 0,
          parties: Number.isFinite(v.parties) ? Math.max(0, Math.floor(v.parties as number)) : 0,
        };
      }
    }
  }

  const settingsIn = isRecord(parsed.settings) ? parsed.settings : {};
  const settings: Settings = {
    soundOn: typeof settingsIn.soundOn === "boolean" ? settingsIn.soundOn : base.settings.soundOn,
    starJarTarget:
      Number.isFinite(settingsIn.starJarTarget) && (settingsIn.starJarTarget as number) >= 1
        ? Math.floor(settingsIn.starJarTarget as number)
        : base.settings.starJarTarget,
  };

  return {
    version: 2,
    rev: Number.isFinite(parsed.rev) ? Math.max(0, parsed.rev as number) : 0,
    classes,
    students,
    events,
    pickedStudentIds,
    jars,
    settings,
  };
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return normalizeState(JSON.parse(raw));
  } catch {
    return defaultState();
  }
}

let state: AppState = loadState();
let storageBroken = false;
const listeners = new Set<() => void>();
const celebrateListeners = new Set<(msg: CelebrateMessage) => void>();
const persistListeners = new Set<(s: AppState) => void>();

const channel: BroadcastChannel | null =
  typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL_NAME) : null;

if (channel) {
  channel.onmessage = (e: MessageEvent<SyncMessage>) => {
    if (e.data?.type === "sync") {
      state = loadState();
      emit();
    } else if (e.data?.type === "celebrate") {
      state = loadState();
      emit();
      celebrateListeners.forEach((cb) => cb(e.data as CelebrateMessage));
    }
  };
}

// Fallback for a second window when BroadcastChannel is unavailable.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      state = loadState();
      emit();
    }
  });
}

function emit() {
  listeners.forEach((cb) => cb());
}

function persist(message: SyncMessage = { type: "sync" }) {
  state = { ...state, rev: state.rev + 1 };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    storageBroken = false;
  } catch {
    // Keep memory as the source of truth so the UI stays coherent, and let
    // the boards show a persistent "not saving" warning.
    storageBroken = true;
  }
  channel?.postMessage(message);
  emit();
  persistListeners.forEach((cb) => cb(state));
}

function id(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// --- React binding ---------------------------------------------------------

export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getState(): AppState {
  return state;
}

/** True when localStorage writes are failing (quota/private mode). */
export function hasStorageError(): boolean {
  return storageBroken;
}

export function onCelebrate(cb: (msg: CelebrateMessage) => void): () => void {
  celebrateListeners.add(cb);
  return () => celebrateListeners.delete(cb);
}

/** Called after every local mutation; used by the cloud sync adapter. */
export function onPersist(cb: (s: AppState) => void): () => void {
  persistListeners.add(cb);
  return () => persistListeners.delete(cb);
}

// --- Selectors --------------------------------------------------------------

export function classById(classId: string): Classroom | undefined {
  return state.classes.find((c) => c.id === classId);
}

export function studentsOf(classId: string): Student[] {
  return state.students
    .filter((s) => s.classId === classId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function jarTargetOf(classId: string): number {
  return classById(classId)?.starJarTarget ?? state.settings.starJarTarget;
}

export function jarOf(classId: string): JarRecord {
  return state.jars[classId] ?? { base: 0, parties: 0 };
}

/** Star totals per student for the class's current epoch. */
export function pointTotals(classId: string): Map<string, number> {
  const cls = classById(classId);
  const epoch = cls?.pointsEpoch ?? 0;
  const totals = new Map<string, number>();
  for (const s of state.students) {
    if (s.classId === classId) totals.set(s.id, 0);
  }
  for (const e of state.events) {
    // Events at or before the epoch predate the reset (<= guards same-ms races).
    if (e.classId !== classId || (epoch > 0 && e.ts <= epoch)) continue;
    if (!totals.has(e.studentId)) continue;
    totals.set(e.studentId, Math.max(0, (totals.get(e.studentId) ?? 0) + e.delta));
  }
  return totals;
}

export function classTotal(classId: string): number {
  let sum = 0;
  for (const v of pointTotals(classId).values()) sum += v;
  return sum;
}

/** Per-category star counts for one student (current epoch, positive awards only). */
export function categoryBreakdown(classId: string, studentId: string): Map<string, number> {
  const cls = classById(classId);
  const epoch = cls?.pointsEpoch ?? 0;
  const counts = new Map<string, number>();
  for (const e of state.events) {
    if (e.classId !== classId || e.studentId !== studentId || (epoch > 0 && e.ts <= epoch)) continue;
    if (e.delta <= 0) continue;
    counts.set(e.categoryId, (counts.get(e.categoryId) ?? 0) + e.delta);
  }
  return counts;
}

/** Net manual +/- corrections for one student (current epoch). */
export function adjustmentNet(classId: string, studentId: string): number {
  const cls = classById(classId);
  const epoch = cls?.pointsEpoch ?? 0;
  let net = 0;
  for (const e of state.events) {
    if (e.classId !== classId || e.studentId !== studentId || (epoch > 0 && e.ts <= epoch)) continue;
    if (e.categoryId === "adjust") net += e.delta;
  }
  return net;
}

// --- Mutations ---------------------------------------------------------------

export function createClass(name: string, teacher: string, emoji: string, passwordHash?: string): Classroom {
  const cls: Classroom = {
    id: id(),
    name: name.trim(),
    teacher: teacher.trim(),
    emoji,
    pointsEpoch: 0,
    ...(passwordHash ? { passwordHash } : {}),
    createdAt: Date.now(),
  };
  state = { ...state, classes: [...state.classes, cls] };
  persist();
  return cls;
}

export function updateClass(
  classId: string,
  patch: Partial<Pick<Classroom, "name" | "teacher" | "emoji" | "starJarTarget">>
) {
  state = {
    ...state,
    classes: state.classes.map((c) => (c.id === classId ? { ...c, ...patch } : c)),
  };
  persist();
}

export function deleteClass(classId: string) {
  const picked = { ...state.pickedStudentIds };
  delete picked[classId];
  const jars = { ...state.jars };
  delete jars[classId];
  state = {
    ...state,
    classes: state.classes.filter((c) => c.id !== classId),
    students: state.students.filter((s) => s.classId !== classId),
    events: state.events.filter((e) => e.classId !== classId),
    pickedStudentIds: picked,
    jars,
  };
  persist();
}

export function addStudent(classId: string, name: string, avatar: string): Student {
  const student: Student = {
    id: id(),
    classId,
    name: name.trim(),
    avatar,
    createdAt: Date.now(),
  };
  state = { ...state, students: [...state.students, student] };
  persist();
  return student;
}

export function updateStudent(studentId: string, patch: Partial<Pick<Student, "name" | "avatar">>) {
  state = {
    ...state,
    students: state.students.map((s) => (s.id === studentId ? { ...s, ...patch } : s)),
  };
  persist();
}

export function removeStudent(studentId: string) {
  state = {
    ...state,
    students: state.students.filter((s) => s.id !== studentId),
    events: state.events.filter((e) => e.studentId !== studentId),
    pickedStudentIds: Object.fromEntries(
      Object.entries(state.pickedStudentIds).map(([cls, ids]) => [cls, ids.filter((i) => i !== studentId)])
    ),
  };
  persist();
}

export interface AwardResult {
  events: PointEvent[];
  milestone: boolean;
  jarFull: boolean;
}

/**
 * Award a category's stars to one or more students. Milestone and Star Jar
 * crossings are computed here — once — so the teacher window (return value)
 * and any display windows (broadcast message) always agree.
 */
export function award(classId: string, studentIds: string[], categoryId: string): AwardResult {
  const category = getCategory(categoryId);
  const ts = Date.now();
  const beforeTotals = pointTotals(classId);

  const events: PointEvent[] = studentIds.map((studentId) => ({
    id: id(),
    classId,
    studentId,
    categoryId,
    delta: category.value,
    ts,
  }));

  const milestone = studentIds.some((sid) => {
    const before = beforeTotals.get(sid) ?? 0;
    return Math.floor((before + category.value) / MILESTONE_EVERY) > Math.floor(before / MILESTONE_EVERY);
  });

  state = { ...state, events: [...state.events, ...events] };

  // Star Jar: record parties as they are earned so changing the goal later
  // never rewrites history.
  const target = jarTargetOf(classId);
  const jar = jarOf(classId);
  const total = classTotal(classId);
  let jarFull = false;
  let { base, parties } = jar;
  while (total - base >= target) {
    jarFull = true;
    parties += 1;
    base += target;
  }
  if (jarFull) {
    state = { ...state, jars: { ...state.jars, [classId]: { base, parties } } };
  }

  persist({ type: "celebrate", classId, studentIds, categoryId, delta: category.value, milestone, jarFull });
  return { events, milestone, jarFull };
}

/** Manual correction (e.g. -1 for a mis-tap). Totals never drop below zero. */
export function adjustPoints(classId: string, studentId: string, delta: number) {
  const event: PointEvent = {
    id: id(),
    classId,
    studentId,
    categoryId: "adjust",
    delta,
    ts: Date.now(),
  };
  state = { ...state, events: [...state.events, event] };
  persist();
}

/**
 * Start fresh: zero every total, empty the jar, and compact the class's
 * event history (nothing reads pre-epoch events, and unbounded growth would
 * eventually blow the localStorage quota).
 */
export function resetPoints(classId: string) {
  const epoch = Date.now();
  state = {
    ...state,
    classes: state.classes.map((c) => (c.id === classId ? { ...c, pointsEpoch: epoch } : c)),
    events: state.events.filter((e) => e.classId !== classId || e.ts > epoch),
    jars: { ...state.jars, [classId]: { base: 0, parties: 0 } },
  };
  persist();
}

export function updateSettings(patch: Partial<Settings>) {
  state = { ...state, settings: { ...state.settings, ...patch } };
  persist();
}

/** Record a Star Picker pick; clears the list once everyone has had a turn. */
export function recordPick(classId: string, studentId: string) {
  const classStudentIds = new Set(state.students.filter((s) => s.classId === classId).map((s) => s.id));
  let picked = [...(state.pickedStudentIds[classId] ?? []).filter((i) => classStudentIds.has(i)), studentId];
  if (picked.length >= classStudentIds.size) picked = [];
  state = { ...state, pickedStudentIds: { ...state.pickedStudentIds, [classId]: picked } };
  persist();
}

export function resetPicks(classId: string) {
  state = { ...state, pickedStudentIds: { ...state.pickedStudentIds, [classId]: [] } };
  persist();
}

// --- Cloud sync (optional, activates when Firebase is configured) ------------

/**
 * Adopt a newer state from the cloud: persist locally without re-uploading.
 * Returns false when the remote payload is stale or invalid.
 */
export function adoptCloudState(json: string, remoteRev: number): boolean {
  if (!Number.isFinite(remoteRev) || remoteRev <= state.rev) return false;
  try {
    const next = normalizeState(JSON.parse(json));
    // Local defense: a cloud write can update board data, but it can never
    // remove or swap the password gate of a class this device already knows.
    // (There is no change-password flow, so a differing remote hash is never
    // legitimate.)
    const localHashes = new Map(
      state.classes.filter((c) => c.passwordHash).map((c) => [c.id, c.passwordHash!])
    );
    next.classes = next.classes.map((c) => {
      const local = localHashes.get(c.id);
      return local && c.passwordHash !== local ? { ...c, passwordHash: local } : c;
    });
    state = { ...next, rev: remoteRev };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      storageBroken = true;
    }
    channel?.postMessage({ type: "sync" });
    emit();
    return true;
  } catch {
    return false;
  }
}

if (typeof window !== "undefined" && import.meta.env.MODE !== "test") {
  // The Firebase SDK lives in a lazy chunk; nothing loads unless configured.
  void import("./cloud").then((m) => m.startCloudSync()).catch(() => {});
}

// --- Tests -------------------------------------------------------------------

/** Test-only: reset the in-memory store. */
export function __resetForTests() {
  localStorage.removeItem(STORAGE_KEY);
  state = defaultState();
  storageBroken = false;
  emit();
}
