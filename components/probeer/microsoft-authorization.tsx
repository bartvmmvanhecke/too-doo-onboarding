"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, UserRound } from "lucide-react";
import { MicrosoftMark } from "@/components/brand";

/** Local prototype only: never requests credentials or contacts Microsoft. */
export function MicrosoftAuthorization({ onAccept, onCancel }: { onAccept: () => void; onCancel: () => void }) {
  const [step, setStep] = useState<"account" | "consent">("account");
  const dialog = useRef<HTMLDialogElement>(null);
  const primary = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  useEffect(() => { primary.current?.focus(); }, [step]);
  const blue = "min-h-11 cursor-pointer bg-[#0067b8] px-6 text-[15px] text-white hover:bg-[#005da6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0067b8]";
  const permissions = [
    ["Je basisprofiel bekijken", "Met too-doo kunnen je naam, foto en gebruikersnaam worden weergegeven."],
    ["Toegang onderhouden tot gegevens waarvoor je too-doo toegang hebt verleend", "Hiermee kan too-doo de gegevens lezen waarvoor je toestemming hebt gegeven, ook wanneer je de app niet gebruikt. Dit geeft too-doo geen aanvullende machtigingen."],
    ["Je e-mailadres bekijken", "Met too-doo kan je primaire e-mailadres worden gelezen."],
    ["Je agenda’s lezen", "Met too-doo kunnen je afspraken en vaste vergaderingen worden gelezen."],
  ];
  return createPortal(
    <dialog ref={dialog} aria-labelledby="ms-title" onCancel={onCancel}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-y-auto border-0 p-0 text-[#1b1b1b] backdrop:bg-transparent"
      style={{ fontFamily: '"Segoe UI", Arial, sans-serif', background: "radial-gradient(ellipse at 12% 80%, #e4f4fa 0%, transparent 45%), radial-gradient(ellipse at 85% 20%, #eeeaf5 0%, transparent 50%), linear-gradient(135deg, #edf0f7, #faf6f5)" }}>
      <div className="flex min-h-full items-center justify-center px-4 py-8 sm:py-12">
        <section className="w-full max-w-[540px] bg-white p-6 shadow-[0_2px_10px_#0003] sm:p-11">
          <div className="mb-7 flex items-center gap-2 text-[24px] font-semibold text-[#737373]"><MicrosoftMark size={13} />Microsoft</div>
          {step === "account" ? <>
            <h1 id="ms-title" className="mb-6 text-[26px] font-semibold">Een account kiezen</h1>
            <div className="flex items-center gap-4 border-y border-[#ddd] bg-[#f2f2f2] py-5">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#e5e5e5]"><UserRound size={30} strokeWidth={1.4} /></span>
              <div><p className="text-[17px] font-semibold">Gert Janssens</p><p className="text-sm">gert.janssens@example.com</p><p className="mt-1 text-sm text-[#666]">Aangemeld</p></div>
            </div>
            <div className="mt-8 flex justify-end"><button ref={primary} type="button" className={blue} onClick={() => setStep("consent")}>Doorgaan</button></div>
          </> : <>
            <p className="mb-6 text-sm">gert.janssens@example.com</p>
            <div className="mb-6 flex items-start gap-4"><span aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-[#0785bb] text-2xl font-bold text-white">t</span><h1 id="ms-title" className="text-[25px] leading-tight font-semibold">Deze app toegang geven tot je gegevens?<span className="mt-2 block text-base font-normal text-[#0067b8]">too-doo</span></h1></div>
            <h2 className="mb-5 text-base font-semibold">too-doo heeft je toestemming nodig voor het volgende:</h2>
            <ul className="space-y-5">{permissions.map(([title, description], i) => <li key={title} className="flex items-start gap-3"><span className="mt-1 shrink-0">{i === 3 ? <CalendarDays size={28} className="text-[#2879b9]" /> : <MicrosoftMark size={12} />}</span><div><h3 className="text-base font-semibold">{title}</h3><p className="mt-1 text-[15px] leading-relaxed">{description}</p></div></li>)}</ul>
            <p className="mt-7 text-[13px] leading-relaxed">Door deze machtigingen te accepteren, geef je too-doo toegang tot de bovenstaande gegevens.</p>
            <div className="mt-7 flex justify-end gap-2"><button type="button" onClick={onCancel} className="min-h-11 cursor-pointer bg-[#ccc] px-5 text-[15px] hover:bg-[#bbb]">Weigeren</button><button ref={primary} type="button" className={blue} onClick={onAccept}>Accepteren</button></div>
          </>}
          <p className="mt-6 text-xs text-[#777]">Prototype · gesimuleerde Microsoft-autorisatie</p>
        </section>
      </div>
    </dialog>, document.body,
  );
}
