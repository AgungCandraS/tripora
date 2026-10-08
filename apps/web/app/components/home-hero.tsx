"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "@phosphor-icons/react";
import gsap from "gsap";
import { TextPlugin } from "gsap/TextPlugin";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, TextPlugin);

export type HeroSlide = {
  image: string;
  location: string;
  area: string;
  phrase: string;
  href: string;
  position?: string;
};

type HeroControls = {
  select: (index: number) => void;
  suspend: (reason: string, value: boolean) => void;
};

export function HomeHero({
  slides,
  placeCount,
}: {
  slides: HeroSlide[];
  placeCount: number;
}) {
  const root = useRef<HTMLElement>(null);
  const word = useRef<HTMLElement>(null);
  const controls = useRef<HeroControls | null>(null);
  const activeIndex = useRef(0);
  const [active, setActive] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [failed, setFailed] = useState<string[]>([]);

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          reduced: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const reduce = Boolean(context.conditions?.reduced);
          setReduced(reduce);
          const layers = gsap.utils.toArray<HTMLElement>(
            ".hero-frame",
            root.current,
          );
          const blockers = new Set<string>();
          if (document.hidden) blockers.add("hidden");
          if (root.current?.contains(document.activeElement))
            blockers.add("focus");
          let transition: gsap.core.Timeline | undefined;
          let timer: gsap.core.Tween | undefined;
          let disposed = false;

          const sync = () => {
            const stop = blockers.size > 0;
            transition?.paused(stop);
            timer?.paused(stop);
          };
          // Capture delayed callbacks in the media context so route changes and
          // preference changes revert every animation, including manual navigation.
          const select = context.add(
            "select",
            (requested: number, initial = false) => {
              if (disposed) return;
              const index = (requested + slides.length) % slides.length;
              const instant = reduce || blockers.size > 0;
              transition?.kill();
              timer?.kill();
              activeIndex.current = index;
              setActive(index);
              transition = gsap.timeline();
              const photoState = {
                opacity: (i: number) => (i === index ? 1 : 0),
              };
              if (instant) gsap.set(layers, photoState);
              else
                transition.to(
                  layers,
                  {
                    ...photoState,
                    duration: initial ? 0 : 1.25,
                    ease: "power2.inOut",
                  },
                  0,
                );
              const image = layers[index].querySelector("img");
              if (!instant && image) {
                transition.fromTo(
                  image,
                  { scale: 1.045 },
                  { scale: 1, duration: 8, ease: "none" },
                  0,
                );
              }
              if (instant) {
                gsap.set(word.current, { text: slides[index].phrase });
              } else {
                transition.to(
                  word.current,
                  { text: "", duration: initial ? 0 : 0.3, ease: "none" },
                  0,
                );
                transition.to(
                  word.current,
                  { text: slides[index].phrase, duration: 1.65, ease: "none" },
                  initial ? 0.35 : 0.55,
                );
              }
              if (!reduce && slides.length > 1) {
                timer = gsap.delayedCall(8, () => select(index + 1));
              }
              sync();
            },
          ) as (index: number, initial?: boolean) => void;

          controls.current = {
            select,
            suspend(reason, value) {
              if (value) blockers.add(reason);
              else blockers.delete(reason);
              sync();
            },
          };
          const visibility = () =>
            controls.current?.suspend("hidden", document.hidden);
          document.addEventListener("visibilitychange", visibility);
          const observer = new IntersectionObserver(([entry]) =>
            controls.current?.suspend("offscreen", !entry.isIntersecting),
          );
          if (root.current) observer.observe(root.current);
          select(activeIndex.current, true);
          if (!reduce) {
            gsap.from(root.current!.querySelectorAll(".hero-enter"), {
              y: 18,
              opacity: 0,
              duration: 0.8,
              stagger: 0.1,
              ease: "power2.out",
            });
          }
          return () => {
            disposed = true;
            observer.disconnect();
            document.removeEventListener("visibilitychange", visibility);
            timer?.kill();
            transition?.kill();
            controls.current = null;
          };
        },
      );
      return () => media.revert();
    },
    { scope: root, dependencies: [slides], revertOnUpdate: true },
  );

  const slide = slides[active];
  return (
    <section
      ref={root}
      id="content"
      className="immersive-hero"
      aria-label="Suasana Bandung"
      aria-roledescription="carousel"
      onFocusCapture={() => controls.current?.suspend("focus", true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          controls.current?.suspend("focus", false);
      }}
    >
      <div className="hero-photos" aria-hidden="true">
        {slides.map((item, index) => (
          <div
            className={`hero-frame ${index === 0 ? "is-first" : ""}`}
            key={item.image}
          >
            {!failed.includes(item.image) && (
              <Image
                src={item.image}
                alt=""
                fill
                priority={index === 0}
                sizes="100vw"
                className="object-cover"
                style={{ objectPosition: item.position ?? "center" }}
                onError={() =>
                  setFailed((previous) => [...previous, item.image])
                }
              />
            )}
          </div>
        ))}
      </div>
      <div className="hero-shade" aria-hidden="true" />
      <div className="public-container hero-body">
        <div className="hero-copy">
          <p className="hero-enter hero-eyebrow">Panduan wisata Bandung Raya</p>
          <h1 className="hero-enter hero-title">
            <span className="sr-only">
              Jelajahi wisata, kuliner, dan aktivitas di Bandung Raya.
            </span>
            <span aria-hidden="true">
              Jelajahi Bandung.
              <br />
              <span className="hero-typing-line">
                <em ref={word}>{slides[0].phrase}</em>
                <span className={`typing-caret ${reduced ? "is-still" : ""}`}>
                  |
                </span>
              </span>
            </span>
          </h1>
          <p className="hero-enter hero-description">
            Temukan destinasi wisata, kuliner, dan aktivitas lokal untuk
            perjalanan Anda berikutnya.
          </p>
          <form action="/explore" className="hero-enter home-search">
            <label htmlFor="home-query" className="sr-only">
              Cari tempat di Bandung
            </label>
            <input
              id="home-query"
              name="q"
              type="search"
              placeholder="Cari tempat wisata, kafe, atau aktivitas"
            />
            <button type="submit" className="primary-button">
              Cari tempat <ArrowUpRight size={18} aria-hidden="true" />
            </button>
          </form>
          <div className="hero-enter hero-suggestions">
            <span>Destinasi populer:</span>
            {["Lembang", "Ciwidey", "Pangalengan"].map((area) => (
              <Link key={area} href={`/explore?area=${area}`}>
                {area}
              </Link>
            ))}
          </div>
        </div>
        <div className="hero-bottom">
          <a href="#pilih-suasana" className="hero-scroll">
            <ArrowDown size={20} aria-hidden="true" />
            <span>
              {placeCount.toLocaleString("id-ID")} tempat untuk dijelajahi.
            </span>
          </a>
          <div className="hero-location" aria-live="off">
            <span>{slide.area}, Bandung Raya</span>
            <Link href={slide.href}>
              {slide.location}
              <ArrowUpRight size={20} aria-hidden="true" />
            </Link>
          </div>
          <div
            className="hero-controls"
            role="group"
            aria-label="Kontrol foto hero"
          >
            <div className="hero-dots">
              {slides.map((item, index) => (
                <button
                  type="button"
                  key={item.image}
                  aria-label={`Lihat foto ${item.location}`}
                  aria-pressed={index === active}
                  onClick={() => controls.current?.select(index)}
                >
                  <span />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
