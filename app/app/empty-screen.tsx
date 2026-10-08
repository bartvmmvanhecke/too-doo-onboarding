"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Checklist } from "@/components/app/checklist";
import { MicrosoftMark } from "@/components/brand";
import { ChipSuggestions } from "@/components/onboarding/chip-suggestions";
import { describedBy } from "@/components/onboarding/field";
import { Eyebrow } from "@/components/onboarding/onboarding-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QUICK_NAME_SUGGESTIONS, RECURRENCE_LABEL, type Recurrence } from "@/lib/meeting";
import { useCalendarConsent } from "@/lib/simulate";
import { useOutlookBlocked, useStore, useUserFirstName } from "@/lib/store";
import { parseWhen } from "@/lib/when";

const RHYTHMS: Recurrence[] = ["weekly", "biweekly", "monthly", "once"];

const PREVIEW_BLOCKS = [
  {
    title: "Openstaande acties",
    text: "Wie doet wat tegen wanneer. Wat niet af is, komt vanzelf terug op het volgende overleg.",
  },
  { title: "Lopende zaken", text: "Je agendapunten. Geen vaste tijden of rollen nodig." },
  { title: "Varia", text: "Wat onverwacht ter sprake komt, ook als actie." },
];

const label = "text-[13px] font-bold";

