/**
 * Notities uit een bestand (SPEC-LAZY.md §4, Stap 1 punt 2). .txt, .md en .eml worden echt ingelezen;
 * .docx via mammoth en .pdf via pdfjs-dist, anders de vaste voorbeeldtekst. Afbeeldingen: de voorbeeldtekst
 * (OCR valt buiten het prototype). De bibliotheken laden pas wanneer een bestand ze nodig heeft.
 */
import { SAMPLE_NOTES } from "@/lib/extract";

export type NotesFileKind = "text" | "email" | "docx" | "pdf" | "image" | "other";

export interface NotesFileResult {
  name: string;
  kind: NotesFileKind;
  text: string;
  /** De tekst is de vaste voorbeeldtekst (bestand niet leesbaar of een afbeelding). */
  sample: boolean;
}

/** Wat de bestandskiezer aanbiedt. */
export const NOTES_ACCEPT = ".txt,.md,.eml,.docx,.pdf,image/*,text/plain,message/rfc822";

export function notesFileKind(name: string, type = ""): NotesFileKind {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (ext === "txt" || ext === "md" || type === "text/plain" || type === "text/markdown") return "text";
  if (ext === "eml" || type === "message/rfc822") return "email";
  if (ext === "docx") return "docx";
  if (ext === "pdf" || type === "application/pdf") return "pdf";
  if (type.startsWith("image/") || ["png", "jpg", "jpeg", "heic", "gif", "webp"].includes(ext)) return "image";
  return "other";
}

function decodeQuotedPrintable(s: string): string {
  const bytes = s
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-F]{2})/gi, (_, h: string) => String.fromCharCode(parseInt(h, 16)));
  try {
    return new TextDecoder().decode(Uint8Array.from(bytes, (c) => c.charCodeAt(0)));
  } catch {
    return bytes;
  }
}

/** Onderwerp en tekst uit een e-mail (.eml); bij multipart het eerste text/plain-deel. */
export function textFromEml(raw: string): string {
  const [head, ...rest] = raw.replace(/\r\n/g, "\n").split(/\n\n/);
  let body = rest.join("\n\n");
  const headers = head.replace(/\n[ \t]+/g, " ");
  const subject = headers.match(/^subject:\s*(.*)$/im)?.[1]?.trim() ?? "";
  const boundary = headers.match(/boundary="?([^";\n]+)"?/i)?.[1];
  let encoding = headers.match(/^content-transfer-encoding:\s*(\S+)/im)?.[1] ?? "";
  if (boundary) {
    const part = body.split(`--${boundary}`).find((p) => /content-type:\s*text\/plain/i.test(p.split(/\n\n/)[0] ?? ""));
    if (part) {
      const [partHead, ...partBody] = part.replace(/^\n/, "").split(/\n\n/);
      encoding = partHead.match(/content-transfer-encoding:\s*(\S+)/i)?.[1] ?? "";
      body = partBody.join("\n\n");
    }
  }
  if (/quoted-printable/i.test(encoding)) body = decodeQuotedPrintable(body);
  else if (/base64/i.test(encoding)) {
    try {
      body = new TextDecoder().decode(Uint8Array.from(atob(body.replace(/\s/g, "")), (c) => c.charCodeAt(0)));
    } catch {
      // Onleesbaar: laat de ruwe tekst staan.
    }
  }
  return [subject, body.trim()].filter(Boolean).join("\n");
}

async function textFromDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return result.value;
}

async function textFromPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  // De worker draait in de pagina zelf ("fake worker"): geen apart worker-bestand nodig.
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs");
  (globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = worker;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), verbosity: 0 }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    pages.push(content.items.map((item) => ("str" in item ? item.str + (item.hasEOL ? "\n" : "") : "")).join(""));
  }
  await doc.cleanup();
  return pages.join("\n");
}

/** Leest een bestand met notities. Lukt het niet, dan de vaste voorbeeldtekst. */
export async function readNotesFile(file: File): Promise<NotesFileResult> {
  const kind = notesFileKind(file.name, file.type);
  const sample = (): NotesFileResult => ({ name: file.name, kind, text: SAMPLE_NOTES, sample: true });
  try {
    let text = "";
    if (kind === "text") text = await file.text();
    else if (kind === "email") text = textFromEml(await file.text());
    else if (kind === "docx") text = await textFromDocx(file);
    else if (kind === "pdf") text = await textFromPdf(file);
    else return sample();
    return text.trim() ? { name: file.name, kind, text: text.trim(), sample: false } : sample();
  } catch {
    return sample();
  }
}
