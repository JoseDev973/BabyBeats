"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./landing.module.css";

const EVENT = "newweb:play";

type Props = {
  src: string;
  title: string;
  playLabel: string;
  pauseLabel: string;
  variant?: "hero" | "inline";
  eyebrow?: string;
};

function fmt(s: number) {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

// Fixed bar heights so server and client render the same waveform
const BARS = [6, 10, 16, 12, 20, 14, 9, 18, 24, 15, 11, 19, 26, 17, 10, 14, 22, 13, 8, 16, 21, 12, 9, 15, 19, 11, 7, 13, 17, 10];

export default function DemoPlayer({ src, title, playLabel, pauseLabel, variant = "inline", eyebrow }: Props) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Only one demo plays at a time
  useEffect(() => {
    const onOther = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== src) audio.current?.pause();
    };
    window.addEventListener(EVENT, onOther);
    return () => window.removeEventListener(EVENT, onOther);
  }, [src]);

  function toggle() {
    const a = audio.current;
    if (!a) return;
    if (a.paused) {
      window.dispatchEvent(new CustomEvent(EVENT, { detail: src }));
      void a.play();
    } else {
      a.pause();
    }
  }

  const progress = duration ? time / duration : 0;

  return (
    <div className={variant === "hero" ? styles.playerHero : styles.player}>
      <audio
        ref={audio}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />
      <button
        type="button"
        className={styles.playButton}
        onClick={toggle}
        aria-label={`${playing ? pauseLabel : playLabel}: ${title}`}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" /></svg>
        )}
      </button>
      <div className={styles.playerBody}>
        {eyebrow && <span className={styles.playerEyebrow}>{eyebrow}</span>}
        <span className={styles.playerTitle}>{title}</span>
        <div className={styles.wave} aria-hidden="true">
          {BARS.map((h, i) => (
            <span
              key={i}
              style={{ height: `${h}px` }}
              className={i / BARS.length < progress ? styles.barOn : undefined}
            />
          ))}
        </div>
        <span className={styles.playerTime}>
          {duration ? `${fmt(time)} / ${fmt(duration)}` : "\u00a0"}
        </span>
      </div>
    </div>
  );
}