/** Scherm 4b · Lege toestand (alles overgeslagen), SPEC.md §3.8. */
export function EmptyScreen() {
  const router = useRouter();
  const meetings = useStore((s) => s.meetings);
  const calendar = useStore((s) => s.calendar);
  const createMeeting = useStore((s) => s.createMeeting);
  const blocked = useOutlookBlocked();
  const firstName = useUserFirstName();
  const { connect, pending } = useCalendarConsent();
  const nameRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [when, setWhen] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence>("weekly");
  const [errors, setErrors] = useState<{ name?: string; when?: string }>({});

  // Met een overleg is /app geen lege toestand meer: toon het eerste overleg.
  useEffect(() => {
    if (meetings.length > 0) router.replace(`/app/overleg/${meetings[0].id}`);
  }, [meetings, router]);

  if (meetings.length > 0) return null;

  const create = (e: FormEvent) => {
    e.preventDefault();
    const parsed = parseWhen(when);
    const next = {
      name: name.trim() ? undefined : "Geef je overleg een naam.",
      when: parsed ? undefined : "Typ een dag en uur, bijv. ma 08:00.",
    };
    setErrors(next);
    if (next.name || next.when || !parsed) {
      document.getElementById(next.name ? "q-naam" : "q-wanneer")?.focus();
      return;
    }
    const id = createMeeting({ name: name.trim(), recurrence, date: parsed.date, time: parsed.time, duration: 60 });
    router.push(`/app/overleg/${id}`);
  };

  const connectOutlook = async () => {
    const outcome = await connect();
    if (outcome === "series" || outcome === "none") router.push("/overleg");
    else if (outcome === "admin") router.push("/overleg/goedkeuring");
    else toast("Geen probleem, vul het zelf in");
  };

  return (
    <>
      <div>
        <p className="text-[15px] font-semibold text-ink-2">Welkom, {firstName}</p>
        <h1 className="mt-1.5 text-[32px] font-extrabold">Zet je eerste vaste overleg klaar</h1>
        <p className="mt-1.5 max-w-[640px] text-base text-ink-2">
          Daarna verschijnen hier je agenda en de acties die openstaan. Het kost ongeveer een minuut.
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-4">
          <section aria-labelledby="snel-titel" className="rounded-2xl border border-track bg-white p-[22px]">
            <form noValidate onSubmit={create} className="flex flex-col gap-3.5">
              <h2 id="snel-titel" className="text-[17px] font-extrabold">
                Welk overleg wil je opvolgen?
              </h2>
              <div className="grid gap-2.5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <label htmlFor="q-naam" className={label}>
                    Naam
                  </label>
                  <Input
                    ref={nameRef}
                    id="q-naam"
                    autoComplete="off"
                    placeholder="Bijv. Productieoverleg"
                    value={name}
                    aria-invalid={!!errors.name}
                    aria-describedby={describedBy("q-naam", { error: !!errors.name })}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <label htmlFor="q-wanneer" className={label}>
                    Wanneer
                  </label>
                  <Input
                    id="q-wanneer"
                    autoComplete="off"
                    placeholder="ma 08:00"
                    value={when}
                    aria-invalid={!!errors.when}
                    aria-describedby={describedBy("q-wanneer", { error: !!errors.when })}
                    onChange={(e) => setWhen(e.target.value)}
                  />
                </div>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <label htmlFor="q-ritme" className={label}>
                    Hoe vaak
                  </label>
                  <select
                    id="q-ritme"
                    value={recurrence}
                    onChange={(e) => setRecurrence(e.target.value as Recurrence)}
                    className="min-h-12 min-w-0 cursor-pointer rounded-[10px] border border-line bg-white p-3 text-base text-ink"
                  >
                    {RHYTHMS.map((r) => (
                      <option key={r} value={r}>
                        {RECURRENCE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {(errors.name || errors.when) && (
                <div className="flex flex-col gap-1">
                  {errors.name && (
                    <p id="q-naam-error" className="text-[13px] font-bold text-danger">
                      {errors.name}
                    </p>
                  )}
                  {errors.when && (
                    <p id="q-wanneer-error" className="text-[13px] font-bold text-danger">
                      {errors.when}
                    </p>
                  )}
                </div>
              )}
              <ChipSuggestions
                label="Suggesties voor de naam"
                options={QUICK_NAME_SUGGESTIONS}
                value={name}
                onSelect={(n) => {
                  setName(n);
                  setErrors((e) => ({ ...e, name: undefined }));
                }}
              />
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button type="submit" size="md">
                  Maak overleg aan
                </Button>
                {!blocked && (
                  <>
                    <span className="text-sm text-ink-3">of</span>
                    {calendar === "idle" ? (
                      <Button variant="outline" size="md" className="px-4" disabled={pending} onClick={connectOutlook}>
                        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <MicrosoftMark size={7} />}
                        {pending ? "Wachten op Microsoft…" : "Koppel Outlook"}
                      </Button>
                    ) : (
                      <Button asChild variant="outline" size="md" className="px-4">
                        <Link href="/overleg">
                          <MicrosoftMark size={7} />
                          Haal uit Outlook
                        </Link>
                      </Button>
                    )}
                  </>
                )}
                <Link href="/voorbeeld" className="inline-flex min-h-11 items-center text-sm font-bold sm:ml-auto">
                  Bekijk eerst een voorbeeld
                </Link>
              </div>
            </form>
          </section>

          <section aria-labelledby="preview-titel" className="flex flex-col gap-2.5">
            <Eyebrow as="h2">
              <span id="preview-titel">Zo ziet je overleg er straks uit</span>
            </Eyebrow>
            {PREVIEW_BLOCKS.map((b) => (
              <div
                key={b.title}
                className="flex flex-col gap-1.5 rounded-[14px] border-2 border-dashed border-line bg-white/50 px-5 py-[18px]"
              >
                <h3 className="text-base font-extrabold text-ink-2">{b.title}</h3>
                <p className="text-sm text-ink-3">{b.text}</p>
              </div>
            ))}
          </section>
        </div>

        <Checklist
          items={[
            {
              id: "eerste",
              label: "Je eerste overleg klaarzetten",
              done: false,
              meta: "1 min",
              highlight: true,
              onSelect: () => nameRef.current?.focus(),
            },
            { id: "acties", label: "De acties noteren die nu openstaan", done: false },
            { id: "andere", label: "Je andere vaste overleggen toevoegen", done: false },
            { id: "collegas", label: "Je collega's uitnodigen", done: false },
          ]}
        />
      </div>
    </>
  );
}
