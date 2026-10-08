import type { Person } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type AvatarPerson = Pick<Person, "initials" | "color"> & { name?: string };

/**
 * Ronde avatar met initialen. `decorative` wanneer de naam al naast de avatar
 * staat; anders krijgt hij de naam als toegankelijke tekst.
 */
export function Avatar({
  person,
  size = 28,
  decorative = false,
  className,
}: {
  person: AvatarPerson;
  size?: number;
  decorative?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn("flex shrink-0 items-center justify-center rounded-full font-extrabold", className)}
      style={{
        width: size,
        height: size,
        background: person.color.bg,
        color: person.color.fg,
        fontSize: size >= 30 ? 12 : 11,
      }}
      {...(decorative || !person.name
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": person.name, title: person.name })}
    >
      {person.initials}
    </span>
  );
}

/** Eerste `max` avatars + "+N uit je agenda". */
export function AvatarStack({ people, max = 4, size = 30 }: { people: Person[]; max?: number; size?: number }) {
  if (people.length === 0) return null;
  const rest = people.length - max;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {people.slice(0, max).map((p) => (
        <Avatar key={p.id} person={p} size={size} />
      ))}
      {rest > 0 && <span className="ml-1 text-[13px] font-bold text-ink-2">+{rest} uit je agenda</span>}
    </div>
  );
}
