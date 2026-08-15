export interface Classroom {
  id: string;
  name: string;
  teacher: string;
  emoji: string;
  /** Only events after this timestamp count toward totals ("Start fresh"). */
  pointsEpoch: number;
  /** Class points needed to fill the Star Jar once (falls back to settings.starJarTarget). */
  starJarTarget?: number;
  /** PBKDF2 hash gating the teacher board (the class view stays open). No reset flow. */
  passwordHash?: string;
  createdAt: number;
}

export interface Student {
  id: string;
  classId: string;
  name: string;
  avatar: string;
  createdAt: number;
}

export interface PointEvent {
  id: string;
  classId: string;
  studentId: string;
  /** A category id, or "adjust" for manual +/- corrections. */
  categoryId: string;
  delta: number;
  ts: number;
}

/** Star Jar bookkeeping: parties are recorded when earned, not re-derived. */
export interface JarRecord {
  /** Class total at which the current jar round started. */
  base: number;
  /** Class parties earned so far. */
  parties: number;
}

export interface Settings {
  soundOn: boolean;
  /** Default Star Jar goal for classes without their own. */
  starJarTarget: number;
}

export interface AppState {
  version: 2;
  /** Monotonic revision, used for cloud sync conflict resolution. */
  rev: number;
  classes: Classroom[];
  students: Student[];
  events: PointEvent[];
  /** Students already chosen by the Star Picker, per class (cleared when everyone has had a turn). */
  pickedStudentIds: Record<string, string[]>;
  /** Star Jar state per class. */
  jars: Record<string, JarRecord>;
  settings: Settings;
}
