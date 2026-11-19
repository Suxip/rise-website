import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { CATEGORIES, PROGRAM_TYPES, US_STATES, type ProgramCategory } from "@/data/programs";
import {
  saveProgram,
  validateProgram,
  type AdminProgram,
  type ProgramInput,
  type ProgramLevel,
} from "@/data/admin";

const EMPTY: ProgramInput = {
  name: "",
  category: "energy",
  programType: null,
  description: "",
  url: "https://",
  howToAccess: "",
  stateCode: null,
  level: "state",
  isPublished: true,
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const inputClass = "w-full rounded-md border bg-background px-3 py-2 text-base";
const labelClass = "block text-base font-medium mb-1";

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  return "Something went wrong. Try again.";
}

/** Add form when `program` is null, edit form otherwise. Shown as a pop-up over the page. */
export default function ProgramForm({
  program,
  onClose,
  onSaved,
}: {
  program: AdminProgram | null;
  onClose: () => void;
  onSaved: (saved: AdminProgram) => void;
}) {
  const [input, setInput] = useState<ProgramInput>(
    program
      ? {
          name: program.name,
          category: program.category,
          programType: program.programType,
          description: program.description,
          url: program.url,
          howToAccess: program.howToAccess,
          stateCode: program.stateCode,
          level: program.level,
          isPublished: program.isPublished,
        }
      : EMPTY
  );
  const [errors, setErrors] = useState<Partial<Record<keyof ProgramInput, string>>>({});
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ProgramInput>(key: K, value: ProgramInput[K]) =>
    setInput((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError("");
    const found = validateProgram(input);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      const saved = await saveProgram(input, program?.id);
      onSaved(saved);
    } catch (err) {
      setSaveError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // Close with the Escape key.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fieldError = (key: keyof ProgramInput) =>
    errors[key] ? <p className="mt-1 text-sm text-destructive">{errors[key]}</p> : null;

  // Rendered straight into <body> so page animations or layout wrappers
  // can't push it off screen or behind other content.
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="program-form-title"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-background p-6 md:p-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <h2 id="program-form-title" className="text-2xl font-semibold">
            {program ? "Edit program" : "Add program"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground">
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="pf-name" className={labelClass}>Program name</label>
            <input id="pf-name" className={inputClass} value={input.name} onChange={(e) => set("name", e.target.value)} />
            {fieldError("name")}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="pf-category" className={labelClass}>Category</label>
              <select
                id="pf-category"
                className={inputClass}
                value={input.category}
                onChange={(e) => set("category", e.target.value as ProgramCategory)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>{capitalize(c.key)}</option>
                ))}
              </select>
              {fieldError("category")}
            </div>
            <div>
              <label htmlFor="pf-type" className={labelClass}>Program type</label>
              <select
                id="pf-type"
                className={inputClass}
                value={input.programType ?? ""}
                onChange={(e) => set("programType", e.target.value || null)}
              >
                <option value="">None</option>
                {PROGRAM_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {fieldError("programType")}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="pf-level" className={labelClass}>Level</label>
              <select
                id="pf-level"
                className={inputClass}
                value={input.level}
                onChange={(e) => {
                  const level = e.target.value as ProgramLevel;
                  setInput((prev) => ({ ...prev, level, stateCode: level === "federal" ? null : prev.stateCode }));
                }}
              >
                <option value="state">State</option>
                <option value="territory">Territory</option>
                <option value="federal">Federal</option>
              </select>
            </div>
            <div>
              <label htmlFor="pf-state" className={labelClass}>State or territory</label>
              <select
                id="pf-state"
                className={inputClass}
                value={input.stateCode ?? ""}
                disabled={input.level === "federal"}
                onChange={(e) => set("stateCode", e.target.value || null)}
              >
                <option value="">{input.level === "federal" ? "Not needed for federal" : "Choose..."}</option>
                {US_STATES.map((s) => (
                  <option key={s.code} value={s.code}>{s.name}</option>
                ))}
              </select>
              {fieldError("stateCode")}
            </div>
          </div>

          <div>
            <label htmlFor="pf-url" className={labelClass}>Official link</label>
            <input id="pf-url" className={inputClass} value={input.url} onChange={(e) => set("url", e.target.value)} />
            {fieldError("url")}
          </div>

          <div>
            <label htmlFor="pf-description" className={labelClass}>Description</label>
            <textarea
              id="pf-description"
              rows={4}
              className={inputClass}
              value={input.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="pf-how" className={labelClass}>How to access</label>
            <textarea
              id="pf-how"
              rows={3}
              className={inputClass}
              value={input.howToAccess}
              onChange={(e) => set("howToAccess", e.target.value)}
            />
            <p className="mt-1 text-sm text-muted-foreground">Leave empty to show the site's standard message.</p>
          </div>

          <label className="flex items-center gap-2 text-base">
            <input
              type="checkbox"
              checked={input.isPublished}
              onChange={(e) => set("isPublished", e.target.checked)}
              className="h-4 w-4"
            />
            Published (visible on the public site)
          </label>

          {saveError && <p role="alert" className="text-base text-destructive">{saveError}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-primary px-5 py-2 text-base font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving..." : program ? "Save changes" : "Add program"}
            </button>
            <button type="button" onClick={onClose} className="rounded-full border px-5 py-2 text-base hover:bg-muted">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}