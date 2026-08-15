import { useCallback, useEffect, useRef, useState } from "react";
import { playFanfare, playStomp } from "../lib/audio";
import { partyRain } from "../lib/celebrate";
import { getState } from "../lib/store";
import { KONAMI, TREX, useSecretCode } from "../hooks/useSecretCode";

const TREX_DURATION_MS = 14000;

/**
 * Hidden fun, for those who know:
 *  - type "trex"      → a T-Rex stomps across the board (with the theme song)
 *  - Konami code      → 10 seconds of Party Mode
 */
export function useEasterEggs() {
  const [trexOn, setTrexOn] = useState(false);
  const [partyOn, setPartyOn] = useState(false);
  const trexAudio = useRef<HTMLAudioElement | null>(null);
  const stopParty = useRef<() => void>(() => {});

  const startTrex = useCallback(() => {
    if (trexOn) return;
    setTrexOn(true);
    playStomp();
    if (getState().settings.soundOn) {
      const audio = new Audio(`${import.meta.env.BASE_URL}trex-theme.mp3`);
      audio.volume = 0.5;
      trexAudio.current = audio;
      void audio.play().catch(() => {});
    }
    window.setTimeout(() => {
      setTrexOn(false);
      trexAudio.current?.pause();
      trexAudio.current = null;
    }, TREX_DURATION_MS);
  }, [trexOn]);

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

  return { trexOn, partyOn };
}

export function EggOverlays({ trexOn, partyOn }: { trexOn: boolean; partyOn: boolean }) {
  return (
    <>
      {trexOn && (
        <img className="trex" src={`${import.meta.env.BASE_URL}trex.gif`} alt="" aria-hidden="true" />
      )}
      {partyOn && <div className="party-banner">🎉 PARTY MODE! 🎉</div>}
    </>
  );
}
