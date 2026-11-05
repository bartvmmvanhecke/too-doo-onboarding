"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  Bold,
  Check,
  Ellipsis,
  Italic,
  Link2,
  List,
  ListOrdered,
  Plus,
  Timer,
  Trash2,
  Underline,
} from "lucide-react";
import Link from "next/link";
import { nextInSeries } from "@/lib/meeting-wrap-up";
import { Logo } from "@/components/brand";
import { Avatar } from "@/components/avatar";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { allItems, type EntryKind } from "@/lib/agenda";
import { usePeople, useStore, type Meeting } from "@/lib/store";
import { OVERTIME_EXTEND_MIN } from "@/lib/meetingWrapUp.config";
import { clockTime } from "@/lib/meeting-wrap-up";
import { Button } from "@/components/ui/button";
import { useNow } from "./meeting-context";
import { closeManually, isHandled, navigateTo, nextOpenItem, othersOpen, plannedEnd } from "@/lib/meeting-wrap-up";
import { cn } from "@/lib/utils";

const pill =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#2255ff] bg-[#e5f3ff] px-4 text-sm font-bold text-[#2055e5] hover:bg-[#d4eaff] disabled:cursor-not-allowed disabled:opacity-50";

export function LiveMeeting({ meeting }: { meeting: Meeting }) {
  const ops = useStore();
  const people = usePeople();
  const run = meeting.run!;
  const items = allItems(meeting.blocks);
  const nextMeeting = nextInSeries(meeting, ops.meetings);
  const now = useNow(true);
  const end = plannedEnd(meeting);
  const overtime = now >= end;
  const otherOpen = othersOpen(meeting, run.currentId);
  const handled = items.filter((i) => isHandled(meeting, i.id)).length;
  const openNumbers = otherOpen.map((i) => items.indexOf(i) + 1).join(" en ");
  const finish = () => {
    if (note.trim()) saveNote();
    ops.putMeeting(closeManually(useStore.getState().meetings.find((m) => m.id === meeting.id)!));
  };
  const item = items.find((i) => i.id === run.currentId);
  const block = meeting.blocks.find((b) => b.id === run.currentId || b.items.some((i) => i.id === run.currentId));
  const [snoozeUntil, setSnoozeUntil] = useState(0);
  const [minimizePrompt, setMinimizePrompt] = useState(false);
  const minimize = () =>
    ops.putMeeting({ ...useStore.getState().meetings.find((m) => m.id === meeting.id)!, minimized: true });
  const [editing, setEditing] = useState<EntryKind | "agenda" | null>(null);
  const [text, setText] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [privateNote, setPrivateNote] = useState(false);
  const [fileError, setFileError] = useState("");
  const [moving, setMoving] = useState(false);
  const activeCard = useRef<HTMLElement>(null);
  useEffect(() => {
    activeCard.current?.querySelector<HTMLButtonElement>("button[aria-current]")?.focus();
    activeCard.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [run.currentId, block?.id]);
  const lastTyping = useRef(0);
  const recordTyping = () => {
    const now = Date.now();
    if (now - lastTyping.current < 30000) return;
    lastTyping.current = now;
    const latest = useStore.getState().meetings.find((m) => m.id === meeting.id)!;
    ops.putMeeting({ ...latest, lastActivityAt: now });
  };
  const editor = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const entries = item?.entries ?? [];
  const notes = entries.filter((e) => e.kind === "note");
  const privateNotes = (meeting.privateNotes ?? []).filter((n) => n.itemId === item?.id);
  const openEditor = (kind: EntryKind | "agenda") => {
    setText("");
    setOwnerId("");
    setDate("");
    setEditing(kind);
  };
  const format = (before: string, after = before) => {
    const el = editor.current;
    if (!el) return;
    const start = el.selectionStart,
      end = el.selectionEnd;
    setNote(note.slice(0, start) + before + note.slice(start, end) + after + note.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, end + before.length);
    });
  };
  const selectItem = (id: string) => {
    if (note.trim()) saveNote();
    setNote("");
    ops.putMeeting(
      navigateTo(
        useStore.getState().meetings.find((m) => m.id === meeting.id)!,
        id,
      ),
    );
  };
  const saveNote = () => {
    if (!item || !note.trim()) return;
    if (privateNote)
      ops.putMeeting({
        ...meeting,
        privateNotes: [
          ...(meeting.privateNotes ?? []),
          { id: crypto.randomUUID(), itemId: item.id, text: note.trim() },
        ],
      });
    else ops.addEntry(meeting.id, item.id, { kind: "note", text: note.trim(), ownerId: null, date: "" });
    setNote("");
  };

  return (
    <div className="app-theme fixed inset-0 z-40 flex flex-col overflow-hidden bg-[linear-gradient(180deg,transparent,#08042e),linear-gradient(110deg,#2e6090,#73c8fb_75%)] text-[#1f2b3b]">
      <header className="flex min-h-16 shrink-0 flex-wrap items-center gap-3 px-3 py-2 text-white sm:px-5">
        <Logo tone="white" href="/app" className="mr-3 lg:w-[280px]" />
        <h1 className="order-last w-full min-w-0 truncate text-base font-bold sm:order-none sm:w-auto sm:flex-1">
          {meeting.name}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span>
            {handled} van {items.length} behandeld{otherOpen.length > 0 && ` · nog open: ${openNumbers}`}
          </span>
          <span
            role="status"
            className={cn(
              "rounded-full px-3 py-2",
              overtime ? "bg-[var(--wrap-amber-bg)] text-[var(--wrap-amber-ink)]" : "bg-white/15",
            )}
          >
            {Math.max(0, Math.floor((now - run.startedAt) / 60000))} min ·{" "}
            {overtime
              ? `${Math.floor((now - end) / 60000)} min over gepland einde`
              : `${Math.ceil((end - now) / 60000)} min resterend`}
          </span>
          {!overtime && (
            <progress
              aria-label="Verstreken vergadertijd"
              value={Math.max(0, now - run.startedAt)}
              max={Math.max(1, end - run.startedAt)}
              className="h-1 w-24"
            />
          )}
        </div>
        <Button
          variant="inverse"
          size="sm"
          onClick={() => (overtime || handled === items.length ? setMinimizePrompt(true) : minimize())}
        >
          Minimaliseren
        </Button>
        <button
          type="button"
          onClick={finish}
          aria-label="Afronden"
          className="ml-auto mr-10 flex min-h-11 items-center gap-2 rounded-full bg-white text-ink px-4 text-sm font-semibold hover:bg-brand-soft"
        >
          <span className="hidden sm:inline">Afronden</span>
          <span className="sm:hidden">Afronden</span>
        </button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside aria-label="Vergaderagenda" className="flex shrink-0 flex-col text-white lg:w-[315px]">
          <div className="flex gap-2 overflow-x-auto p-2 lg:flex-1 lg:flex-col lg:overflow-y-auto">
            {meeting.blocks
              .flatMap((b) =>
                b.kind === "topics"
                  ? b.items.map((i) => ({ ...i, theme: b.title }))
                  : [
                      {
                        id: b.id,
                        text: b.title,
                        ownerIds: b.presenterId ? [b.presenterId] : [],
                        duration: b.duration,
                        theme: b.kind === "break" ? "Pauze" : "Openstaande acties",
                      },
                    ],
              )
              .map((i) => {
                const active = i.id === run.currentId;
                const owner = people.find((p) => p.id === i.ownerIds[0]);
                return (
                  <article
                    ref={active ? activeCard : undefined}
                    key={i.id}
                    className={cn(
                      "min-w-[260px] rounded-2xl border border-white/20 p-3 lg:min-w-0",
                      active && "bg-white text-ink ring-2 ring-brand",
                    )}
                  >
                    {active && (
                      <>
                        <span className="inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold">
                          {i.theme}
                        </span>
                        <div className="mt-2 flex items-center justify-end gap-3 text-xs">
                          <Timer aria-hidden className="size-4" />
                          {i.duration !== null ? `${i.duration} min` : "Geen tijd ingesteld"}
                          {owner && <Avatar person={owner} size={28} decorative />}
                        </div>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => selectItem(i.id)}
                      aria-current={active ? "step" : undefined}
                      className={cn(
                        "flex min-h-11 w-full items-center justify-between gap-2 text-left text-base font-bold",
                        active && "mt-3 mb-3 text-xl",
                      )}
                    >
                      <span className={isHandled(meeting, i.id) ? "line-through" : ""}>{i.text}</span>
                      <span className="text-xs">
                        {active ? "nu" : isHandled(meeting, i.id) ? "behandeld" : `${i.duration ?? 0} min`}
                      </span>
                      {isHandled(meeting, i.id) ? (
                        <Check
                          aria-label="Behandeld"
                          className="size-5 shrink-0 rounded-full bg-[var(--wrap-handled)] text-white"
                        />
                      ) : (
                        <span aria-hidden className="size-4 shrink-0 rounded-full border-2 border-current" />
                      )}
                    </button>
                    {active && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            const next = nextOpenItem(meeting, run.currentId);
                            if (next) selectItem(next.id);
                            else finish();
                          }}
                          className={cn(pill, "w-full border-[#b3d4f3]")}
                        >
                          <Check aria-hidden className="size-4" />
                          {otherOpen.length ? `Behandeld · volgend open punt (${otherOpen.length})` : "Afronden →"}
                        </button>
                        <div className="mt-2 flex gap-1">
                          <button
                            type="button"
                            onClick={() => setMoving(true)}
                            className="min-h-11 flex-1 rounded-full border border-blue-200/70 px-3 text-sm font-bold hover:bg-white/10"
                          >
                            Verplaats agendapunt
                          </button>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                aria-label="Meer opties voor agendapunt"
                                className="flex size-11 items-center justify-center rounded-full border border-blue-200/70"
                              >
                                <Ellipsis className="size-5" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="app-theme w-56">
                              <button
                                type="button"
                                onClick={() => ops.nextStep(meeting.id, "postpone")}
                                className="min-h-11 text-sm"
                              >
                                Uitstellen naar later
                              </button>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </>
                    )}
                  </article>
                );
              })}
            {!items.length && !meeting.blocks.some((b) => b.kind !== "topics") && (
              <p className="p-3 text-sm text-white/80">Voeg je eerste agendapunt toe.</p>
            )}
          </div>
          <p className="px-3 py-2 text-xs text-white/80">
            Een punt telt als behandeld zodra je naar een ander punt gaat. Klik erop om het te heropenen.
          </p>
          <div className="border-t border-white/15 p-2 lg:pt-4">
            <button
              type="button"
              onClick={() => openEditor("agenda")}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white/25 text-sm font-bold hover:bg-white/10"
            >
              <Plus aria-hidden className="size-4" />
              Agendapunt toevoegen
            </button>
          </div>
        </aside>
        <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-7 overflow-y-auto rounded-tl-2xl bg-[#f9f9fc] p-5 xl:flex-row xl:p-6">
          <div className="min-w-0 flex-1">
            {(minimizePrompt || (overtime && now >= snoozeUntil)) && (
              <section
                role="status"
                className={cn(
                  "mb-5 rounded-[14px] border p-4",
                  minimizePrompt
                    ? "border-[var(--wrap-line)] bg-white"
                    : "border-transparent bg-[var(--wrap-amber-bg)] text-[var(--wrap-amber-ink)]",
                )}
              >
                <h2 className="font-bold">{minimizePrompt ? "Eerst afronden?" : "Vergadering nog bezig?"}</h2>
                <p className="my-2 text-sm">
                  {minimizePrompt
                    ? `${overtime ? "Het geplande einde is voorbij." : "Alle agendapunten zijn behandeld."} Minimaliseer je, dan loopt de vergadering gewoon door.`
                    : `Het geplande einde (${clockTime(end)}) is voorbij.${otherOpen.length ? ` Punt ${openNumbers} staan nog open.` : ""}`}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (minimizePrompt) {
                        setMinimizePrompt(false);
                        minimize();
                      } else setSnoozeUntil(now + OVERTIME_EXTEND_MIN * 60000);
                    }}
                  >
                    {minimizePrompt ? "Minimaliseren" : "+15 min"}
                  </Button>
                  <Button size="sm" onClick={finish}>
                    Afronden
                  </Button>
                </div>
              </section>
            )}
            {item && otherOpen.length === 0 && (
              <p className="mb-5 rounded-xl bg-brand-soft p-4 font-bold text-brand">
                → Laatste open punt · daarna versturen we de opvolging
              </p>
            )}
            {!run.currentId && (
              <p className="mb-5 rounded-lg bg-blue-50 p-3 text-sm">
                Alle agendapunten zijn behandeld. Voeg een punt toe of rond de vergadering af.
              </p>
            )}
            {block && !item && (
              <p className="mb-5 text-sm text-ink-3">
                {block.kind === "break" ? "Tijd voor een pauze." : "Bespreek de openstaande acties."}
              </p>
            )}
            {(
              [
                {
                  kind: "decision",
                  title: "Beslissingen",
                  button: "Beslissing toevoegen",
                  empty: "Nog geen beslissingen gedefinieerd.",
                },
                { kind: "action", title: "Acties", button: "Actie toevoegen", empty: "Nog geen acties gedefinieerd." },
                {
                  kind: "document",
                  title: "Documenten",
                  button: "Document toevoegen",
                  empty: "Geen bijgevoegd document.",
                },
              ] as const
            ).map((section) => {
              const rows = entries.filter((e) => e.kind === section.kind);
              return (
                <section
                  key={section.kind}
                  className={cn("pb-7", section.kind === "document" && "border-t border-[#e1e3ec] pt-6")}
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-base font-bold">{section.title}</h2>
                    <button
                      type="button"
                      disabled={!item}
                      onClick={() =>
                        section.kind === "document" ? fileInput.current?.click() : openEditor(section.kind)
                      }
                      className={pill}
                    >
                      <Plus aria-hidden className="size-4" />
                      {section.button}
                    </button>
                  </div>
                  {rows.length ? (
                    <ul className="space-y-2">
                      {rows.map((e) => (
                        <li
                          key={e.id}
                          className="flex items-center gap-2 rounded-xl border border-line bg-white p-3 text-sm"
                        >
                          <span className="min-w-0 flex-1 break-words">
                            {e.kind === "document" && e.fileData ? (
                              <a href={e.fileData} download={e.text} className="text-brand underline">
                                {e.text}
                              </a>
                            ) : (
                              e.text
                            )}
                            {e.ownerId && (
                              <span className="mt-1 block text-xs text-ink-3">
                                {people.find((p) => p.id === e.ownerId)?.name}
                                {e.date && ` · ${e.date}`}
                              </span>
                            )}
                          </span>
                          <button
                            type="button"
                            aria-label={`${e.text} verwijderen`}
                            onClick={() => ops.removeEntry(meeting.id, item!.id, e.id)}
                            className="flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-red-50"
                          >
                            <Trash2 aria-hidden className="size-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-[#777891]">{section.empty}</p>
                  )}
                  {section.kind === "action" && block?.kind === "actions" && (
                    <ul className="mt-3 space-y-2">
                      {meeting.actions.map((a) => (
                        <li key={a.id}>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={a.done}
                              onChange={() => ops.toggleAction(meeting.id, a.id)}
                            />
                            {a.what}
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
            {nextMeeting && (
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/app/overleg/${nextMeeting.id}`}>Naar volgende vergadering</Link>
              </Button>
            )}
            {fileError && (
              <p role="alert" className="text-sm text-red-600">
                {fileError}
              </p>
            )}
            <input
              ref={fileInput}
              type="file"
              multiple
              className="hidden"
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = "";
                if (!item) return;
                setFileError("");
                for (const file of files) {
                  if (file.size > 1024 * 1024) {
                    setFileError("Kies een document van maximaal 1 MB voor dit lokale prototype.");
                    continue;
                  }
                  try {
                    const fileData = await new Promise<string>((resolve, reject) => {
                      const reader = new FileReader();
                      reader.onload = () => resolve(String(reader.result));
                      reader.onerror = reject;
                      reader.readAsDataURL(file);
                    });
                    ops.addEntry(meeting.id, item.id, {
                      kind: "document",
                      text: file.name,
                      ownerId: null,
                      date: "",
                      size: file.size,
                      fileData,
                    });
                  } catch {
                    setFileError("Het document kon niet worden opgeslagen. De lokale opslag is mogelijk vol.");
                  }
                }
              }}
            />
          </div>
          <section
            aria-label="Vergadernotities"
            className="flex min-h-[560px] min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-[#f0f1f6] xl:min-h-0"
          >
            <div className="flex items-center justify-between p-4">
              <h2 className="text-base font-bold">Vergadernotities</h2>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" aria-label="Notitieopties" className="flex size-11 items-center justify-center">
                    <Ellipsis aria-hidden className="size-5 text-[#777891]" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="app-theme text-sm">
                  Notities worden per agendapunt opgeslagen. Privénotities blijven in dit lokale prototype en worden
                  niet als gedeelde notitie toegevoegd.
                </PopoverContent>
              </Popover>
            </div>
            <div className="min-h-[150px] flex-1 overflow-y-auto px-4 pb-4">
              {!notes.length && !privateNotes.length ? (
                <p className="pt-8 text-center text-sm text-[#777891]">Nog geen vergadernotities toegevoegd.</p>
              ) : (
                <ul className="space-y-3">
                  {notes.map((e) => (
                    <li key={e.id} className="rounded-xl bg-white p-3">
                      <FormattedNote text={e.text} />
                      <button
                        type="button"
                        onClick={() => ops.removeEntry(meeting.id, item!.id, e.id)}
                        className="mt-2 text-xs text-ink-3"
                      >
                        Verwijderen
                      </button>
                    </li>
                  ))}
                  {privateNotes.map((n) => (
                    <li key={n.id} className="rounded-xl bg-white p-3">
                      <span className="text-xs font-bold text-ink-3">Privénotitie</span>
                      <FormattedNote text={n.text} />
                      <button
                        type="button"
                        onClick={() =>
                          ops.putMeeting({
                            ...meeting,
                            privateNotes: meeting.privateNotes?.filter((p) => p.id !== n.id),
                          })
                        }
                        className="mt-2 text-xs text-ink-3"
                      >
                        Verwijderen
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveNote();
              }}
              className="border-t border-line bg-white p-4"
            >
              <div className="rounded-lg border border-[#cfd5e0] bg-white p-3 shadow-sm">
                <div role="toolbar" aria-label="Notitieopmaak" className="mb-3 flex gap-1">
                  {[
                    { label: "Vet", Icon: Bold, before: "**", after: "**" },
                    { label: "Cursief", Icon: Italic, before: "_", after: "_" },
                    { label: "Onderstrepen", Icon: Underline, before: "<u>", after: "</u>" },
                    { label: "Link", Icon: Link2, before: "[", after: "](https://)" },
                    { label: "Opsomming", Icon: List, before: "\n- ", after: "" },
                    { label: "Genummerde lijst", Icon: ListOrdered, before: "\n1. ", after: "" },
                  ].map(({ label, Icon, before, after }) => (
                    <button
                      key={label}
                      type="button"
                      aria-label={label}
                      disabled={!item}
                      onClick={() => format(before, after)}
                      className="flex size-11 items-center justify-center rounded text-[#98a4b9] hover:bg-line-soft"
                    >
                      <Icon aria-hidden className="size-4" />
                    </button>
                  ))}
                </div>
                <textarea
                  ref={editor}
                  aria-label="Schrijf een notitie"
                  placeholder="Schrijf een notitie…"
                  value={note}
                  disabled={!item}
                  onChange={(e) => {
                    setNote(e.target.value);
                    recordTyping();
                  }}
                  className="min-h-[110px] w-full resize-y bg-transparent text-base outline-none placeholder:text-[#777891]"
                />
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={privateNote}
                    onChange={(e) => setPrivateNote(e.target.checked)}
                    className="size-4"
                  />
                  Privénotitie
                </label>
                <button type="submit" disabled={!item || !note.trim()} className={pill}>
                  Notitie toevoegen
                </button>
              </div>
            </form>
          </section>
        </main>
      </div>
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="app-theme">
          <DialogTitle>
            {editing === "agenda"
              ? "Agendapunt toevoegen"
              : editing === "decision"
                ? "Beslissing toevoegen"
                : "Actie toevoegen"}
          </DialogTitle>
          <DialogDescription>
            {editing === "agenda"
              ? "Voeg een nieuw punt toe aan de vergaderagenda."
              : "Leg vast wat jullie voor dit agendapunt afspreken."}
          </DialogDescription>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!text.trim()) return;
              if (editing === "agenda") {
                const target =
                  meeting.blocks.find((b) => b.kind === "topics")?.id ?? ops.addBlock(meeting.id, "topics");
                const id = ops.addAgendaItem(meeting.id, target, text.trim());
                if (!run.currentId) {
                  const latest = useStore.getState().meetings.find((m) => m.id === meeting.id)!;
                  ops.putMeeting({
                    ...latest,
                    run: { ...latest.run!, currentId: id, stepStartedAt: new Date().getTime() },
                  });
                }
              } else if (item && editing)
                ops.addEntry(meeting.id, item.id, { kind: editing, text: text.trim(), ownerId: ownerId || null, date });
              setEditing(null);
            }}
          >
            <label className="flex flex-col gap-1 text-sm">
              Omschrijving
              <input
                autoFocus
                required
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  recordTyping();
                }}
                className="min-h-11 rounded-lg border border-line px-3"
              />
            </label>
            {editing === "action" && (
              <>
                <label className="flex flex-col gap-1 text-sm">
                  Verantwoordelijke
                  <select
                    value={ownerId}
                    onChange={(e) => setOwnerId(e.target.value)}
                    className="min-h-11 rounded-lg border border-line px-3"
                  >
                    <option value="">Nog niet toegewezen</option>
                    {people
                      .filter((p) => meeting.participants.includes(p.id))
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Deadline
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="min-h-11 rounded-lg border border-line px-3"
                  />
                </label>
              </>
            )}
            <button type="submit" className={cn(pill, "self-end")}>
              Toevoegen
            </button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={moving} onOpenChange={setMoving}>
        <DialogContent className="app-theme">
          <DialogTitle>Verplaats agendapunt</DialogTitle>
          <DialogDescription>Kies het thema waar je dit agendapunt wil bespreken.</DialogDescription>
          {meeting.blocks
            .filter((b) => b.kind === "topics")
            .map((b) => (
              <button
                key={b.id}
                type="button"
                disabled={!item}
                onClick={() => {
                  if (item) ops.moveItem(meeting.id, item.id, b.id, b.items.length);
                  setMoving(false);
                }}
                className="flex min-h-11 items-center justify-between rounded-lg border border-line px-3 text-left"
              >
                {b.title}
                <ArrowDown aria-hidden className="size-4" />
              </button>
            ))}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Beperkte, veilige opmaak zonder opgeslagen HTML uit te voeren. */
function FormattedNote({ text }: { text: string }) {
  const inline = (line: string) =>
    line.split(/(\*\*[^*]+\*\*|_[^_]+_|<u>[^<]+<\/u>|\[[^\]]+\]\(https?:\/\/[^)]+\))/g).map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
      if (part.startsWith("_") && part.endsWith("_")) return <em key={i}>{part.slice(1, -1)}</em>;
      if (part.startsWith("<u>") && part.endsWith("</u>")) return <u key={i}>{part.slice(3, -4)}</u>;
      const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
      return link ? (
        <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer" className="text-brand underline">
          {link[1]}
        </a>
      ) : (
        part
      );
    });
  return (
    <div className="text-sm whitespace-pre-wrap break-words">
      {text.split("\n").map((line, i) =>
        line.startsWith("- ") ? (
          <div key={i} className="pl-2">
            • {inline(line.slice(2))}
          </div>
        ) : /^\d+\. /.test(line) ? (
          <div key={i} className="pl-2">
            {inline(line)}
          </div>
        ) : (
          <div key={i}>{inline(line) || "\u00a0"}</div>
        ),
      )}
    </div>
  );
}
