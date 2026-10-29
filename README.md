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

The app is **local-only**: everything lives in the browser's localStorage. It works offline, never talks to a server, and the projector view updates live from the teacher window on the same device.

There is no cloud sync, no account, and no analytics. Student names and points never leave the device. To move a class, use the same browser profile; clearing site data removes the class.

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
