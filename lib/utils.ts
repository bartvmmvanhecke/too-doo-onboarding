import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Korte, unieke id voor client-side objecten (acties, agendapunten, ...). */
export function uid(prefix = ""): string {
  return prefix + Math.random().toString(36).slice(2, 9);
}

/** "a", "a en b", "a, b en c" */
export function joinNl(parts: string[]): string {
  if (parts.length <= 1) return parts.join("");
  return parts.slice(0, -1).join(", ") + " en " + parts[parts.length - 1];
}

export function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

export function upperFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Naam midden in een zin: "Productieoverleg" → "productieoverleg", "MT-vergadering" blijft. */
export function inSentence(name: string): string {
  const firstWord = name.split(/[^A-Za-zÀ-ÿ]/)[0] ?? "";
  if (firstWord.length >= 2 && firstWord === firstWord.toUpperCase()) return name;
  return lowerFirst(name);
}
