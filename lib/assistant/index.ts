/** Gesimuleerde assistent van Variant A (SPEC-LAZY.md §4). Vervangbaar door een LLM met dezelfde in- en uitvoer. */
export { emptyMeeting, ownerQuestion, QUESTIONS, RECURRENCE_CHIPS, respond } from "@/lib/assistant/engine";
export * from "@/lib/assistant/format";
export { parseMeetingSentence, foundFields } from "@/lib/assistant/parse";
export * from "@/lib/assistant/types";
