"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Loader2, Mail, Mic, Pencil } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { Logo } from "@/components/brand";
import { MailPreview } from "@/components/b/mail-preview";
import { ProposalRow } from "@/components/b/proposal-row";
import { ActionRow, ActionRowHeader } from "@/components/onboarding/action-row";
import { StepProgress } from "@/components/onboarding/step-progress";
import { Tag } from "@/components/tag";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { formatShortDate, weekdayLong } from "@/lib/date";
import { extractProposals, SAMPLE_TRANSCRIPT } from "@/lib/extract";
import { ownerOptions } from "@/lib/owners";
import { initialsFrom } from "@/lib/people";
import { AVATAR_COLORS } from "@/lib/mock-data";
import { findPerson, usePeople, useStore, type ExtractionTab } from "@/lib/store";
import { cn, inSentence, joinNl } from "@/lib/utils";
import { mailData } from "@/lib/variant-b";

const EXTRACT_DELAY = 1000;
const LISTEN_DELAY = 2000;

const TABS: { id: ExtractionTab; label: string; icon: typeof ClipboardList }[] = [
  { id: "plak", label: "Plak notities", icon: ClipboardList },
  { id: "inspreken", label: "Inspreken", icon: Mic },
  { id: "typen", label: "Zelf typen", icon: Pencil },
];

const PLACEHOLDERS = [
  "Bv. offerte nieuwe plooibank opvragen",
  "Bv. instructie heftruck bijwerken",
  "Bv. leverancier staal opnieuw contacteren",
];

