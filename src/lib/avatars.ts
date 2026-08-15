export const AVATARS = [
  "😀", "😎", "🤓", "🥳", "😺", "🦄", "🐶", "🐱", "🦊", "🦁",
  "🐯", "🐸", "🐵", "🐼", "🐨", "🐷", "🐙", "🐬", "🦋", "🐢",
  "🦖", "🦕", "🐲", "🚀", "🌈", "🍓", "🍕", "🍦", "🧁", "🎨",
  "🏀", "⚽", "🎸", "🪁", "🤖", "👻", "🧚", "🦩", "🐝", "🌻",
];

/** Stable pastel backdrop for a student's avatar sticker, derived from their id. */
export function avatarHue(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 360;
}
