/**
 * Firebase web config. The API key is a public client identifier, not a secret:
 * access is controlled by the Firestore rules and by the encrypted sync payload.
 *
 * The key comes from `.env.local` locally and from the repository secret
 * VITE_FIREBASE_API_KEY in GitHub Actions. Nothing is committed.
 */
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;

export const firebaseConfig = apiKey
  ? ({
      apiKey,
      authDomain: "star-catcher-e23bf.firebaseapp.com",
      projectId: "star-catcher-e23bf",
      storageBucket: "star-catcher-e23bf.firebasestorage.app",
      messagingSenderId: "778408800098",
      appId: "1:778408800098:web:7ec24408fc6bc05cd3c63b",
      databaseId: "starcatcher",
    } as const)
  : null;
