"use client";

import { useState } from "react";
import { BlockCard, type AgendaMoves } from "@/components/meeting/agenda";
import { OwnerButton } from "@/components/meeting/bits";
import { useMeeting } from "@/components/meeting/meeting-context";
import { Button } from "@/components/ui/button";
import { daysLate, type AgendaBlock } from "@/lib/agenda";
import { formatShortDate } from "@/lib/date";
import { useStore, type Action } from "@/lib/store";
import { cn } from "@/lib/utils";

const VISIBLE = 4;

function DeadlineChip({ deadline }: { deadline: string }) {
  if (!deadline) return null;
  const late = daysLate(deadline);
  return (
    <span
      className={cn(
        "rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        late > 0 ? "bg-danger-bg text-danger" : "bg-app text-ink-3",
      )}
    >
      {late > 0 ? `${late} ${late === 1 ? "dag" : "dagen"} te laat` : deadline}
    </span>
  );
}

function ActionRow({ action }: { action: Action }) {
  const { meeting } = useMeeting();
  const { toggleAction, assignOwner } = useStore.getState();
  return (
    <li className="group flex min-h-11 items-center gap-2 rounded-[10px] px-2 hover:bg-row-hover focus-within:bg-row-hover">
      <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={action.done}
          onChange={() => toggleAction(meeting.id, action.id)}
          aria-label={`${action.what} afvinken`}
          className="m-0 size-4 shrink-0 accent-brand"
        />
        <span className={cn("min-w-0 truncate text-sm font-medium", action.done && "text-ink-3 line-through")}>
          {action.what}
        </span>
        {action.createdAt && (
          <span className="shrink-0 text-[13px] whitespace-nowrap text-ink-subtle">
            uit {formatShortDate(action.createdAt).replace(/^\S+ /, "")}
          </span>
        )}
      </label>
      <OwnerButton ownerId={action.ownerId} onPick={(id) => assignOwner(meeting.id, action.id, id)} />
      <DeadlineChip deadline={action.deadline} />
    </li>
  );
}

/** "Openstaande acties": komen vanzelf terug tot ze af zijn. */
export function OpenActionsBlock({
  block,
  index,
  moves,
  expanded,
  onToggle,
  adding,
  onAddingChange,
}: {
  block: AgendaBlock;
  index: number;
  moves: AgendaMoves;
  expanded: boolean;
  onToggle: () => void;
  adding: boolean;
  onAddingChange: (adding: boolean) => void;
}) {
  const { meeting } = useMeeting();
  const addAction = useStore((s) => s.addAction);
  const [showAll, setShowAll] = useState(false);
  const [text, setText] = useState("");
  const run = meeting.run;
  const open = meeting.actions.filter((a) => !a.done);
  const late = open.filter((a) => daysLate(a.deadline) > 0).length;
  const checked = meeting.actions.length - open.length;
  // Behandeld in een lopende vergadering: ingeklapt met een samenvatting.
  const handled = !!run && run.doneIds.includes(block.id);
  const visible = showAll ? meeting.actions : meeting.actions.slice(0, VISIBLE);

  const counts =
    open.length > 0 ? (
      <>
        {open.length} open
        {late > 0 && (
          <>
            {" · "}
            <span className="text-danger">{late} te laat</span>
          </>
        )}
      </>
    ) : null;

  return (
    <BlockCard
      block={block}
      index={index}
      moves={moves}
      expanded={expanded}
      onToggle={onToggle}
      bodyId={`block-${block.id}`}
      aside={
        handled ? (
          <span className="px-1 text-[13px] whitespace-nowrap text-ink-3">
            {checked} afgevinkt · {open.length} {open.length === 1 ? "loopt" : "lopen"} verder
          </span>
        ) : (
          counts && <span className="px-1 text-[13px] whitespace-nowrap text-ink-3">{counts}</span>
        )
      }
      meta={!handled && <p className="px-1 text-[13px] text-ink-3">komen vanzelf terug tot ze af zijn</p>}
      summary={
        block.duration ? (
          <span className="px-1 text-[13px] whitespace-nowrap text-ink-3 tabular-nums">{block.duration} min</span>
        ) : null
      }
    >
      {meeting.actions.length === 0 && !adding && (
        <p className="px-2 py-1.5 text-sm text-ink-3">
          Nog niets open. Acties die je tijdens de vergadering noteert, komen hier vanzelf terug tot ze af zijn.
        </p>
      )}
      {meeting.actions.length > 0 && (
        <ul className="flex flex-col">
          {visible.map((a) => (
            <ActionRow key={a.id} action={a} />
          ))}
        </ul>
      )}
      {meeting.actions.length > VISIBLE && (
        <Button
          variant="ghost"
          size="sm"
          className="self-start px-2 font-medium text-brand hover:text-brand"
          aria-expanded={showAll}
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? "Toon minder" : `Toon alle ${meeting.actions.length}`}
        </Button>
      )}
      {adding && (
        <input
          type="text"
          aria-label="Nieuwe actie"
          placeholder="Wat moet er gebeuren? Druk Enter"
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => !text.trim() && onAddingChange(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setText("");
              onAddingChange(false);
            }
            if (e.key === "Enter" && text.trim()) {
              e.preventDefault();
              addAction(meeting.id, { what: text.trim(), ownerId: null, deadline: "" });
              setText("");
            }
          }}
          className="mt-1.5 min-h-11 w-full rounded-[10px] border border-brand bg-white px-3 text-sm text-ink outline-none"
        />
      )}
    </BlockCard>
  );
}
