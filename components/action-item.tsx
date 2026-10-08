import { Avatar } from "@/components/avatar";
import type { Person } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

/** Eigenaar-avatar + deadline-chip, zoals in het paneel van stap 3 en in het overleg. */
export function ActionMeta({
  owner,
  deadline,
  emptyDeadline,
  size = 26,
}: {
  owner?: Pick<Person, "initials" | "color" | "name">;
  deadline: string;
  /** Tekst als er geen deadline is (bv. "geen deadline"); leeg = niets tonen. */
  emptyDeadline?: string;
  size?: number;
}) {
  return (
    <>
      {owner && <Avatar person={owner} size={size} />}
      {deadline ? (
        <span className={cn("rounded-md bg-line-faint px-2 py-[3px] font-bold whitespace-nowrap text-ink-2", size > 26 ? "px-2.5 py-1 text-[13px]" : "text-xs")}>
          {deadline}
        </span>
      ) : (
        emptyDeadline && <span className="text-[13px] font-semibold text-ink-3">{emptyDeadline}</span>
      )}
    </>
  );
}
