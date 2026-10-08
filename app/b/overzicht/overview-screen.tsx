"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppUi } from "@/components/app/app-ui";
import { Avatar } from "@/components/avatar";
import { OwnerPicker } from "@/components/b/owner-picker";
import { StatTile } from "@/components/b/stat-tile";
import { Tag } from "@/components/tag";
import { Button } from "@/components/ui/button";
import { allItems } from "@/lib/agenda";
import { formatShortDate } from "@/lib/date";
import { USER_PERSON_ID } from "@/lib/mock-data";
import { ownerOptions } from "@/lib/owners";
import { findPerson, usePeople, useStore, useUserFirstName } from "@/lib/store";
import { formatTime } from "@/lib/time";
import { cn, joinNl } from "@/lib/utils";

const card = "flex flex-col gap-1 rounded-[14px] border border-line-soft bg-white px-5 py-[18px]";
const row = "flex flex-wrap items-center gap-3 border-t border-line-faint py-2.5";

const subscribe = () => () => {};
/** Begroeting volgens het uur (SPEC.md §8). */
function useGreeting(): string {
  const hour = useSyncExternalStore(
    subscribe,
    () => new Date().getHours(),
    () => 9,
  );
  return hour < 12 ? "Goedemorgen" : hour < 18 ? "Goedemiddag" : "Goedenavond";
}

