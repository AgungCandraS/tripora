import type { ReactNode } from "react";

export const inputClass =
  "mt-2 min-h-12 w-full rounded-[10px] border border-line bg-white px-3.5 py-3 text-base outline-none placeholder:text-ink/45 placeholder:font-normal focus:border-moss focus:ring-2 focus:ring-moss/15";

export function Field({
  label,
  hint,
  children,
  span = false,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  span?: boolean;
}) {
  return (
    <label className={`block ${span ? "sm:col-span-2" : ""}`}>
      <span className="text-sm font-semibold">
        {label}{" "}
        {hint ? (
          <span className="font-normal text-ink/45">({hint})</span>
        ) : null}
      </span>
      {children}
    </label>
  );
}
