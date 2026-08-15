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
export function playStomp(intensity = 1) {
  if (!enabled()) return;
  const ac = audioCtx();
  if (!ac) return;
  tone(ac, { freq: 70, start: 0, duration: 0.25, type: "sine", gain: 0.25 * intensity });
  tone(ac, { freq: 45, start: 0.02, duration: 0.35, type: "triangle", gain: 0.22 * intensity });
  noiseBurst(ac, { start: 0, duration: 0.08, filterFreq: 220, filterType: "lowpass", gain: 0.12 * intensity });
}

function noiseBurst(
  ac: AudioContext,
  {
    start,
    duration,
    filterFreq,
    filterType = "bandpass",
    gain = 0.2,
    filterSweepTo,
  }: {
    start: number;
    duration: number;
    filterFreq: number;
    filterType?: BiquadFilterType;
    gain?: number;
    filterSweepTo?: number;
  }
) {
  const length = Math.ceil(ac.sampleRate * duration);
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.setValueAtTime(filterFreq, ac.currentTime + start);
  if (filterSweepTo) {
    filter.frequency.exponentialRampToValueAtTime(filterSweepTo, ac.currentTime + start + duration);
  }
  const g = ac.createGain();
  g.gain.setValueAtTime(0, ac.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, ac.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + duration);
  src.connect(filter).connect(g).connect(ac.destination);
  src.start(ac.currentTime + start);
  src.stop(ac.currentTime + start + duration + 0.05);
}

/** Sharp snap for a crack spidering across the screen. */
export function playCrack() {
  if (!enabled()) return;
  const ac = audioCtx();
  if (!ac) return;
  noiseBurst(ac, { start: 0, duration: 0.09, filterFreq: 2600, filterType: "highpass", gain: 0.22 });
  tone(ac, { freq: 1900, start: 0, duration: 0.06, type: "square", gain: 0.05 });
}

/** The screen giving way. */
export function playCrash() {
  if (!enabled()) return;
  const ac = audioCtx();
  if (!ac) return;
  noiseBurst(ac, { start: 0, duration: 0.7, filterFreq: 3200, filterType: "lowpass", filterSweepTo: 300, gain: 0.4 });
  tone(ac, { freq: 60, start: 0, duration: 0.5, type: "sine", gain: 0.35 });
  tone(ac, { freq: 42, start: 0.05, duration: 0.7, type: "triangle", gain: 0.3 });
}

/** A big, grungy dinosaur roar (layered synth — no sample needed). */
export function playRoar() {
  if (!enabled()) return;
  const ac = audioCtx();
  if (!ac) return;
  const now = ac.currentTime;
  const dur = 1.9;

  // Distortion for grit
  const shaper = ac.createWaveShaper();
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const x = (i / 128) - 1;
    curve[i] = Math.tanh(3.5 * x);
  }
  shaper.curve = curve;

  const master = ac.createGain();
  master.gain.setValueAtTime(0, now);
  master.gain.linearRampToValueAtTime(0.5, now + 0.12);
  master.gain.setValueAtTime(0.5, now + dur * 0.6);
  master.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  shaper.connect(master).connect(ac.destination);

  // Sub growl sweeping down
  const sub = ac.createOscillator();
  sub.type = "sawtooth";
  sub.frequency.setValueAtTime(85, now);
  sub.frequency.exponentialRampToValueAtTime(32, now + dur);
  const subGain = ac.createGain();
  subGain.gain.value = 0.5;
  sub.connect(subGain).connect(shaper);
  sub.start(now);
  sub.stop(now + dur);

  // Second voice a fifth up, slightly detuned, with vibrato
  const voice = ac.createOscillator();
  voice.type = "sawtooth";
  voice.frequency.setValueAtTime(130, now);
  voice.frequency.exponentialRampToValueAtTime(48, now + dur);
  const vib = ac.createOscillator();
  vib.frequency.value = 11;
  const vibGain = ac.createGain();
  vibGain.gain.value = 9;
  vib.connect(vibGain).connect(voice.frequency);
  const voiceGain = ac.createGain();
  voiceGain.gain.value = 0.28;
  voice.connect(voiceGain).connect(shaper);
  vib.start(now);
  voice.start(now);
  vib.stop(now + dur);
  voice.stop(now + dur);

  // Breathy noise layer through a sweeping bandpass
  const length = Math.ceil(ac.sampleRate * dur);
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  const noise = ac.createBufferSource();
  noise.buffer = buffer;
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 0.8;
  bp.frequency.setValueAtTime(900, now);
  bp.frequency.exponentialRampToValueAtTime(180, now + dur);
  const noiseGain = ac.createGain();
  noiseGain.gain.value = 0.35;
  noise.connect(bp).connect(noiseGain).connect(shaper);
  noise.start(now);
  noise.stop(now + dur);
}
