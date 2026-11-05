"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setAssistantOpener } from "@/components/app/help-menu";
import { ASSISTANT_PATH, startEmpty, startEntry, startTell } from "@/components/probeer/start-from-app";
import { StartOptions } from "@/components/probeer/welcome";
import { track } from "@/lib/track";
import { useUserFirstName } from "@/lib/store";

/**
 * Lege staat van Vergaderingen (ingelogd, nog geen vergaderingen): dezelfde vijf keuzes als het startscherm,
 * in de gewone app-layout. Geen assistentpaneel: "Vertel het me" vervult die rol.
 */
export function StartScreen() {
  const router = useRouter();
  const firstName = useUserFirstName();
  const [sentence, setSentence] = useState("");
  const [focusRequest, setFocusRequest] = useState(0);
  const [busy, setBusy] = useState(false);

  // "Vraag het de assistent" in het Hulp-menu: hier is dat het tekstvak van "Vertel het me".
  useEffect(() => setAssistantOpener(() => setFocusRequest((n) => n + 1)), []);

  const go = (start: () => void) => {
    if (busy) return;
    setBusy(true);
    start();
    router.push(ASSISTANT_PATH);
  };

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4 sm:pt-6">
      <p className="text-[15px] font-semibold text-ink-2">Welkom, {firstName}</p>
      <h1 className="text-[30px] leading-[1.15] font-extrabold tracking-[-0.5px] sm:text-[36px]">
        Laten we je eerste overleg klaarzetten.
      </h1>
      <p className="text-[17px] leading-normal text-ink-2">
        Kies wat je al bij de hand hebt. Je kunt alles later aanpassen.
      </p>
      <StartOptions
        layout="grid"
        selected="meeting"
        disabled={busy}
        sentence={sentence}
        onSentenceChange={setSentence}
        onTell={() => {
          const text = sentence.trim();
          if (text) go(() => startTell(text));
        }}
        telling={busy}
        focusRequest={focusRequest}
        onChoose={(c) => (c === "meeting" ? setFocusRequest((n) => n + 1) : go(() => startEntry(c)))}
        onEmpty={() => go(startEmpty)}
        onExample={() => {
          track("assistant_entry_chosen", { ingang: "example", bron: "app" });
          router.push("/voorbeeld");
        }}
        exampleHref="/voorbeeld"
        exampleTag="met rondleiding · 2 min"
      />
    </div>
  );
}
