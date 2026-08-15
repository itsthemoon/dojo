// All feedback sounds are synthesized with the Web Audio API so the app has
// no runtime dependency on external sound CDNs.
import { getState } from "./store";

let ctx: AudioContext | null = null;

function audioCtx(): AudioContext | null {
  if (typeof AudioContext === "undefined") return null;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(
  ac: AudioContext,
  {
    freq,
    start,
    duration,
    type = "sine",
    gain = 0.12,
  }: { freq: number; start: number; duration: number; type?: OscillatorType; gain?: number }
) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, ac.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, ac.currentTime + start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + duration);
  osc.connect(g).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + duration + 0.05);
}

function enabled(): boolean {
  return getState().settings.soundOn;
}

/** Two-note sparkle when a star is awarded. */
export function playChime() {
  if (!enabled()) return;
  const ac = audioCtx();
  if (!ac) return;
  tone(ac, { freq: 1318.5, start: 0, duration: 0.18 }); // E6
  tone(ac, { freq: 1975.5, start: 0.08, duration: 0.28 }); // B6
  tone(ac, { freq: 2637, start: 0.08, duration: 0.22, type: "triangle", gain: 0.05 }); // E7 shimmer
}

/** Rising arpeggio for milestones and the full Star Jar. */
export function playFanfare() {
  if (!enabled()) return;
  const ac = audioCtx();
  if (!ac) return;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  notes.forEach((freq, i) => {
    tone(ac, { freq, start: i * 0.09, duration: 0.35, gain: 0.11 });
    tone(ac, { freq: freq * 2, start: i * 0.09, duration: 0.3, type: "triangle", gain: 0.04 });
  });
  tone(ac, { freq: 1568, start: 0.42, duration: 0.6, gain: 0.1 }); // G6 finish
}

/** Short woodblock tick for the Star Picker reel. */
export function playTick() {
  if (!enabled()) return;
  const ac = audioCtx();
  if (!ac) return;
  tone(ac, { freq: 880, start: 0, duration: 0.045, type: "square", gain: 0.035 });
}

/** Ta-da when the Star Picker lands. */
export function playTada() {
  if (!enabled()) return;
  const ac = audioCtx();
  if (!ac) return;
  tone(ac, { freq: 783.99, start: 0, duration: 0.16, gain: 0.11 }); // G5
  tone(ac, { freq: 1046.5, start: 0.12, duration: 0.5, gain: 0.12 }); // C6
  tone(ac, { freq: 1318.5, start: 0.12, duration: 0.45, type: "triangle", gain: 0.05 });
}

/** Low stomp for T-Rex mode. */
export function playStomp() {
  if (!enabled()) return;
  const ac = audioCtx();
  if (!ac) return;
  tone(ac, { freq: 70, start: 0, duration: 0.25, type: "sine", gain: 0.25 });
  tone(ac, { freq: 45, start: 0.02, duration: 0.3, type: "triangle", gain: 0.2 });
}
