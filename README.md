# Star Catcher ⭐

A classroom points board for young learners — catch your students being awesome.

Live at **https://itsthemoon.github.io/dojo/**

## What it does

- **Star categories** — every star is given *for something*: Cleaning Up Nicely 🧹, Superstar Sitting 🧘, Heggerty Hero 🦸, Following Directions 🧭, Listening to the Teacher 👂, Being Kind 💗, Raising Our Hand 🙋, Making Good Choices 👍, Working Hard 💪, and Star Student 🌟 (worth +2). Each student's sheet shows their breakdown by category.
- **Fast awarding** — tap a student, tap a category. Select a few students or award the whole class at once.
- **Class Star Jar** — every star also fills a class-wide jar; a full jar earns a class party (with an appropriately dramatic celebration).
- **Star Picker** — a fair "who's next?" spinner for picking line leaders and helpers. Everyone gets a turn before anyone is picked twice.
- **Class view** — a read-only board for the projector (📺 in the header) that updates and celebrates live as stars are awarded from the teacher window.
- **Milestones** — every 10th star gets a bigger celebration.
- **Multiple classes**, per-student emoji stickers, and sounds you can mute.
- **Class passwords** — every class is created with a mandatory password that gates the teacher board (the read-only class view stays open). Passwords are PBKDF2-hashed, never stored in plain text, and there is deliberately **no reset flow** — keep it somewhere safe.

There are also a few secrets. Try typing a certain dinosaur's name, or the oldest cheat code there is. Clicking the class emoji five times is also worth someone's while.

## How data is stored

The app is **local-first**: everything lives in the browser's localStorage and the UI never waits on a network. It works offline and can never be "down". The projector view updates live from the teacher window on the same device.

On top of that, **cloud sync** mirrors every change to a Firebase Firestore document, so the class survives cleared browsers and follows the teacher across devices — no manual backups needed.

> The previous version used a Supabase backend; its free-tier project was paused
> and deleted, which silently broke the live site. Firestore's free tier does not
> pause, and even without it the app now works forever, locally.

### Cloud sync setup (one time, ~3 minutes)

1. Go to https://console.firebase.google.com → **Create a project** (name it anything, e.g. `star-catcher`; Analytics off is fine).
2. In the project: **Build → Firestore Database → Create database** → Start in **production mode** → pick a US region.
3. Firestore → **Rules** tab → replace with the following and **Publish** (these do not expire, unlike test mode). `get/create/update` only — no `list` (documents can't be enumerated) and no `delete`:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /boards/{board} {
         allow get, create, update: if true;
       }
     }
   }
   ```

### Trust model (read this once)

There is no sign-in. Anyone who inspects this public site's source can technically reach the
Firestore document and edit board data — the same trust model as the original Supabase version.
The class password gates the *teacher UI* (kids at the smartboard, curious students), not the
network; a device that already knows a class's password will also refuse any cloud update that
tries to remove or change it. If real per-teacher accounts are ever needed, wire Firebase Auth
and scope documents to `request.auth.uid`.

4. Project settings (gear icon) → **Your apps** → Web (`</>`) → register an app (no hosting) → copy the `firebaseConfig` object.
5. Paste it into `src/lib/firebase-config.ts` (replacing `null`), commit, push. The config values are public identifiers — safe to commit.

While `firebaseConfig` is `null`, the Firebase SDK isn't even downloaded and the app is purely local.

## Development

```bash
npm install
npm run dev        # local dev server
npm test           # store/domain tests (vitest)
npm run typecheck  # tsc --noEmit
npm run build      # production build to dist/
```

Built with Vite, React, and TypeScript. No CSS framework — the design system lives in `src/styles/`.

## Deployment

Pushing to `main` builds and publishes `dist/` to the `gh-pages` branch via GitHub Actions (`.github/workflows/deploy.yml`). No secrets are required.
