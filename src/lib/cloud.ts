import type { FirebaseApp } from "firebase/app";
import type { DocumentReference, Firestore, Unsubscribe } from "firebase/firestore";
import { firebaseConfig } from "./firebase-config";
import { adoptSyncedState, getState, onPersist } from "./store";
import {
  decryptState,
  encryptState,
  newSyncCode,
  normalizeSyncCode,
  syncDocId,
} from "./sync-crypto";

const SYNC_CODE_KEY = "star-catcher-sync-code";
const PUSH_DEBOUNCE_MS = 1200;

export type CloudStatus = "off" | "connecting" | "ok" | "error";

export const cloudEnabled = firebaseConfig !== null;

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let boardRef: DocumentReference | null = null;
let unsubscribe: Unsubscribe | null = null;
let unsubscribePersist: (() => void) | null = null;
let pushTimer: ReturnType<typeof setTimeout> | undefined;
let lastPushedRev = -1;
let status: CloudStatus = "off";
let syncCode: string | null = null;
let initialized = false;

const listeners = new Set<() => void>();
const statusListeners = new Set<(s: CloudStatus) => void>();

function emit() {
  listeners.forEach((cb) => cb());
}

function setStatus(next: CloudStatus) {
  status = next;
  statusListeners.forEach((cb) => cb(next));
  emit();
}

export function getCloudStatus(): CloudStatus {
  return status;
}

export function getSyncCode(): string | null {
  return syncCode;
}

/** Subscribe to any sync-state change (code, status, or last error). */
export function subscribeCloud(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function onCloudStatus(cb: (s: CloudStatus) => void): () => void {
  statusListeners.add(cb);
  return () => statusListeners.delete(cb);
}

async function getDb(): Promise<Firestore> {
  if (!firebaseConfig) throw new Error("Cloud sync is not configured");
  if (db) return db;
  const { getApps, initializeApp } = await import("firebase/app");
  const { initializeFirestore, persistentLocalCache } = await import("firebase/firestore");
  app = getApps()[0] ?? initializeApp(firebaseConfig);
  db = initializeFirestore(app, { localCache: persistentLocalCache() }, firebaseConfig.databaseId);
  return db;
}

function stopSync() {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = undefined;
  unsubscribe?.();
  unsubscribe = null;
  unsubscribePersist?.();
  unsubscribePersist = null;
  boardRef = null;
  lastPushedRev = -1;
}

async function startSync(code: string) {
  stopSync();
  syncCode = code;
  setStatus("connecting");

  try {
    const [documentId, database] = await Promise.all([syncDocId(code), getDb()]);
    const { doc, onSnapshot, setDoc, serverTimestamp } = await import("firebase/firestore");
    boardRef = doc(database, "boards", documentId);

    const push = (state = getState()) => {
      if (!boardRef || state.rev <= lastPushedRev) return;
      if (pushTimer) clearTimeout(pushTimer);
      pushTimer = setTimeout(async () => {
        try {
          const current = getState();
          const encrypted = await encryptState(JSON.stringify(current), code);
          await setDoc(boardRef!, {
            rev: current.rev,
            iv: encrypted.iv,
            ciphertext: encrypted.ciphertext,
            updatedAt: serverTimestamp(),
          });
          lastPushedRev = current.rev;
          setStatus("ok");
        } catch {
          setStatus("error");
        }
      }, PUSH_DEBOUNCE_MS);
    };

    unsubscribe = onSnapshot(
      boardRef,
      (snapshot) => {
        if (snapshot.metadata.hasPendingWrites) return;
        const remote = snapshot.data();
        if (!remote) {
          push();
          return;
        }
        if (
          typeof remote.rev !== "number" ||
          typeof remote.iv !== "string" ||
          typeof remote.ciphertext !== "string"
        ) {
          setStatus("error");
          return;
        }
        decryptState({ iv: remote.iv, ciphertext: remote.ciphertext }, code)
          .then((json) => {
            if (adoptSyncedState(json, remote.rev)) {
              lastPushedRev = remote.rev;
              setStatus("ok");
            } else if (getState().rev > remote.rev) {
              push();
            } else {
              setStatus("ok");
            }
          })
          .catch(() => setStatus("error"));
      },
      () => setStatus("error")
    );

    unsubscribePersist = onPersist(push);
    emit();
  } catch {
    setStatus("error");
  }
}

/** Restore a saved sync code and connect automatically. */
export async function initCloud(): Promise<void> {
  if (!cloudEnabled || initialized) return;
  initialized = true;
  syncCode = localStorage.getItem(SYNC_CODE_KEY);
  if (syncCode && normalizeSyncCode(syncCode)) {
    await startSync(syncCode);
  }
}

/** Create a new capability code and upload the current state encrypted. */
export async function createSyncCode(): Promise<string> {
  const code = newSyncCode();
  localStorage.setItem(SYNC_CODE_KEY, code);
  await startSync(code);
  return code;
}

/** Connect this device to an existing encrypted board. */
export async function connectSyncCode(raw: string): Promise<void> {
  const code = normalizeSyncCode(raw);
  if (!code) throw new Error("That sync code is not valid.");
  localStorage.setItem(SYNC_CODE_KEY, code);
  await startSync(code);
}

/** Stop syncing on this device. Data stays local and in the cloud. */
export function disconnectSync(): void {
  stopSync();
  syncCode = null;
  localStorage.removeItem(SYNC_CODE_KEY);
  setStatus("off");
  emit();
}
