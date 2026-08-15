import confetti from "canvas-confetti";

const CRAYONS = ["#FFC531", "#4D9DE0", "#F26D9C", "#57B87B", "#8D6FD1", "#F49D37", "#2BB3A3"];

function reducedMotion(): boolean {
  return typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Small burst near an element — the everyday award feedback. */
export function burstAt(el: HTMLElement | null, color?: string) {
  if (reducedMotion()) return;
  let origin = { x: 0.5, y: 0.5 };
  if (el) {
    const rect = el.getBoundingClientRect();
    origin = {
      x: (rect.left + rect.width / 2) / window.innerWidth,
      y: (rect.top + rect.height / 2) / window.innerHeight,
    };
  }
  confetti({
    particleCount: 24,
    spread: 55,
    startVelocity: 22,
    gravity: 0.9,
    ticks: 90,
    scalar: 0.9,
    origin,
    colors: color ? [color, "#FFC531", "#FFFFFF"] : CRAYONS,
    disableForReducedMotion: true,
  });
}

/** Big two-sided celebration for milestones (every 10th star). */
export function milestoneBlast() {
  if (reducedMotion()) return;
  const opts = { particleCount: 80, spread: 70, startVelocity: 45, colors: CRAYONS, disableForReducedMotion: true };
  confetti({ ...opts, angle: 60, origin: { x: 0, y: 0.7 } });
  confetti({ ...opts, angle: 120, origin: { x: 1, y: 0.7 } });
}

/** Golden star rain for the full Star Jar / class party. */
export function starRain(durationMs = 2600) {
  if (reducedMotion()) return;
  const end = Date.now() + durationMs;
  const star = confetti.shapeFromText ? [confetti.shapeFromText({ text: "⭐", scalar: 2 })] : undefined;
  const frame = () => {
    confetti({
      particleCount: 4,
      startVelocity: 8,
      gravity: 0.6,
      spread: 120,
      ticks: 200,
      origin: { x: Math.random(), y: -0.05 },
      shapes: star,
      scalar: star ? 2 : 1.2,
      colors: ["#FFC531", "#F5A623", "#FFE08A"],
      disableForReducedMotion: true,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}

/** Steady rainbow rain for Party Mode. */
export function partyRain(durationMs = 8000): () => void {
  if (reducedMotion()) return () => {};
  const end = Date.now() + durationMs;
  let stopped = false;
  const frame = () => {
    if (stopped) return;
    confetti({
      particleCount: 6,
      startVelocity: 12,
      gravity: 0.8,
      spread: 100,
      ticks: 150,
      origin: { x: Math.random(), y: -0.05 },
      colors: CRAYONS,
      disableForReducedMotion: true,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
  return () => {
    stopped = true;
  };
}
