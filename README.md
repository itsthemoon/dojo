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

The app is **local-first**: everything lives in the browser's localStorage, so the projector view keeps working offline and on the same device.

**Cloud sync is optional.** When you turn it on, this device creates a random 256-bit sync code. The class state is encrypted in the browser with AES-GCM before it is written to Firebase; Firestore only receives ciphertext, an IV, and a revision number. The document ID is derived from the sync code, and the database does not allow listing.

To connect another device, enter the same sync code there. The code is a capability: anyone who has it can read and change the class data, so keep it private. There are no accounts, no email addresses, and no analytics. The Firebase web API key is a public client identifier; access control is the encrypted payload and the Firestore rules, not the key.

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

Pushing to `main` builds and publishes `dist/` to the `gh-pages` branch via GitHub Actions (`.github/workflows/deploy.yml`). The workflow reads `VITE_FIREBASE_API_KEY` from the repository secret of the same name; without it the app builds in local-only mode. No key is committed.
