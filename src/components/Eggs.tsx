import { useCallback, useEffect, useRef, useState } from "react";
import { playFanfare } from "../lib/audio";
import { partyRain } from "../lib/celebrate";
import { getState } from "../lib/store";
import { KONAMI, TREX, useSecretCode } from "../hooks/useSecretCode";

const TREX_GIF_DURATION_MS = 14000;

/**
 * Hidden fun, for those who know:
 *  - type "trex"      → a T-Rex breaks through the screen, roaring (3D);
 *                       reduced-motion users get the classic stroll instead
 *  - Konami code      → 10 seconds of Party Mode
 */
export function useEasterEggs() {
  const [trexGifOn, setTrexGifOn] = useState(false);
  const [partyOn, setPartyOn] = useState(false);
  const trexBusy = useRef(false);
  const trexAudio = useRef<HTMLAudioElement | null>(null);
  const stopParty = useRef<() => void>(() => {});

  const startTrex = useCallback(() => {
    if (trexBusy.current) return;
    trexBusy.current = true;

    // Start the theme synchronously, inside the keypress gesture, so the
    // browser's autoplay policy can never block it.
    let theme: HTMLAudioElement | null = null;
    if (getState().settings.soundOn) {
      theme = new Audio(`${import.meta.env.BASE_URL}trex-theme.mp3`);
      theme.volume = 0.75;
      trexAudio.current = theme;
      void theme.play().catch(() => {});
    }

    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Gentler version: the classic stroll, no screen shaking.
      setTrexGifOn(true);
      window.setTimeout(() => {
        setTrexGifOn(false);
        theme?.pause();
        trexBusy.current = false;
      }, TREX_GIF_DURATION_MS);
      return;
    }

    import("../lib/trexScene")
      .then((m) => m.playTrexBreakout(theme))
      .catch(() => theme?.pause())
      .finally(() => {
        // The scene fades the theme itself; just release the trigger.
        window.setTimeout(() => {
          trexBusy.current = false;
        }, 1000);
      });
  }, []);

  const startParty = useCallback(() => {
    if (partyOn) return;
    setPartyOn(true);
    playFanfare();
    stopParty.current = partyRain(10000);
    window.setTimeout(() => setPartyOn(false), 10000);
  }, [partyOn]);

  useSecretCode(TREX, startTrex);
  useSecretCode(KONAMI, startParty);

  useEffect(() => {
    return () => {
      trexAudio.current?.pause();
      stopParty.current();
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("party-mode", partyOn);
    return () => document.body.classList.remove("party-mode");
  }, [partyOn]);

  return { trexGifOn, partyOn };
}

export function EggOverlays({ trexGifOn, partyOn }: { trexGifOn: boolean; partyOn: boolean }) {
  return (
    <>
      {trexGifOn && (
        <img className="trex" src={`${import.meta.env.BASE_URL}trex.gif`} alt="" aria-hidden="true" />
      )}
      {partyOn && <div className="party-banner">🎉 PARTY MODE! 🎉</div>}
    </>
  );
}
