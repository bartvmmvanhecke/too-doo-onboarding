"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert } from "lucide-react";
import { toast } from "sonner";
import { Callout } from "@/components/callout";
import { BenefitList } from "@/components/onboarding/benefit-list";
import { describedBy, Field } from "@/components/onboarding/field";
import { ItEmailForm } from "@/components/onboarding/it-email-form";
import { OnboardingLayout, PanelCard } from "@/components/onboarding/onboarding-layout";
import { StepProgress } from "@/components/onboarding/step-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IT_MESSAGE, MOCK_USER } from "@/lib/mock-data";
import { companyFromEmail, isEmail } from "@/lib/people";
import { useStore } from "@/lib/store";

const MIN_PASSWORD = 8;

/** Stap 1b · Microsoft-login geblokkeerd door het bedrijf (SPEC.md §3.5). */
export function BlockedScreen() {
  const router = useRouter();
  const signIn = useStore((s) => s.signIn);
  const startManualDraft = useStore((s) => s.startManualDraft);
  const [email, setEmail] = useState(MOCK_USER.email);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; name?: string; password?: string }>({});
  const [mailIt, setMailIt] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next = {
      email: isEmail(email) ? undefined : "Vul een geldig e-mailadres in.",
      name: name.trim() ? undefined : "Vul je naam in.",
      password: password.length >= MIN_PASSWORD ? undefined : `Je wachtwoord heeft minstens ${MIN_PASSWORD} tekens nodig.`,
    };
    setErrors(next);
    const firstError = (["email", "name", "password"] as const).find((k) => next[k]);
    if (firstError) {
      document.getElementById({ email: "mail", name: "naam", password: "pw" }[firstError])?.focus();
      return;
    }
    const [firstName, ...rest] = name.trim().split(/\s+/);
    signIn({ firstName, lastName: rest.join(" "), email: email.trim(), company: companyFromEmail(email), method: "email-blocked" });
    startManualDraft();
    router.push("/overleg/zelf");
  };

  const copyMessage = async () => {
    const text = IT_MESSAGE(name.trim().split(/\s+/)[0] || MOCK_USER.firstName).join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      toast("Bericht voor IT gekopieerd");
    } catch {
      toast("Kopiëren lukte niet in deze browser");
    }
  };

  return (
    <OnboardingLayout
      contentClassName="max-w-[440px] gap-[18px] lg:mt-14"
      panelLabel="Wat je mist zonder Microsoft"
      panel={
        <PanelCard className="max-w-[460px] gap-3.5 p-7 shadow-[0_20px_50px_rgba(14,60,140,0.12)]">
          <h2 className="text-xl font-extrabold">Wat je mist zonder Microsoft</h2>
          <BenefitList
            items={[
              { text: "Alles van too-doo werkt: overleggen, agenda's, acties, opvolging en herinneringen" },
              { text: "Alleen je vaste overleggen haal je niet automatisch uit Outlook. Je typt ze zelf in.", muted: true },
              { text: "Koppelen kan later nog, zodra je IT-beheerder too-doo goedkeurt.", muted: true },
            ]}
          />
        </PanelCard>
      }
    >
      <StepProgress step={1} />

      <Callout live variant="warning" icon={<CircleAlert className="text-warning" />} title="Je bedrijf laat inloggen met Microsoft voor nieuwe apps niet toe">
        Dat is een instelling van je IT-beheerder, geen fout van jou. Je kunt too-doo gewoon testen met je werk-e-mail.
      </Callout>

      <h1 className="mt-2 text-[28px] leading-[1.2] font-extrabold">Ga verder met je werk-e-mail</h1>

      <form noValidate onSubmit={submit} className="flex flex-col gap-[18px]">
        <Field id="mail" label="Werk-e-mail" error={errors.email}>
          <Input
            id="mail"
            type="email"
            autoComplete="email"
            value={email}
            aria-invalid={!!errors.email}
            aria-describedby={describedBy("mail", { error: !!errors.email })}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-field-muted"
          />
        </Field>
        <Field id="naam" label="Je naam" error={errors.name}>
          <Input
            id="naam"
            autoComplete="name"
            placeholder="Voornaam en naam"
            value={name}
            aria-invalid={!!errors.name}
            aria-describedby={describedBy("naam", { error: !!errors.name })}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field id="pw" label="Kies een wachtwoord" error={errors.password}>
          <Input
            id="pw"
            type="password"
            autoComplete="new-password"
            placeholder="Minstens 8 tekens"
            value={password}
            aria-invalid={!!errors.password}
            aria-describedby={describedBy("pw", { error: !!errors.password })}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <div className="flex flex-col gap-3">
          <Button type="submit" className="w-full">
            Account aanmaken
          </Button>
          <p className="text-[13px] text-ink-3">Je vult je overleg daarna zelf in. Dat duurt ongeveer een minuut.</p>
        </div>
      </form>

      <details className="group border-t border-line-soft pt-3.5">
        <summary className="flex min-h-11 cursor-pointer items-center text-[15px] font-bold">
          Liever toch via Microsoft? Vraag het aan je IT-beheerder
        </summary>
        <div className="mt-2.5 flex flex-col gap-2.5">
          <p className="text-sm leading-normal text-ink-2">
            Je beheerder moet too-doo eenmalig goedkeuren in Microsoft. Wij sturen hem een korte uitleg; jij hoeft niet te
            wachten om te testen.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={copyMessage}>
              Kopieer bericht voor IT
            </Button>
            <Button variant="outline" size="sm" aria-expanded={mailIt} onClick={() => setMailIt(true)}>
              Mail de handleiding naar IT
            </Button>
          </div>
          {mailIt && (
            <ItEmailForm
              label="E-mail van je IT-beheerder"
              placeholder="it@metaalwerken.be"
              buttonLabel="Stuur handleiding"
              autoFocus
            />
          )}
        </div>
      </details>
    </OnboardingLayout>
  );
}
