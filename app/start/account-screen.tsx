"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { GoogleMark, MicrosoftMark } from "@/components/brand";
import { BenefitList } from "@/components/onboarding/benefit-list";
import { describedBy, Field } from "@/components/onboarding/field";
import { OnboardingLayout, PanelCard } from "@/components/onboarding/onboarding-layout";
import { StepProgress } from "@/components/onboarding/step-progress";
import { NotAvailableLink } from "@/components/site/client-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notAvailable } from "@/lib/not-available";
import { companyFromEmail, isEmail, namesFromEmail } from "@/lib/people";
import { useSsoLogin } from "@/lib/simulate";
import { useStore } from "@/lib/store";

const MIN_PASSWORD = 8;

/** Stap 1 · Account (SPEC.md §3.1): toestand A (kiezen) en B (naam en wachtwoord). */
export function AccountScreen() {
  const router = useRouter();
  const signIn = useStore((s) => s.signIn);
  // Flow 3 (variant B) gaat na het account naar de overlegstructuur (SPEC-FLOWS.md §2).
  const nextRoute = useStore((s) => (s.flow === 3 ? "/b/structuur" : "/overleg"));
  const { start, pending } = useSsoLogin();

  const [details, setDetails] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ first?: string; password?: string }>({});
  const emailRef = useRef<HTMLInputElement>(null);
  const firstRef = useRef<HTMLInputElement>(null);

  const company = companyFromEmail(email);

  const sso = async (provider: "microsoft" | "google") => {
    const outcome = await start(provider);
    router.push(outcome === "success" ? nextRoute : "/start/geblokkeerd");
  };

  const continueWithEmail = (e: FormEvent) => {
    e.preventDefault();
    if (!isEmail(email)) {
      setEmailError("Vul een geldig e-mailadres in.");
      emailRef.current?.focus();
      return;
    }
    setEmailError(null);
    const names = namesFromEmail(email);
    if (!first) setFirst(names.first);
    if (!last) setLast(names.last);
    setDetails(true);
    requestAnimationFrame(() => firstRef.current?.focus());
  };

  const createAccount = (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!first.trim()) next.first = "Vul je voornaam in.";
    if (password.length < MIN_PASSWORD) next.password = `Je wachtwoord heeft minstens ${MIN_PASSWORD} tekens nodig.`;
    setErrors(next);
    if (next.first || next.password) {
      document.getElementById(next.first ? "vn" : "pw")?.focus();
      return;
    }
    signIn({ firstName: first.trim(), lastName: last.trim(), email: email.trim(), company, method: "email" });
    router.push(nextRoute);
  };

  const languageSelect = (
    <label className="flex items-center gap-2 text-sm font-semibold text-ink-2">
      Taal
      <select
        value="nl"
        onChange={() => notAvailable()}
        className="min-h-11 cursor-pointer rounded-lg border border-line bg-white px-2.5 text-sm text-ink"
      >
        <option value="nl">Nederlands</option>
        <option value="fr">Français</option>
        <option value="en">English</option>
      </select>
    </label>
  );

  return (
    <OnboardingLayout
      headerAside={languageSelect}
      contentClassName="max-w-[420px] lg:mt-[72px]"
      panelLabel="Wat je krijgt"
      panel={
        <div className="flex w-full max-w-[460px] flex-col gap-5">
          <PanelCard className="gap-4 p-7 shadow-[0_20px_50px_rgba(14,60,140,0.12)]">
            <h2 className="text-xl font-extrabold">Binnen 3 minuten heb je</h2>
            <BenefitList
              items={[
                { text: "je belangrijkste vaste overleg in too-doo staan" },
                { text: "de acties die nu openstaan, met een eigenaar" },
                { text: "een agenda die openstaande acties vanzelf terugbrengt" },
              ]}
            />
          </PanelCard>
          <figure className="m-0 rounded-[18px] bg-white/70 px-6 py-[22px]">
            <blockquote className="text-base leading-normal font-semibold">
              &quot;[Kort citaat van een KMO-zaakvoerder]&quot;
            </blockquote>
            <figcaption className="mt-2 text-sm text-ink-2">[Naam], [functie] · [bedrijf]</figcaption>
          </figure>
          <ul className="flex flex-wrap gap-3.5 text-[13px] font-bold text-panel-ink">
            {["Data in de EU", "GDPR", "Belgisch bedrijf"].map((t, i) => (
              <li key={t} className="flex gap-3.5">
                {i > 0 && <span aria-hidden>·</span>}
                {t}
              </li>
            ))}
          </ul>
        </div>
      }
    >
      <StepProgress step={1} suffix="ongeveer 3 minuten" />
      <h1 className="text-[34px] leading-[1.15] font-extrabold">Maak je account aan</h1>
      <p className="text-base text-ink-2">30 dagen gratis. Geen creditcard nodig.</p>

      <p role="status" className="sr-only">
        {pending === "microsoft" ? "Verbinden met Microsoft…" : pending === "google" ? "Verbinden met Google…" : ""}
      </p>

      {!details ? (
        <div className="flex flex-col gap-5">
          <Button variant="dark" className="w-full" disabled={pending !== null} onClick={() => sso("microsoft")}>
            {pending === "microsoft" ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <MicrosoftMark />}
            {pending === "microsoft" ? "Verbinden met Microsoft…" : "Doorgaan met Microsoft"}
          </Button>
          <Button variant="outline" className="w-full" disabled={pending !== null} onClick={() => sso("google")}>
            {pending === "google" ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <GoogleMark />}
            {pending === "google" ? "Verbinden met Google…" : "Doorgaan met Google"}
          </Button>

          <div className="flex items-center gap-3 text-sm font-semibold text-ink-3">
            <span aria-hidden className="h-px flex-1 bg-track" />
            of met je werk-e-mail
            <span aria-hidden className="h-px flex-1 bg-track" />
          </div>

          <form noValidate onSubmit={continueWithEmail}>
            <Field id="mail" label="Werk-e-mail" error={emailError}>
              <div className="flex flex-wrap gap-2">
                <Input
                  ref={emailRef}
                  id="mail"
                  type="email"
                  autoComplete="email"
                  placeholder="jan.peeters@metaalwerken.be"
                  value={email}
                  aria-invalid={!!emailError}
                  aria-describedby={describedBy("mail", { error: !!emailError })}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-[1_1_220px]"
                />
                <Button type="submit" className="rounded-[10px] px-5">
                  Doorgaan
                </Button>
              </div>
            </Field>
          </form>

          <p className="rounded-[10px] bg-app px-3.5 py-3 text-[13px] leading-normal text-ink-2">
            Met Microsoft of Google nemen we enkel je naam en e-mail over. Je agenda koppelen is een aparte, vrije keuze
            in de volgende stap.
          </p>

          <p className="text-sm text-ink-2">
            Al een account?{" "}
            <Link href="/app" className="font-bold underline">
              Inloggen
            </Link>
          </p>
        </div>
      ) : (
        <form noValidate onSubmit={createAccount} className="flex flex-col gap-[18px]">
          <div className="flex items-center justify-between gap-3 rounded-[10px] border border-track bg-field-muted py-1 pr-2 pl-3.5">
            <span className="flex min-w-0 flex-col py-2">
              <span className="text-xs font-bold text-ink-3">Werk-e-mail</span>
              <span className="truncate text-[15px] font-bold">{email}</span>
            </span>
            <Button
              variant="link"
              className="min-h-11 text-sm no-underline"
              aria-label="Wijzig werk-e-mail"
              onClick={() => {
                setDetails(false);
                requestAnimationFrame(() => emailRef.current?.focus());
              }}
            >
              Wijzig
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field id="vn" label="Voornaam" error={errors.first}>
              <Input
                ref={firstRef}
                id="vn"
                autoComplete="given-name"
                value={first}
                aria-invalid={!!errors.first}
                aria-describedby={describedBy("vn", { error: !!errors.first })}
                onChange={(e) => setFirst(e.target.value)}
              />
            </Field>
            <Field id="an" label="Achternaam">
              <Input
                id="an"
                autoComplete="family-name"
                placeholder="Achternaam"
                value={last}
                onChange={(e) => setLast(e.target.value)}
              />
            </Field>
          </div>

          <Field id="pw" label="Wachtwoord" error={errors.password}>
            <Input
              id="pw"
              type="password"
              autoComplete="new-password"
              placeholder="Minstens 8 tekens"
              value={password}
              aria-invalid={!!errors.password}
              aria-describedby={describedBy("pw", { hint: true, error: !!errors.password })}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p
              id="pw-hint"
              className={
                password.length >= MIN_PASSWORD
                  ? "flex items-center gap-1.5 text-[13px] font-bold text-success"
                  : "flex items-center gap-1.5 text-[13px] text-ink-3"
              }
            >
              {password.length >= MIN_PASSWORD && <Check className="size-4" strokeWidth={2.5} aria-hidden />}
              Minstens {MIN_PASSWORD} tekens
            </p>
          </Field>

          <Button type="submit" className="w-full">
            Account aanmaken
            <ArrowRight className="size-[18px]" strokeWidth={2.5} aria-hidden />
          </Button>
          <p className="text-[13px] leading-normal text-ink-3">
            {company ? `Je bedrijf (${company}) vullen we in op basis van je e-mail. ` : ""}De bevestigingsmail volgt;
            je hoeft er niet op te wachten.
          </p>
          <p className="text-xs leading-normal text-ink-3">
            Met &quot;Account aanmaken&quot; ga je akkoord met de{" "}
            <NotAvailableLink href="#voorwaarden" className="underline">
              voorwaarden
            </NotAvailableLink>{" "}
            en het{" "}
            <NotAvailableLink href="#privacy" className="underline">
              privacybeleid
            </NotAvailableLink>
            .
          </p>
        </form>
      )}
    </OnboardingLayout>
  );
}
