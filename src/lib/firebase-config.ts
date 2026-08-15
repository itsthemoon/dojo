/**
 * Optional cloud backup/sync via Firebase Firestore.
 *
 * While this is null the app is purely local (localStorage only). To turn on
 * cloud sync, create a free Firebase project and paste its web-app config
 * here — these values are public identifiers, safe to commit:
 *
 *   export const firebaseConfig = {
 *     apiKey: "AIza...",
 *     authDomain: "your-project.firebaseapp.com",
 *     projectId: "your-project",
 *     storageBucket: "your-project.firebasestorage.app",
 *     messagingSenderId: "1234567890",
 *     appId: "1:1234567890:web:abc123",
 *   } as const;
 *
 * Setup (one time, ~3 minutes) — see README "Cloud sync" for the click-path
 * and the Firestore security rules to paste.
 */
export const firebaseConfig: {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  /** Firestore database ID — omit when using the "(default)" database. */
  databaseId?: string;
} | null = {
  apiKey: "AIzaSyAliThYyRWR5i1rnNguAImIKN-rVhMkdcI",
  authDomain: "star-catcher-e23bf.firebaseapp.com",
  projectId: "star-catcher-e23bf",
  storageBucket: "star-catcher-e23bf.firebasestorage.app",
  messagingSenderId: "778408800098",
  appId: "1:778408800098:web:7ec24408fc6bc05cd3c63b",
  databaseId: "starcatcher",
};
