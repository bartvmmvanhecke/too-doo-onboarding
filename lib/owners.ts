import type { OwnerOption } from "@/components/onboarding/owner-combobox";
import type { Person } from "@/lib/mock-data";
import { USER_PERSON_ID } from "@/lib/mock-data";
import { inSentence } from "@/lib/utils";

/** Suggesties voor "Wie?": jijzelf, de deelnemers van het overleg, en wie je al toevoegde. */
export function ownerOptions(
  people: Person[],
  participantIds: string[],
  meetingName: string,
  extraIds: string[],
): OwnerOption[] {
  const seen = new Set<string>();
  const out: OwnerOption[] = [];
  const push = (id: string, hint: string) => {
    const person = people.find((p) => p.id === id);
    if (!person || seen.has(id)) return;
    seen.add(id);
    out.push({ person, hint });
  };
  push(USER_PERSON_ID, "jij");
  for (const id of participantIds) push(id, `deelnemer ${inSentence(meetingName)}`);
  for (const id of extraIds) push(id, people.find((p) => p.id === id)?.email ?? "toegevoegd");
  return out;
}
