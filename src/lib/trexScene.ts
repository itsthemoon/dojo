/**
 * The T-Rex easter egg: the paper "screen" rumbles, cracks, and shatters
 * Looney-Tunes style, and a 3D T-Rex (Quaternius, CC0) lunges out roaring.
 * Loaded lazily — three.js only downloads when someone types the magic word.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { playCrack, playCrash, playRoar, playStomp } from "./audio";

const TOTAL_MS = 13500;

interface Token {
  cancelled: boolean;
}

function wait(ms: number, token: Token): Promise<void> {
  return new Promise((resolve) => {
    const id = window.setTimeout(resolve, ms);
    const check = window.setInterval(() => {
      if (token.cancelled) {
        clearTimeout(id);
        clearInterval(check);
        resolve();
      }
    }, 50);
    window.setTimeout(() => clearInterval(check), ms + 60);
  });
}

/** Jagged radial polygon (as clip-path string) for the hole in the screen. */
function jaggedPolygon(points = 22, irregularity = 0.22): string {
  const pts: string[] = [];
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const radius = 50 * (1 - irregularity + Math.random() * irregularity * 2);
    pts.push(`${50 + Math.cos(angle) * radius}% ${50 + Math.sin(angle) * radius}%`);
  }
  return `polygon(${pts.join(",")})`;
}

function makeCracksSvg(cx: number, cy: number): { svg: SVGSVGElement; groups: SVGPathElement[][] } {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "trex-cracks");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  const groups: SVGPathElement[][] = [[], [], []];
  const rays = 11;
  for (let i = 0; i < rays; i++) {
    const angle = (i / rays) * Math.PI * 2 + Math.random() * 0.4;
    const maxLen = Math.min(window.innerWidth, window.innerHeight) * (0.28 + Math.random() * 0.3);
    let x = cx;
    let y = cy;
    let d = `M ${x} ${y}`;
    const segments = 5 + Math.floor(Math.random() * 3);
    for (let s = 1; s <= segments; s++) {
      const dist = (maxLen / segments) * s;
      x = cx + Math.cos(angle) * dist + (Math.random() - 0.5) * 26;
      y = cy + Math.sin(angle) * dist + (Math.random() - 0.5) * 26;
      d += ` L ${x} ${y}`;
    }
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    groups[i % 3].push(path);
    svg.appendChild(path);
  }
  return { svg, groups };
}

