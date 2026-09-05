import type { ReactNode } from "react";
import { FadeUp } from "./motion";

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = "left",
}: {
  eyebrow: string;
  title: ReactNode;
  description?: string;
  action?: ReactNode;
  align?: "left" | "center";
}) {
  const centered = align === "center";
  return (
    <div
      className={`flex flex-col gap-5 ${
        centered ? "items-center text-center" : "sm:flex-row sm:items-end sm:justify-between"
      }`}
    >
      <FadeUp className={centered ? "max-w-[640px]" : "max-w-[620px]"}>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-coral-dark">
          {eyebrow}
        </p>
        <h2 className="display-text mt-2.5 text-[1.7rem] font-bold leading-[1.08] tracking-[-0.035em] text-ink sm:text-4xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-3 text-[15px] leading-7 text-ink/60">{description}</p>
        ) : null}
      </FadeUp>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
