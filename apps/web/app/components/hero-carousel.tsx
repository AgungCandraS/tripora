"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Typewriter } from "./typewriter";

const AUTOPLAY_MS = 6000;

const slides = [
  {
    kicker: "Pangalengan · Bandung Selatan",
    title: "Kabut pagi, rute baru",
    subtitle: "Rafting, kebun teh, dan trekking dalam satu hari penuh.",
    image: "/images/hero-pangalengan.png",
    alt: "Dua wisatawan menikmati hamparan kebun teh Pangalengan",
  },
  {
    kicker: "Pangalengan · Sungai Palayangan",
    title: "Air deras, kepala ringan",
    subtitle: "Dipandu operator lokal, perlengkapan disiapkan.",
    image: "/images/activity-rafting.png",
    alt: "Aktivitas rafting di sungai Bandung Selatan",
  },
  {
    kicker: "Bandung Raya · 6 cluster",
    title: "Jeda yang terasa dekat",
    subtitle: "Lembang, Ciwidey, Dago — pilih suasana, bukan jarak.",
    image: "/images/hero-pangalengan.png",
    alt: "Pemandangan hijau pegunungan Bandung",
  },
];

const variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir >= 0 ? 72 : -72, scale: 1.06 }),
  center: { opacity: 1, x: 0, scale: 1 },
  exit: (dir: number) => ({ opacity: 0, x: dir >= 0 ? -72 : 72, scale: 1.04 }),
};

export function HeroCarousel({ fullBleed = false }: { fullBleed?: boolean }) {
  const [[active, direction], setActive] = useState<[number, number]>([0, 0]);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();

  const paginate = useCallback(
    (dir: number) => {
      setActive(([prev]) => [(prev + dir + slides.length) % slides.length, dir]);
    },
    []
  );

  const goTo = useCallback((index: number) => {
    setActive(([prev]) => [index, index > prev ? 1 : -1]);
  }, []);

  useEffect(() => {
    if (reduce || paused) return;
    const timer = window.setInterval(() => paginate(1), AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [paginate, paused, reduce]);

  const slide = slides[active];
  const shellClass = fullBleed
    ? "absolute inset-0"
    : "relative h-[290px] overflow-hidden rounded-[16px] bg-sage sm:h-[450px] lg:h-[650px]";

  return (
    <div
      className={shellClass}
      aria-roledescription="carousel"
      aria-label="Inspirasi perjalanan Bandung"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={active}
          className="absolute inset-0"
          custom={direction}
          variants={variants}
          initial={reduce ? { opacity: 0 } : "enter"}
          animate="center"
          exit="exit"
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          drag={reduce ? false : "x"}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.6}
          onDragEnd={(_, info) => {
            if (info.offset.x < -80) paginate(1);
            else if (info.offset.x > 80) paginate(-1);
          }}
        >
          <motion.div
            className="absolute inset-0"
            initial={reduce ? false : { scale: 1.08 }}
            animate={{ scale: 1 }}
            transition={{ duration: 6.5, ease: "easeOut" }}
          >
            <Image
              src={slide.image}
              alt={slide.alt}
              fill
              priority={active === 0}
              sizes={fullBleed ? "100vw" : "(max-width: 1024px) 100vw, 60vw"}
              className="object-cover"
            />
          </motion.div>
        </motion.div>
      </AnimatePresence>

      <div
        className={`pointer-events-none absolute inset-0 ${
          fullBleed
            ? "bg-gradient-to-r from-[#10231e]/85 via-[#10231e]/35 to-[#10231e]/10"
            : "bg-gradient-to-t from-[#10231e]/65 via-transparent to-transparent"
        }`}
      />
      {fullBleed && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#10231e]/60 via-transparent to-[#10231e]/15" />
      )}

      <div
        className={`absolute flex items-end justify-between gap-4 text-paper ${
          fullBleed
            ? "bottom-7 left-5 right-5 sm:bottom-10 sm:left-8 sm:right-8 lg:bottom-12 lg:left-12 lg:right-12"
            : "bottom-5 left-5 right-5 sm:bottom-7 sm:left-7 sm:right-7"
        }`}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -12 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-paper/70">
              {slide.kicker}
            </p>
            <Typewriter
              key={active}
              text={slide.title}
              className="mt-1 block min-h-[1.9rem] text-[17px] font-semibold tracking-[-0.01em]"
            />
            <p className="mt-1 hidden max-w-[320px] text-sm leading-6 text-paper/65 sm:block">
              {slide.subtitle}
            </p>
          </motion.div>
        </AnimatePresence>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => paginate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-paper/35 bg-ink/20 backdrop-blur-sm transition hover:bg-ink/50"
            aria-label="Slide sebelumnya"
          >
            <ArrowLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => paginate(1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-paper/35 bg-ink/20 backdrop-blur-sm transition hover:bg-ink/50"
            aria-label="Slide berikutnya"
          >
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <div
        className={`absolute flex items-center gap-1.5 ${
          fullBleed ? "right-5 top-[88px] sm:right-8 lg:right-12" : "right-7 top-7"
        }`}
        role="tablist"
        aria-label="Pilih slide hero"
      >
        {slides.map((item, index) => (
          <button
            key={item.title}
            type="button"
            role="tab"
            aria-selected={active === index}
            aria-label={`Buka slide ${index + 1}: ${item.title}`}
            onClick={() => goTo(index)}
            className={`relative h-1.5 overflow-hidden rounded-full transition-all ${
              active === index ? "w-10 bg-paper/30" : "w-1.5 bg-paper/60 hover:bg-paper"
            }`}
          >
            {active === index && !reduce && !paused && (
              <motion.span
                key={`progress-${active}`}
                className="absolute inset-0 origin-left rounded-full bg-coral"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: AUTOPLAY_MS / 1000, ease: "linear" }}
              />
            )}
            {active === index && (reduce || paused) && (
              <span className="absolute inset-0 rounded-full bg-coral" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
