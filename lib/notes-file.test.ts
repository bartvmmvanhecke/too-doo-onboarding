import { describe, expect, it } from "vitest";
import { notesFileKind, textFromEml } from "@/lib/notes-file";

describe("notities uit een bestand", () => {
  it("herkent het soort bestand", () => {
    expect(notesFileKind("notities.txt")).toBe("text");
    expect(notesFileKind("verslag.MD")).toBe("text");
    expect(notesFileKind("mail.eml")).toBe("email");
    expect(notesFileKind("verslag.docx")).toBe("docx");
    expect(notesFileKind("verslag.pdf")).toBe("pdf");
    expect(notesFileKind("bord.jpg", "image/jpeg")).toBe("image");
    expect(notesFileKind("oud.doc")).toBe("other");
  });

  it("leest onderwerp en tekst uit een e-mail, ook multipart met quoted-printable", () => {
    const eml = [
      "From: Jan <jan@metaalwerken.be>",
      "Subject: Verslag productie 5/10",
      'Content-Type: multipart/alternative; boundary="b1"',
      "",
      "--b1",
      "Content-Type: text/plain; charset=utf-8",
      "Content-Transfer-Encoding: quoted-printable",
      "",
      "- plooibank: Jan vraagt nieuwe offerte, liefst voor vrijdag",
      "- caf=C3=A9 opruimen, Sofie",
      "--b1",
      "Content-Type: text/html",
      "",
      "<p>html</p>",
      "--b1--",
    ].join("\r\n");
    expect(textFromEml(eml)).toBe(
      "Verslag productie 5/10\n- plooibank: Jan vraagt nieuwe offerte, liefst voor vrijdag\n- café opruimen, Sofie",
    );
  });
});
