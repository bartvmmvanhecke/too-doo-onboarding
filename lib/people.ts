import { AVATAR_COLORS, GENERIC_EMAIL_DOMAINS, type Person } from "@/lib/mock-data";
import { uid, upperFirst } from "@/lib/utils";

export function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
}

/** "metaalwerken.be" → "Metaalwerken", "bouw-peeters.be" → "Bouw Peeters". Null voor gmail e.d. */
export function companyFromEmail(email: string): string | null {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return null;
  const parts = domain.split(".");
  const base = parts.length > 2 && parts[0] === "www" ? parts[1] : parts[0];
  if (!base || GENERIC_EMAIL_DOMAINS.includes(base)) return null;
  return base.split(/[-_]/).filter(Boolean).map(upperFirst).join(" ");
}

/** "jan.peeters@…" → { first: "Jan", last: "Peeters" } */
export function namesFromEmail(email: string): { first: string; last: string } {
  const local = email.split("@")[0] ?? "";
  const bits = local.split(/[._-]/).filter((b) => /^[a-zà-ÿ]+$/i.test(b));
  if (bits.length < 2) return { first: bits[0] ? upperFirst(bits[0]) : "", last: "" };
  return { first: upperFirst(bits[0]), last: bits.slice(1).map(upperFirst).join(" ") };
}

export function initialsFrom(nameOrEmail: string): string {
  const base = isEmail(nameOrEmail) ? nameOrEmail.split("@")[0].replace(/[._-]+/g, " ") : nameOrEmail;
  const words = base.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/** Nieuwe persoon via "Iemand anders toevoegen" (naam of e-mail). */
export function createPerson(input: string, index: number): Person {
  const value = input.trim();
  const email = isEmail(value) ? value : undefined;
  const derived = email ? namesFromEmail(email) : null;
  const name = derived?.first ? `${derived.first} ${derived.last}`.trim() : value;
  return {
    id: uid("p-"),
    name,
    email,
    initials: initialsFrom(email ?? value),
    color: AVATAR_COLORS[index % AVATAR_COLORS.length],
  };
}

export function firstName(p: Pick<Person, "name">): string {
  return p.name.split(" ")[0];
}
