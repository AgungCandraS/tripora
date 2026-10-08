"use client";
import { FormEvent, useId, useState } from "react";
import { ApiError } from "../lib/api";

export function OperationForm({
  title,
  label,
  submitLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  label: string;
  submitLabel: string;
  onConfirm: (value: string) => Promise<void>;
  onCancel: () => void;
}) {
  const id = useId();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !value.trim()) return;
    setBusy(true);
    setError("");
    try {
      await onConfirm(value.trim());
    } catch (problem) {
      setError(
        problem instanceof ApiError
          ? problem.message
          : "Belum tersimpan. Coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className="w-full rounded-xl border border-line bg-soft p-4"
    >
      <h3 className="font-bold">{title}</h3>
      <label htmlFor={id} className="mt-3 block text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        autoFocus
        required
        maxLength={200}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="mt-2 min-h-12 w-full rounded-lg border border-line bg-white px-3 text-base"
        disabled={busy}
      />
      {error && (
        <p className="mt-3 text-sm text-coral-dark" role="alert">
          {error}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className="primary-button">
          {busy ? "Menyimpan…" : submitLabel}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="secondary-button"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
