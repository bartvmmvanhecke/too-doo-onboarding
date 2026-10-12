import type { GuestPerson } from "@/lib/assistant/types";
import { AVATAR_COLORS } from "@/lib/mock-data";
import { createPerson } from "@/lib/people";

/** Nieuwe deelnemer met enkel de naam zoals de gebruiker hem zei. */
export function guestPerson(name: string, index: number): GuestPerson {
  const p = createPerson(name, index);
  return { id: p.id, name: p.name, initials: p.initials, color: AVATAR_COLORS[index % AVATAR_COLORS.length] };
}

/** Voegt namen toe die nog niet in de lijst staan. */
export function addPeople(list: GuestPerson[], names: string[]): GuestPerson[] {
  const out = [...list];
  for (const name of names) {
    if (out.some((p) => p.name.toLowerCase() === name.toLowerCase())) continue;
    out.push(guestPerson(name, out.length));
  }
  return out;
}