/** Variant B · Landen in het overzicht: dit volgt too-doo voor je op (SPEC-FLOWS.md §4). */
export function OverviewScreen() {
  const router = useRouter();
  const meetings = useStore((s) => s.meetings);
  const targetId = useStore((s) => s.b.targetMeetingId);
  const extraPeople = useStore((s) => s.extraPeople);
  const assignOwner = useStore((s) => s.assignOwner);
  const firstName = useUserFirstName();
  const greeting = useGreeting();
  const people = usePeople();
  const { setAddMeetingsOpen } = useAppUi();

  useEffect(() => {
    if (meetings.length === 0) router.replace("/b/structuur");
  }, [meetings.length, router]);
  if (meetings.length === 0) return null;

  const target = meetings.find((m) => m.id === targetId) ?? meetings[0];
  const all = meetings.flatMap((m) => m.actions.filter((a) => !a.done).map((a) => ({ action: a, meeting: m })));
  const unowned = all.filter((x) => !x.action.ownerId);
  const owned = all.filter((x) => x.action.ownerId);
  const decisions = meetings.flatMap((m) =>
    allItems(m.blocks)
      .filter((i) => i.purposes.includes("decide"))
      .map((item) => ({ item, meeting: m })),
  );
  const targetActions = target.actions.filter((a) => !a.done).length;
  const targetDecisions = allItems(target.blocks).filter((i) => i.purposes.includes("decide")).length;
  const mailedNames = [
    ...new Set(
      owned.filter((x) => x.action.mailed).map((x) => findPerson(people, x.action.ownerId)?.name.split(" ")[0]),
    ),
  ].filter((x): x is string => !!x);
  // De gebruiker krijgt zelf ook een mail als hij eigenaar is (zoals in de mockup).
  const ownNames = owned.some((x) => x.action.ownerId === USER_PERSON_ID) ? [firstName] : [];
  const notified = [...new Set([...ownNames, ...mailedNames])];

  const readyText = [
    targetActions > 0 && `${targetActions} ${targetActions === 1 ? "actie" : "acties"}`,
    targetDecisions > 0 && `${targetDecisions} ${targetDecisions === 1 ? "beslissing" : "beslissingen"}`,
  ].filter(Boolean);

  return (
    <>
      <div>
        <p className="text-[15px] font-semibold text-ink-2">
          {greeting} {firstName}
        </p>
        <h1 className="mt-1 text-[30px] font-extrabold">Dit volgt too-doo nu voor je op</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile value={all.length} label="open acties" />
        <StatTile value={unowned.length} label="zonder eigenaar" tone={unowned.length ? "warning" : "plain"} />
        <StatTile value={decisions.length} label="beslissing nodig" />
        <StatTile value={meetings.length} label="overleggen opgevolgd" />
      </div>

      <div className="flex flex-wrap items-start gap-[18px]">
        <div className="flex min-w-0 flex-[999_1_460px] flex-col gap-3.5">
          <section aria-labelledby="aandacht" className={card}>
            <h2 id="aandacht" className="pb-2 text-[17px] font-extrabold">
              Vraagt je aandacht
            </h2>
            {unowned.length === 0 && decisions.length === 0 && (
              <p className="border-t border-line-faint py-2.5 text-sm text-ink-3">Niets dat nu je aandacht vraagt.</p>
            )}
            <ul>
              {unowned.map(({ action, meeting }) => (
                <li key={action.id} className={row}>
                  <span className="min-w-0 flex-1 text-[15px] font-bold">{action.what}</span>
                  <span className="text-[13px] text-ink-2">{meeting.name}</span>
                  <OwnerPicker
                    label="Wie doet het?"
                    people={ownerOptions(
                      people,
                      meeting.participants,
                      meeting.name,
                      extraPeople.map((p) => p.id),
                    )}
                    onPick={(ownerId) => assignOwner(meeting.id, action.id, ownerId)}
                  >
                    <button
                      type="button"
                      aria-label={`Wijs iemand aan voor ${action.what}`}
                      className="flex min-h-11 cursor-pointer items-center"
                    >
                      <span className="rounded-full border border-dashed border-[#E8A33D] bg-warning-bg px-3 py-1 text-[13px] font-extrabold text-[#7A3F04]">
                        Wijs iemand aan
                      </span>
                    </button>
                  </OwnerPicker>
                </li>
              ))}
              {decisions.map(({ item, meeting }) => (
                <li key={item.id} className={cn(row, "min-h-11")}>
                  <span className="min-w-0 flex-1 text-[15px] font-bold">{item.text}</span>
                  <span className="text-[13px] text-ink-2">{meeting.name}</span>
                  <Tag tone="decision" className="text-[13px]">
                    {meeting.date ? `beslissen op ${formatShortDate(meeting.date)}` : "beslissen"}
                  </Tag>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="wie-doet-wat" className={card}>
            <div className="flex items-center justify-between gap-3 pb-2">
              <h2 id="wie-doet-wat" className="text-[17px] font-extrabold">
                Wie doet wat
              </h2>
              <span className="text-[13px] text-ink-3">per mail opgevolgd</span>
            </div>
            {owned.length === 0 && (
              <p className="border-t border-line-faint py-2.5 text-sm text-ink-3">Nog geen acties met een eigenaar.</p>
            )}
            <ul>
              {owned.map(({ action }) => {
                const owner = findPerson(people, action.ownerId);
                return (
                  <li key={action.id} className={cn(row, "min-h-11")}>
                    {owner && <Avatar person={owner} size={28} />}
                    <span className="min-w-0 flex-1 text-[15px] font-semibold">{action.what}</span>
                    {action.deadline ? (
                      <Tag className="text-[13px] font-bold">{action.deadline}</Tag>
                    ) : action.mailed ? (
                      <span className="text-[13px] font-semibold text-[#1E6B45]">mail verstuurd</span>
                    ) : (
                      <span className="text-[13px] font-semibold text-ink-3">geen datum</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <section
            aria-labelledby="volgend-overleg"
            className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-line-soft bg-white px-5 py-[18px]"
          >
            <div className="flex flex-col">
              <h2 id="volgend-overleg" className="text-[13px] font-extrabold tracking-[0.5px] text-ink-3 uppercase">
                Volgend overleg
              </h2>
              <p className="text-[17px] font-extrabold">
                {target.name}
                {target.date ? ` · ${formatShortDate(target.date)}` : ""}
                {target.time !== null ? `, ${formatTime(target.time)}` : ""}
              </p>
              <p className="text-sm text-ink-2">
                {readyText.length > 0
                  ? `${joinNl(readyText as string[])} staan al klaar op de agenda`
                  : "De startagenda staat klaar"}
              </p>
            </div>
            <Button asChild size="sm" className="text-[15px]">
              <Link href={`/app/overleg/${target.id}`}>Bekijk de agenda</Link>
            </Button>
          </section>
        </div>

        <aside
          aria-labelledby="nu-gebeurt"
          className="flex min-w-0 flex-[1_1_280px] flex-col gap-2.5 rounded-[14px] border-2 border-brand bg-white p-5"
        >
          <h2 id="nu-gebeurt" className="text-[13px] font-extrabold text-brand">
            Wat er nu gebeurt
          </h2>
          <ol className="flex flex-col gap-2.5">
            {[
              notified.length > 0
                ? `${joinNl(notified)} ${notified.length === 1 ? "heeft de actie" : "hebben hun actie"} per mail gekregen.`
                : "Eigenaars krijgen hun acties per mail zodra je ze aanwijst.",
              "Zondagavond krijg je een mail met wat open staat voor maandag.",
              "Na het overleg gaat het verslag met acties naar alle deelnemers.",
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm leading-[1.45]">
                <span
                  aria-hidden
                  className={cn(
                    "flex size-[22px] shrink-0 items-center justify-center rounded-full text-xs font-extrabold",
                    i === 0 && notified.length > 0 ? "bg-success-bg text-success-ink" : "bg-line-faint text-ink-2",
                  )}
                >
                  {i + 1}
                </span>
                {text}
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={() => setAddMeetingsOpen(true)}
            className="mt-1.5 min-h-11 cursor-pointer self-start text-left text-sm font-bold text-brand underline hover:text-brand-hover"
          >
            Volg ook je andere overleggen op
          </button>
        </aside>
      </div>
    </>
  );
}
