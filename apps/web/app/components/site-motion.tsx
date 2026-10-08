"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function SiteMotion({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", (context) => {
        const animations = new Map<Element, gsap.core.Tween>();
        const selector =
          ".section-intro, .place-card, .booking-banner, .mood-link, [data-motion]";
        let frame = 0;
        // Query results can arrive after navigation; register their animations
        // inside the same context so none survive an unmount or route change.
        const reveal = context.add("reveal", () => {
          for (const [element, animation] of animations) {
            if (!root.current?.contains(element)) {
              animation.scrollTrigger?.kill();
              animation.revert();
              animations.delete(element);
            }
          }
          root.current
            ?.querySelectorAll<HTMLElement>(selector)
            .forEach((element) => {
              if (animations.has(element)) return;
              const animation = gsap.from(element, {
                y: 20,
                opacity: 0,
                duration: 0.65,
                ease: "power2.out",
                clearProps: "transform,opacity",
                scrollTrigger: {
                  trigger: element,
                  start: "top 92%",
                  once: true,
                },
              });
              animations.set(element, animation);
            });
          ScrollTrigger.refresh();
        }) as () => void;
        reveal();
        const observer = new MutationObserver((records) => {
          const changed = records.some((record) =>
            [...record.addedNodes, ...record.removedNodes].some(
              (node) =>
                node instanceof Element &&
                (node.matches(selector) || node.querySelector(selector)),
            ),
          );
          if (!changed || frame) return;
          frame = requestAnimationFrame(() => {
            frame = 0;
            reveal();
          });
        });
        if (root.current)
          observer.observe(root.current, { childList: true, subtree: true });
        return () => {
          observer.disconnect();
          cancelAnimationFrame(frame);
          animations.clear();
        };
      });
      return () => media.revert();
    },
    { scope: root, dependencies: [pathname], revertOnUpdate: true },
  );

  return <div ref={root}>{children}</div>;
}