/** Variant B, stap 3 · Acties uit notities: plakken, inspreken of typen (SPEC-FLOWS.md §4). */
export function NotesScreen() {
  const router = useRouter();
  const target = useStore((s) => s.meetings.find((m) => m.id === s.b.targetMeetingId));
  const extraction = useStore((s) => s.b.extraction);
  const extraPeople = useStore((s) => s.extraPeople);
  const update = useStore((s) => s.updateExtraction);
  const updateProposal = useStore((s) => s.updateProposal);
  const updateTypedRow = useStore((s) => s.updateTypedRow);
  const addPerson = useStore((s) => s.addPerson);
  const confirm = useStore((s) => s.confirmProposals);
  const people = usePeople();
  const [busy, setBusy] = useState<"extract" | "listen" | null>(null);
  const [mailOpen, setMailOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!target) router.replace("/b/structuur");
  }, [target, router]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  if (!target) return null;

  const owners = ownerOptions(
    people,
    target.participants,
    target.name,
    extraPeople.map((p) => p.id),
  );
  const ownerPeople = owners.map((o) => o.person);
  const proposals = extraction.proposals ?? [];
  const typed = extraction.typed.filter((r) => r.what.trim());
  const count = proposals.filter((p) => p.checked && p.text.trim()).length + typed.length;
  const meetingName = inSentence(target.name);
  const weekday = target.date ? weekdayLong(target.date) : "het volgende overleg";

  // Eigenaars die een mail krijgen: van aangevinkte acties en zelf getypte rijen.
  const ownerNames = [
    ...new Set([
      ...proposals
        .filter((p) => p.checked && p.kind === "action" && p.ownerId)
        .map((p) => findPerson(people, p.ownerId)?.name.split(" ")[0]),
      ...typed.map((r) => findPerson(people, r.ownerId)?.name.split(" ")[0] ?? (r.ownerText.trim() || undefined)),
    ]),
  ].filter((x): x is string => !!x);

  const extract = (text: string) => {
    setBusy("extract");
    timer.current = setTimeout(() => {
      update({ proposals: extractProposals(text, ownerPeople) });
      setBusy(null);
    }, EXTRACT_DELAY);
  };

  const listen = () => {
    setBusy("listen");
    timer.current = setTimeout(() => {
      update({ text: SAMPLE_TRANSCRIPT, tab: "plak" });
      extract(SAMPLE_TRANSCRIPT);
    }, LISTEN_DELAY);
  };

  const onTabKey = (e: KeyboardEvent, i: number) => {
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (i + delta + TABS.length) % TABS.length;
    update({ tab: TABS[next].id });
    tabRefs.current[next]?.focus();
  };

  const mail = mailData(
    [
      ...proposals
        .filter((p) => p.checked && p.kind === "action")
        .map((p) => ({ what: p.text, ownerId: p.ownerId, deadline: p.date ? formatShortDate(p.date) : "" })),
      ...typed.map((r) => ({ what: r.what, ownerId: r.ownerId, deadline: r.deadline })),
    ],
    target,
    people,
    weekdayLong,
  );

  return (
    <div className="flex min-h-dvh flex-col gap-5 bg-white px-4 py-6 text-ink sm:px-8 lg:px-12 lg:py-8">
      <header className="flex flex-wrap items-center justify-between gap-4 pr-24">
        <Logo />
        <StepProgress step={3} suffix="laatste stap" className="w-[260px] [&>p]:text-right" />
      </header>

      <main className="flex flex-col gap-5">
        <div>
          <h1 className="text-[32px] leading-[1.15] font-extrabold">
            Wat staat er nog open sinds het vorige {meetingName}?
          </h1>
          <p className="mt-1.5 text-base text-ink-2">
            Je hoeft niets over te typen. Plak je notities of een mail, of spreek het kort in. too-doo haalt de acties
            eruit; jij bevestigt.
          </p>
        </div>

        <div className="flex flex-wrap items-stretch gap-6">
          <section aria-label="Invoer" className="flex min-w-0 flex-[1_1_460px] flex-col gap-3">
            <div
              role="tablist"
              aria-label="Manier van invoeren"
              className="grid grid-cols-3 overflow-hidden rounded-xl border border-line"
            >
              {TABS.map((t, i) => {
                const on = extraction.tab === t.id;
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    ref={(el) => {
                      tabRefs.current[i] = el;
                    }}
                    type="button"
                    role="tab"
                    id={`tab-${t.id}`}
                    aria-selected={on}
                    aria-controls={`paneel-${t.id}`}
                    tabIndex={on ? 0 : -1}
                    onClick={() => update({ tab: t.id })}
                    onKeyDown={(e) => onTabKey(e, i)}
                    className={cn(
                      "flex min-h-12 cursor-pointer items-center justify-center gap-2 px-2 text-[15px] focus-visible:-outline-offset-4",
                      i > 0 && "border-l border-line",
                      on ? "bg-brand font-extrabold text-white" : "bg-white font-bold text-ink hover:bg-app",
                    )}
                  >
                    <Icon className="size-[18px] shrink-0" aria-hidden />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {extraction.tab === "plak" && (
              <div role="tabpanel" id="paneel-plak" aria-labelledby="tab-plak" className="flex flex-col gap-3">
                <label htmlFor="notities" className="text-sm font-bold">
                  Notities, verslag of mail van het vorige overleg
                </label>
                <textarea
                  id="notities"
                  rows={12}
                  value={extraction.text}
                  onChange={(e) => update({ text: e.target.value })}
                  className="resize-y rounded-xl border border-line bg-surface-muted p-3.5 text-[15px] leading-[1.6] text-ink outline-none focus-visible:border-brand focus-visible:shadow-[0_0_0_1px_var(--brand)] focus-visible:outline-none"
                />
                <div className="flex flex-wrap items-center gap-2.5">
                  <Button
                    variant="dark"
                    size="md"
                    disabled={busy !== null || !extraction.text.trim()}
                    onClick={() => extract(extraction.text)}
                  >
                    {busy === "extract" && <Loader2 className="size-4 animate-spin" aria-hidden />}
                    Haal de acties eruit
                  </Button>
                  <span className="text-[13px] text-ink-3">
                    Je tekst wordt alleen gebruikt om acties voor te stellen.
                  </span>
                </div>
              </div>
            )}

            {extraction.tab === "inspreken" && (
              <div
                role="tabpanel"
                id="paneel-inspreken"
                aria-labelledby="tab-inspreken"
                className="flex flex-col items-center gap-4 rounded-xl border border-line bg-surface-muted px-4 py-10 text-center"
              >
                <button
                  type="button"
                  onClick={listen}
                  disabled={busy !== null}
                  aria-label={busy === "listen" ? "Aan het luisteren" : "Start met inspreken"}
                  className={cn(
                    "flex size-28 cursor-pointer items-center justify-center rounded-full text-white shadow-[0_12px_30px_rgba(11,95,216,0.35)] transition-colors disabled:cursor-default",
                    busy === "listen" ? "animate-pulse bg-danger" : "bg-brand hover:bg-brand-hover",
                  )}
                >
                  <Mic className="size-12" aria-hidden />
                </button>
                <p role="status" className="text-[15px] font-bold">
                  {busy === "listen" ? "Aan het luisteren…" : "Druk en vertel kort wat er openstaat."}
                </p>
                <p className="max-w-[380px] text-[13px] text-ink-3">
                  Je ziet daarna wat too-doo hoorde, en welke acties het voorstelt. Je bevestigt alles zelf.
                </p>
              </div>
            )}

            {extraction.tab === "typen" && (
              <div role="tabpanel" id="paneel-typen" aria-labelledby="tab-typen" className="flex flex-col gap-2.5">
                <ActionRowHeader />
                {extraction.typed.map((row, i) => (
                  <ActionRow
                    key={i}
                    index={i}
                    value={row}
                    onChange={(patch) => updateTypedRow(i, patch)}
                    owners={owners}
                    people={people}
                    onAddPerson={addPerson}
                    whatPlaceholder={PLACEHOLDERS[i]}
                  />
                ))}
              </div>
            )}
          </section>

          <section
            aria-labelledby="voorstellen-titel"
            className="flex min-w-0 flex-[1_1_520px] flex-col gap-3 rounded-[18px] bg-app p-[22px]"
          >
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <h2 id="voorstellen-titel" className="text-[17px] font-extrabold">
                {proposals.length > 0
                  ? `${proposals.length} ${proposals.length === 1 ? "voorstel" : "voorstellen"} uit je notities`
                  : "Voorstellen"}
              </h2>
              {count > 0 && <span className="text-[13px] font-bold text-ink-2">Vink aan wat klopt</span>}
            </div>

            <div aria-live="polite" className="flex flex-col gap-3">
              {busy === "extract" ? (
                <p className="flex items-center gap-2.5 rounded-xl bg-white p-4 text-[15px] font-bold">
                  <Loader2 className="size-5 animate-spin text-brand" aria-hidden />
                  too-doo haalt de acties uit je tekst…
                </p>
              ) : (
                proposals.length === 0 &&
                typed.length === 0 && (
                  <p className="rounded-xl border border-dashed border-checkbox bg-white/60 p-4 text-sm text-ink-3">
                    Nog geen voorstellen. Haal de acties uit je notities, spreek ze in of typ ze zelf.
                  </p>
                )
              )}
            </div>

            {(proposals.length > 0 || typed.length > 0) && busy !== "extract" && (
              <ul className="flex flex-col gap-3">
                {proposals.map((p, i) => (
                  <ProposalRow
                    key={p.id}
                    proposal={p}
                    index={i}
                    owners={owners}
                    people={people}
                    agendaNote={`Geen actie maar een beslissing: komt op de agenda van ${weekday}`}
                    onChange={(patch) => updateProposal(p.id, patch)}
                  />
                ))}
                {typed.map((r, i) => {
                  const person = findPerson(people, r.ownerId);
                  const owner =
                    person ??
                    (r.ownerText.trim()
                      ? { name: r.ownerText.trim(), initials: initialsFrom(r.ownerText), color: AVATAR_COLORS[7] }
                      : undefined);
                  return (
                    <li
                      key={`typed-${i}`}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-track bg-white px-3.5 py-3"
                    >
                      <span className="min-w-0 flex-1 text-[15px] font-bold">{r.what}</span>
                      {owner && (
                        <span className="flex items-center gap-1.5 text-[13px] font-bold">
                          <Avatar person={owner} size={24} decorative />
                          {owner.name.split(" ")[0]}
                        </span>
                      )}
                      {r.deadline.trim() && <Tag>{r.deadline.trim()}</Tag>}
                      <Tag tone="brand">zelf getypt</Tag>
                    </li>
                  );
                })}
              </ul>
            )}

            {ownerNames.length > 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-track bg-white p-3.5">
                <Mail className="size-[22px] shrink-0 text-brand" aria-hidden />
                <p className="text-sm leading-normal">
                  <b>
                    {joinNl(ownerNames)}{" "}
                    {ownerNames.length === 1 ? "krijgt de acties per mail," : "krijgen hun acties per mail,"}
                  </b>{" "}
                  met een herinnering voor de deadline. Ze hoeven too-doo niet te openen. Pas na jouw bevestiging
                  versturen we iets.{" "}
                  <button
                    type="button"
                    onClick={() => setMailOpen(true)}
                    className="cursor-pointer font-bold text-brand underline hover:text-brand-hover"
                  >
                    Bekijk wat zij ontvangen
                  </button>
                </p>
              </div>
            )}

            <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
              <Button
                variant="link"
                className="min-h-11 px-0 text-sm font-semibold text-ink-2 underline"
                onClick={() => router.push("/b/overzicht")}
              >
                Overslaan, doe ik tijdens het overleg
              </Button>
              <Button
                disabled={count === 0 || busy !== null}
                onClick={() => {
                  confirm();
                  router.push("/b/overzicht");
                }}
              >
                Bevestig {count} {count === 1 ? "punt" : "punten"}
              </Button>
            </div>
          </section>
        </div>
      </main>

      <Dialog open={mailOpen} onOpenChange={setMailOpen}>
        <DialogContent className="max-w-[720px] bg-[#E9EDF3] p-4 sm:p-8">
          <DialogTitle className="sr-only">Wat een eigenaar per mail ontvangt</DialogTitle>
          <MailPreview data={mail} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
