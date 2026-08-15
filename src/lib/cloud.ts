/**
 * Firestore sync adapter. Local-first: localStorage stays the source of truth
 * and the UI never waits on the network. This module mirrors every change to
 * a single Firestore document and adopts newer remote revisions, so the class
 * survives cleared browsers and follows the teacher across devices.
 *
 * Inactive (and the Firebase SDK never downloads) until firebaseConfig is set.
 */
import { firebaseConfig } from "./firebase-config";
import { adoptCloudState, getState, onPersist } from "./store";
import type { AppState } from "./types";

// Dev servers sync to their own document so local testing never touches the
// real classroom's data.
const BOARD_DOC = import.meta.env.DEV ? "dev" : "main";
const PUSH_DEBOUNCE_MS = 1200;

let syncStatus: "off" | "connecting" | "ok" | "error" = "off";
const statusListeners = new Set<(s: typeof syncStatus) => void>();

export function cloudStatus() {
  return syncStatus;
}

export function onCloudStatus(cb: (s: typeof syncStatus) => void): () => void {
  statusListeners.add(cb);
  return () => statusListeners.delete(cb);
}

function setStatus(s: typeof syncStatus) {
  if (syncStatus === s) return;
  syncStatus = s;
  statusListeners.forEach((cb) => cb(s));
}

export async function startCloudSync(): Promise<void> {
  if (!firebaseConfig) return;
  setStatus("connecting");

  try {
    const { initializeApp } = await import("firebase/app");
    const { initializeFirestore, persistentLocalCache, doc, onSnapshot, setDoc, serverTimestamp } =
      await import("firebase/firestore");

    const app = initializeApp(firebaseConfig);
    const db = initializeFirestore(
      app,
      { localCache: persistentLocalCache() },
      firebaseConfig.databaseId
    );
    const boardRef = doc(db, "boards", BOARD_DOC);

    let pushTimer: number | undefined;
    let lastPushedRev = -1;

    const push = (state: AppState) => {
      if (state.rev <= lastPushedRev) return;
      clearTimeout(pushTimer);
      pushTimer = window.setTimeout(() => {
        const current = getState();
        lastPushedRev = current.rev;
        setDoc(boardRef, {
          rev: current.rev,
          updatedAt: serverTimestamp(),
          data: JSON.stringify(current),
        }).then(
          () => setStatus("ok"),
          () => setStatus("error")
        );
      }, PUSH_DEBOUNCE_MS);
    };

    onSnapshot(
      boardRef,
      (snap) => {
        setStatus("ok");
        if (snap.metadata.hasPendingWrites) return; // our own write echoing back
        const remote = snap.data();
        if (!remote || typeof remote.data !== "string" || typeof remote.rev !== "number") {
          // Empty or foreign document: seed it with our state.
          push(getState());
          return;
        }
        if (remote.rev > getState().rev) {
          adoptCloudState(remote.data, remote.rev);
          lastPushedRev = remote.rev;
        } else if (remote.rev < getState().rev) {
          push(getState());
        }
      },
      () => setStatus("error")
    );

    onPersist(push);
  } catch {
    setStatus("error");
  }
}
