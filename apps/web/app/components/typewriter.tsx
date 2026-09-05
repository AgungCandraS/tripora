"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/** Typing animation. Restarts whenever `text` changes. */
export function Typewriter({
  text,
  speed = 42,
  startDelay = 350,
  className,
}: {
  text: string;
  speed?: number;
  startDelay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [count, setCount] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    if (reduce) {
      setCount(text.length);
      return;
    }
    setCount(0);
    let i = 0;
    const tick = () => {
      i += 1;
      setCount(i);
      if (i < text.length) {
        const pause = text[i - 1] === " " || text[i - 1] === "," ? 130 : speed + Math.random() * 46;
        timers.current.push(window.setTimeout(tick, pause));
      }
    };
    timers.current.push(window.setTimeout(tick, startDelay));
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };
  }, [text, speed, startDelay, reduce]);

  const done = count >= text.length;

  return (
    <span role="text" aria-label={text} className={className}>
      <span aria-hidden="true">
        {text.slice(0, count)}
        <span
          aria-hidden="true"
          className={`ml-0.5 inline-block h-[0.95em] w-[2px] translate-y-[0.12em] bg-coral ${
            done ? "opacity-0" : "animate-pulse"
          }`}
        />
      </span>
    </span>
  );
}
