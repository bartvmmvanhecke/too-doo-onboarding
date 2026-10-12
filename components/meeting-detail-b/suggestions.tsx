"use client";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntryFields } from "./entry-fields";
import { suggestFromLine, type Suggestion } from "@/lib/meeting-suggestions";
import type { Person } from "@/lib/mock-data";
const resolved = new Set<string>();
const DISMISSED_KEY = "too-doo-document-dismissed";
// Alleen een vingerafdruk van een afgehandelde tekst, nooit het voorstel of broninhoud.
function fingerprint(text: string) {
  let hash = 2166136261;
  for (const character of text) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(36);
}
function isResolved(key: string) {
  if (resolved.has(key)) return true;
  try {
    return (
      typeof window !== "undefined" &&
      (JSON.parse(sessionStorage.getItem(DISMISSED_KEY) || "[]") as string[]).includes(key)
    );
  } catch {
    return false;
  }
}
function remember(key: string) {
  resolved.add(key);
  try {
    const keys = JSON.parse(sessionStorage.getItem(DISMISSED_KEY) || "[]") as string[];
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...new Set([...keys, key])]));
  } catch {
    /* In het geheugen blijft weigeren ook zonder browseropslag werken. */
  }
}
export function SuggestionCards({
  sourceId,
  text,
  meetingId,
  participants,
  meetingDate,
  immediate,
  confirm,
  onResolved,
}: {
  sourceId: string;
  text: string;
  meetingId: string;
  participants: Person[];
  meetingDate: string;
  immediate?: boolean;
  confirm: (suggestion: Suggestion) => void;
  onResolved?: () => void;
}) {
  const [result, setResult] = useState<{ text: string; suggestions: Suggestion[] }>({ text: "", suggestions: [] });
  const [hidden, setHidden] = useState<string[]>([]);
  const key = (s: Suggestion) => `${meetingId}:${fingerprint(`${text}:${s.id}`)}`;
  const signature = participants.map((p) => `${p.id}:${p.name}`).join("|");
  useEffect(() => {
    const timer = window.setTimeout(
      () =>
        setResult({
          text,
          suggestions: suggestFromLine(text, {
            participants: signature
              .split("|")
              .filter(Boolean)
              .map((s) => {
                const [id, name] = s.split(":");
                return { id, name, initials: "", color: { bg: "", fg: "" } };
              }),
            meetingDate,
          }),
        }),
      immediate ? 0 : 1000,
    );
    return () => window.clearTimeout(timer);
  }, [text, signature, meetingDate, immediate]);
  const suggestions =
    result.text === text ? result.suggestions.filter((s) => !isResolved(key(s)) && !hidden.includes(key(s))) : [];
  function dismiss(suggestion: Suggestion) {
    const id = key(suggestion);
    remember(id);
    onResolved?.();
    setHidden((h) => [...h, id]);
  }
  function accept(suggestion: Suggestion) {
    confirm(suggestion);
    dismiss(suggestion);
  }
  useEffect(() => {
    const listener = (e: globalThis.KeyboardEvent) => {
      if ((document.activeElement as HTMLElement | null)?.dataset.sourceId !== sourceId || !suggestions.length) return;
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        accept(suggestions[0]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        dismiss(suggestions[0]);
      }
    };
    document.addEventListener("keydown", listener, true);
    return () => document.removeEventListener("keydown", listener, true);
  });
  return (
    <div className="ml-7">
      <p aria-live="polite" className="sr-only">
        {suggestions.map((s) => `${s.kind === "action" ? "Actie" : "Beslissing"} herkend: ${s.title}`).join(". ")}
      </p>
      {suggestions.map((s) => (
        <SuggestionCard key={key(s)} suggestion={s} participants={participants} confirm={accept} dismiss={dismiss} />
      ))}
    </div>
  );
}
function SuggestionCard({
  suggestion,
  participants,
  confirm,
  dismiss,
}: {
  suggestion: Suggestion;
  participants: Person[];
  confirm: (s: Suggestion) => void;
  dismiss: (s: Suggestion) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(suggestion);
  const label = value.kind === "action" ? "actie" : "beslissing";
  return (
    <div
      className="suggestion-card my-2 rounded-[10px] border p-3.5"
      style={{ background: "var(--primary-tint)", borderColor: "var(--suggestion-border)" }}
      onKeyDown={(e) => {
        if (!editing) return;
        if (e.key === "Escape") {
          e.preventDefault();
          setValue(suggestion);
          setEditing(false);
        }
        if (e.key === "Enter" && value.title.trim() && !(e.target instanceof HTMLButtonElement)) {
          e.preventDefault();
          confirm(value);
        }
      }}
    >
      <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-brand">
        <Sparkles size={13} aria-hidden />
        {value.kind === "action" ? "Actie herkend" : "Beslissing herkend"}
      </p>
      {editing ? (
        <input
          aria-label="Voorgestelde titel aanpassen"
          className="min-h-11 w-full border-b border-line bg-transparent text-sm font-semibold outline-none"
          value={value.title}
          onChange={(e) => setValue((s) => ({ ...s, title: e.target.value }))}
        />
      ) : (
        <p className="text-sm font-semibold">{value.title}</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <EntryFields
          ownerId={value.ownerId}
          date={value.date}
          people={participants}
          update={(patch) =>
            setValue((s) => ({ ...s, ...patch, dateLabel: patch.date !== undefined ? "" : s.dateLabel }))
          }
        />
        {value.dateLabel && <span className="text-xs text-ink-3">Voorstel: {value.dateLabel}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <Button
          size="sm"
          className="min-h-9 h-9 px-3 text-xs"
          disabled={!value.title.trim()}
          onClick={() => confirm(value)}
        >
          Bevestig {label}
        </Button>
        <Button variant="ghost" size="sm" className="px-2 text-xs" onClick={() => setEditing(!editing)}>
          Aanpassen
        </Button>
        <Button variant="ghost" size="sm" className="px-2 text-xs" onClick={() => dismiss(suggestion)}>
          Geen {label}
        </Button>
      </div>
      <p className="mt-1 text-[10px] text-ink-3">⌘/Ctrl + Enter bevestigen · Esc sluiten</p>
    </div>
  );
}
