import type { ReactNode } from "react";

export const inputClass =
  "mt-2 w-full rounded-[10px] border border-line bg-transparent px-3.5 py-3 text-sm outline-none placeholder:text-ink/35 placeholder:font-normal focus:border-coral-dark";

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
        {hint ? <span className="font-normal text-ink/45">({hint})</span> : null}
      </span>
      {children}
    </label>
  );
}