function spawnShards(stage: HTMLElement, cx: number, cy: number) {
  const count = 16;
  for (let i = 0; i < count; i++) {
    const shard = document.createElement("div");
    shard.className = "trex-shard";
    const size = 40 + Math.random() * 110;
    shard.style.width = `${size}px`;
    shard.style.height = `${size}px`;
    shard.style.left = `${cx - size / 2}px`;
    shard.style.top = `${cy - size / 2}px`;
    shard.style.clipPath = jaggedPolygon(5 + Math.floor(Math.random() * 3), 0.4);
    stage.appendChild(shard);

    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const fling = 220 + Math.random() * 380;
    const dx = Math.cos(angle) * fling;
    const dy = Math.sin(angle) * fling;
    shard.animate(
      [
        { transform: "translate(0, 0) rotate(0deg)", opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) rotate(${(Math.random() - 0.5) * 300}deg)`, opacity: 1, offset: 0.45 },
        {
          transform: `translate(${dx * 1.3}px, ${dy + window.innerHeight}px) rotate(${(Math.random() - 0.5) * 720}deg)`,
          opacity: 0.9,
        },
      ],
      { duration: 1500 + Math.random() * 600, easing: "cubic-bezier(0.2, 0.6, 0.4, 1)", fill: "forwards" }
    ).onfinish = () => shard.remove();
  }
}

export async function playTrexBreakout(theme: HTMLAudioElement | null): Promise<void> {
  const token: Token = { cancelled: false };
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight * 0.45;

  // --- DOM scaffolding --------------------------------------------------
  const stage = document.createElement("div");
  stage.className = "trex-stage";
  const hole = document.createElement("div");
  hole.className = "trex-hole";
  hole.style.clipPath = jaggedPolygon();
  const { svg, groups } = makeCracksSvg(cx, cy);
  const hint = document.createElement("div");
  hint.className = "trex-hint";
  hint.textContent = "Click to chase it away";
  stage.append(hole, svg, hint);
  document.body.appendChild(stage);
  document.body.classList.add("trex-rumble");

  let renderer: THREE.WebGLRenderer | null = null;
  let raf = 0;

  const fadeOutTheme = () => {
    if (!theme) return;
    const fade = window.setInterval(() => {
      theme.volume = Math.max(0, theme.volume - 0.08);
      if (theme.volume <= 0) {
        theme.pause();
        clearInterval(fade);
      }
    }, 90);
  };

  const cleanup = () => {
    if (token.cancelled) return;
    token.cancelled = true;
    cancelAnimationFrame(raf);
    document.body.classList.remove("trex-rumble", "trex-rumble--hard");
    window.removeEventListener("keydown", onKey);
    stage.removeEventListener("click", cleanup);
    fadeOutTheme();
    stage.classList.add("trex-stage--out");
    window.setTimeout(() => {
      renderer?.dispose();
      stage.remove();
    }, 450);
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") cleanup();
  };
  window.addEventListener("keydown", onKey);
  stage.addEventListener("click", cleanup);
  window.setTimeout(cleanup, TOTAL_MS);

  // --- Act 1: rumble and cracks ------------------------------------------
  playStomp(0.7);
  await wait(600, token);
  playStomp(1);
  groups[0].forEach((p) => p.classList.add("visible"));
  playCrack();
  await wait(600, token);
  playStomp(1.4);
  groups[1].forEach((p) => p.classList.add("visible"));
  playCrack();
  document.body.classList.add("trex-rumble--hard");
  await wait(600, token);
  playStomp(1.8);
  groups[2].forEach((p) => p.classList.add("visible"));
  playCrack();
  await wait(400, token);
  if (token.cancelled) return;

  // --- Act 2: the screen gives way ----------------------------------------
  playCrash();
  svg.remove();
  hole.classList.add("visible");
  spawnShards(stage, cx, cy);

  // --- Act 3: the T-Rex ----------------------------------------------------
  try {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 60);
    camera.position.set(0, 1.4, 6);

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.className = "trex-canvas";
    stage.insertBefore(renderer.domElement, hint);

    // Bright, warm stage lighting — the hole behind it is dark, so the
    // T-Rex needs to be lit like the star of the show.
    scene.add(new THREE.HemisphereLight(0xfff3dd, 0x5a6398, 2.4));
    const key = new THREE.DirectionalLight(0xffffff, 3.2);
    key.position.set(2, 4, 5);
    scene.add(key);
    const fill = new THREE.PointLight(0xffe9c4, 50, 30);
    fill.position.set(0, 2.2, 4);
    scene.add(fill);

    const gltf = await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}trex.glb`);
    if (token.cancelled) return;
    const trex = gltf.scene;

    // Normalize size and put the feet on the "floor" of the hole.
    const box = new THREE.Box3().setFromObject(trex);
    const height = box.max.y - box.min.y;
    const scale = 3.4 / height;
    trex.scale.setScalar(scale);
    box.setFromObject(trex);
    trex.position.y = -1.9 - box.min.y;
    trex.position.z = -16;
    scene.add(trex);

    const mixer = new THREE.AnimationMixer(trex);
    const clip = (name: string) => gltf.animations.find((a) => a.name.includes(name));
    const play = (name: string, loop = true) => {
      const c = clip(name);
      if (!c) return;
      mixer.stopAllAction();
      const action = mixer.clipAction(c);
      action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
      action.clampWhenFinished = !loop;
      action.play();
    };

    let targetZ = -2.6;
    let shake = 0;
    let last = performance.now();
    let elapsed = 0;
    const animate = () => {
      if (token.cancelled) return;
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      elapsed += dt;
      mixer.update(dt);
      trex.position.z += (targetZ - trex.position.z) * Math.min(1, dt * 2.4);
      trex.rotation.y = Math.sin(elapsed * 0.7) * 0.12;
      shake = Math.max(0, shake - dt * 2);
      camera.position.x = (Math.random() - 0.5) * shake;
      camera.position.y = 1.4 + (Math.random() - 0.5) * shake;
      renderer!.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };

    // Charge out of the hole, then roar.
    play("Run");
    animate();
    await wait(900, token);
    play("Attack");
    playRoar();
    shake = 0.5;
    await wait(2300, token);
    play("Idle");
    await wait(1600, token);
    play("Attack");
    playRoar();
    shake = 0.5;
    await wait(2300, token);
    if (token.cancelled) return;

    // Back into the hole it goes.
    play("Run");
    targetZ = -18;
    await wait(1400, token);
    if (token.cancelled) return;
    renderer.domElement.classList.add("trex-canvas--out");
    hole.classList.add("patched");

    // Patch the screen with a giant sticker.
    const bandaid = document.createElement("div");
    bandaid.className = "trex-bandaid";
    bandaid.textContent = "🩹";
    bandaid.style.left = `${cx}px`;
    bandaid.style.top = `${cy}px`;
    stage.appendChild(bandaid);
    playStomp(0.6);
    document.body.classList.remove("trex-rumble--hard");
  } catch (err) {
    // Model or WebGL failed — end gracefully; the rumble was still fun.
    console.warn("T-Rex breakout ended early:", err);
    cleanup();
  }
}
