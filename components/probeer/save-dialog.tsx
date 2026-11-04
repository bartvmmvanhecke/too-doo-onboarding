"use client";

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { GoogleMark, MicrosoftMark } from "@/components/brand";
import { Callout } from "@/components/callout";
import { CodeInput } from "@/components/probeer/code-input";
import { saveGuestToApp, ssoUser } from "@/components/probeer/save-guest";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mailOwners, weekdayName, whenShort } from "@/lib/assistant/format";
import { useGuestStore } from "@/lib/guest-store";
import { companyFromEmail, isEmail, namesFromEmail } from "@/lib/people";
import { useSsoLogin } from "@/lib/simulate";
import type { SaveIntent, User } from "@/lib/store";
import { track } from "@/lib/track";
import { cn, joinNl } from "@/lib/utils";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function introText(intent: SaveIntent, day: string | null): string {
  const back = `vind je je overleg ${day ?? "straks"} terug, ook op je gsm`;
  switch (intent) {
    case "send":
      return `Dan versturen we de mails in jouw naam en ${back}. Geen wachtwoord nodig.`;
    case "invite":
      return "Dan kan je je deelnemers uitnodigen; zij hebben geen account nodig. Geen wachtwoord nodig.";
    case "start":
      return "Dan start je het overleg en kan je het verslag daarna versturen. Geen wachtwoord nodig.";
    case "login":
      return "Wat je hier al klaarzette, gaat mee naar je account. Geen wachtwoord nodig.";
    default:
      return `Dan ${back}. Geen wachtwoord nodig.`;
  }
}

/** "Dit bewaren we voor je", berekend uit de gast-state. */
function SaveSummary({ intent }: { intent: SaveIntent }) {
  const meeting = useGuestStore((s) => s.meeting);
  const actions = useGuestStore((s) => s.actions);
  const decisions = useGuestStore((s) => s.decisions);
  const others = useGuestStore((s) => s.others);
  if (!meeting.name && others.length === 0) return null;
  const withOwner = actions.filter((a) => a.confirmed && a.ownerId).length;
  const owners = mailOwners(actions, meeting.participants);
  const when = whenShort(meeting);
  return (
    <aside aria-label="Wat we bewaren" className="flex flex-col gap-3 rounded-2xl bg-app p-5">
      <span className="text-[13px] font-extrabold tracking-[0.4px] text-ink-3 uppercase">Dit bewaren we voor je</span>
      {meeting.name && (
        <div className="flex flex-col gap-1.5 rounded-xl bg-white p-4">
          <span className="text-base font-extrabold">{meeting.name}</span>
          {when && <span className="text-sm text-ink-2">{when}</span>}
          <ul className="mt-1.5 flex flex-col gap-1 text-sm font-semibold">
            <li>{plural(withOwner, "actie met eigenaar", "acties met eigenaar")}</li>
            <li>{plural(decisions.length, "beslissing op de agenda", "beslissingen op de agenda")}</li>
            <li>{plural(meeting.participants.length + 1, "deelnemer", "deelnemers")}</li>
          </ul>
        </div>
      )}
      {others.length > 0 && (
        <span className="text-sm text-ink-2">En ook: {others.map((o) => o.meeting.name).join(", ")}</span>
      )}
      {intent === "send" && owners.length > 0 && (
        <div className="flex flex-col gap-1 rounded-xl border border-proposal-line bg-brand-selected p-4">
          <span className="text-sm font-extrabold">Daarna meteen verstuurd</span>
          <span className="text-sm text-ink-2">
            {joinNl(owners.map((p) => p.name))} {owners.length === 1 ? "krijgt" : "krijgen"} hun actie per mail. Jij
            bevestigt eerst hun e-mailadres.
          </span>
        </div>
      )}
    </aside>
  );
}

/** "Dit nemen we mee" voor een zin die nog geen overleg is. */
function DraftSummary({ draft }: { draft: string }) {
  return (
    <aside aria-label="Wat we meenemen" className="flex flex-col gap-3 rounded-2xl bg-app p-5">
      <span className="text-[13px] font-extrabold tracking-[0.4px] text-ink-3 uppercase">Dit nemen we mee</span>
      <blockquote className="rounded-xl bg-white p-4 text-[15px] leading-normal font-semibold break-words">
        “{draft}”
      </blockquote>
      <span className="text-sm text-ink-2">Na het inloggen wordt dit je agenda. Je hoeft niets opnieuw te typen.</span>
    </aside>
  );
}

/** Wat de proefomgeving al bevat; zonder inhoud is "inloggen" gewoon inloggen. */
function useHasGuestContent() {
  return useGuestStore((s) => !!s.meeting.name || s.others.length > 0);
}

/**
 * Bewaar-modal van Variant A (C5): het account komt als "bewaren". Microsoft (demo-uitkomsten, bij
 * "geblokkeerd" terugval op e-mail), Google, of werk-e-mail met een code van 6 cijfers. Geen wachtwoord.
 * Wie al een account heeft, schakelt naar "inloggen": daar kan het ook met e-mail en wachtwoord.
 * Wat in de proefomgeving klaarstaat, gaat in beide gevallen mee.
 */
export function SaveDialog({
  intent,
  draft = null,
  onClose,
  onSaved,
  onKeepDraft,
}: {
  intent: SaveIntent | null;
  /** Wat al getypt werd maar nog geen overleg is (de zin in "Vertel het me" op het welkomstscherm). */
  draft?: string | null;
  onClose: () => void;
  onSaved: (meetingId: string | null, intent: SaveIntent) => void;
  /** Met een draft en verder niets: inloggen en daarna verder in de proefomgeving, de draft gaat niet verloren. */
  onKeepDraft?: (user: User) => void;
}) {
  const hasContent = useHasGuestContent();
  const wide = hasContent || !!draft;
  return (
    <Dialog open={intent !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={cn("gap-0 p-0 sm:p-0", wide ? "max-w-[920px]" : "max-w-[560px]")}>
        {intent && <SaveForm intent={intent} draft={draft} onSaved={onSaved} onKeepDraft={onKeepDraft} />}
      </DialogContent>
    </Dialog>
  );
}

function SaveForm({
  intent,
  draft,
  onSaved,
  onKeepDraft,
}: {
  intent: SaveIntent;
  draft: string | null;
  onSaved: (id: string | null, intent: SaveIntent) => void;
  onKeepDraft?: (user: User) => void;
}) {
  const meeting = useGuestStore((s) => s.meeting);
  const hasContent = useHasGuestContent();
  // Enkel een getypte zin, nog geen overleg: die gaat mee en wordt na het inloggen je agenda.
  const keepDraft = !hasContent && !!draft && !!onKeepDraft;
  const { start, pending } = useSsoLogin();
  // "signup": nieuw account via code (geen wachtwoord). "login": bestaand account, ook met wachtwoord.
  const [mode, setMode] = useState<"signup" | "login">(intent === "login" ? "login" : "signup");
  const [withPassword, setWithPassword] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [stage, setStage] = useState<"choose" | "code">("choose");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const login = mode === "login";
  const passwordForm = login && withPassword && !blocked;

  const switchMode = (next: "signup" | "login") => {
    setMode(next);
    setWithPassword(true);
    setStage("choose");
    setCode("");
    setError(null);
    setPasswordError(null);
    requestAnimationFrame(() => emailRef.current?.focus());
  };

  const finish = (user: User) => {
    if (keepDraft) {
      track("signup_completed", { methode: user.method, intent, draft: true });
      return onKeepDraft?.(user);
    }
    onSaved(saveGuestToApp(user, intent), intent);
  };

  const userFromEmail = (method: User["method"]): User => {
    const names = namesFromEmail(email);
    return {
      firstName: names.first || email.split("@")[0],
      lastName: names.last,
      email: email.trim(),
      company: companyFromEmail(email),
      method,
    };
  };

  const sso = async (provider: "microsoft" | "google") => {
    track("signup_method_selected", { methode: provider, modus: mode });
    setError(null);
    const outcome = await start(provider);
    track("sso_result", { provider, resultaat: outcome });
    if (outcome === "success") return finish(ssoUser(provider));
    setBlocked(true);
    setError("Inloggen met Microsoft lukt niet bij je bedrijf. Gebruik je werk-e-mail.");
    requestAnimationFrame(() => emailRef.current?.focus());
  };

  const checkEmail = () => {
    if (isEmail(email)) return true;
    setError("Vul je werk-e-mailadres in, bijvoorbeeld naam@bedrijf.be.");
    emailRef.current?.focus();
    return false;
  };

  const sendCode = () => {
    if (!checkEmail()) return;
    track("signup_method_selected", { methode: "email", modus: mode });
    setError(null);
    setStage("code");
  };

  const loginWithPassword = async () => {
    if (!checkEmail()) return;
    setError(null);
    if (!password) {
      setPasswordError("Vul je wachtwoord in.");
      passwordRef.current?.focus();
      return;
    }
    setPasswordError(null);
    track("signup_method_selected", { methode: "password", modus: mode });
    setBusy(true);
    await new Promise((r) => setTimeout(r, 400));
    finish(userFromEmail("email"));
  };

  const confirmCode = async () => {
    if (!/^\d{6}$/.test(code)) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, 400));
    finish(userFromEmail(blocked ? "email-blocked" : "email"));
  };

  const title = keepDraft
    ? login
      ? "Log in. Wat je typte, ben je niet kwijt."
      : "Maak je account aan. Wat je typte, ben je niet kwijt."
    : login
      ? hasContent
        ? "Log in. Je overleg gaat mee naar je account."
        : "Welkom terug. Log in op je account."
      : hasContent
        ? "Bewaar je overleg. Het blijft precies zoals het is."
        : "Maak je account aan.";
  const description = keepDraft
    ? "Na het inloggen maken we er meteen je agenda van, en die komt in je account te staan."
    : login
      ? hasContent
        ? "Wat je hier al klaarzette, komt bij je bestaande overleggen te staan."
        : "Met hetzelfde account als altijd: Microsoft, Google of je e-mail en wachtwoord."
      : hasContent
        ? introText(intent, weekdayName(meeting))
        : "30 dagen gratis, geen creditcard. Geen wachtwoord nodig.";
  const emailError = error && !blocked ? error : null;

  return (
    <div
      className={
        hasContent || keepDraft ? "grid gap-6 p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_300px]" : "grid gap-6 p-6 sm:p-8"
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5 pr-12">
          <DialogTitle className="text-[26px] leading-tight">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
          <p className="flex flex-wrap items-center gap-1 text-sm text-ink-2">
            {login ? "Nog geen account?" : "Al een account?"}
            <Button
              variant="link"
              size="sm"
              className="h-auto min-h-0 px-0 text-sm font-bold"
              onClick={() => switchMode(login ? "signup" : "login")}
            >
              {login ? "Maak een account aan" : "Log in"}
            </Button>
          </p>
        </div>

        {stage === "choose" ? (
          <>
            <Button variant="outline" size="lg" disabled={pending !== null || busy} onClick={() => sso("microsoft")}>
              {pending === "microsoft" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <MicrosoftMark />}
              {login ? "Inloggen met Microsoft" : "Doorgaan met Microsoft"}
            </Button>
            <Button variant="outline" size="lg" disabled={pending !== null || busy} onClick={() => sso("google")}>
              {pending === "google" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <GoogleMark />}
              {login ? "Inloggen met Google" : "Doorgaan met Google"}
            </Button>
            {error && blocked && (
              <Callout live variant="warning">
                {error}
              </Callout>
            )}
            <div className="flex items-center gap-3 text-sm text-ink-3">
              <span aria-hidden className="h-px flex-1 bg-line-soft" />
              {passwordForm ? "of met je e-mail en wachtwoord" : "of met je werk-e-mail"}
              <span aria-hidden className="h-px flex-1 bg-line-soft" />
            </div>
            {passwordForm ? (
              <form
                noValidate
                className="flex flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void loginWithPassword();
                }}
              >
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="bewaar-email">E-mail</Label>
                  <Input
                    ref={emailRef}
                    id="bewaar-email"
                    type="email"
                    autoComplete="username"
                    placeholder="naam@bedrijf.be"
                    value={email}
                    aria-invalid={!!emailError}
                    aria-describedby={emailError ? "bewaar-email-error" : undefined}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  {emailError && (
                    <span id="bewaar-email-error" className="text-sm text-danger">
                      {emailError}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="bewaar-pw">Wachtwoord</Label>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto px-0 text-sm"
                      onClick={() => {
                        setWithPassword(false);
                        setPasswordError(null);
                        requestAnimationFrame(() => emailRef.current?.focus());
                      }}
                    >
                      Wachtwoord vergeten?
                    </Button>
                  </div>
                  <Input
                    ref={passwordRef}
                    id="bewaar-pw"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    aria-invalid={!!passwordError}
                    aria-describedby="bewaar-pw-hint"
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <span
                    id="bewaar-pw-hint"
                    className={passwordError ? "text-sm text-danger" : "text-[13px] text-ink-3"}
                  >
                    {passwordError ?? "In het prototype werkt elk wachtwoord."}
                  </span>
                </div>
                <Button type="submit" size="default" className="self-start" disabled={busy}>
                  {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
                  Inloggen
                </Button>
              </form>
            ) : (
              <form
                noValidate
                className="flex flex-col gap-1.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendCode();
                }}
              >
                <Label htmlFor="bewaar-email">Werk-e-mail</Label>
                <div className="flex flex-wrap gap-2">
                  <Input
                    ref={emailRef}
                    id="bewaar-email"
                    type="email"
                    autoComplete="email"
                    placeholder="naam@bedrijf.be"
                    value={email}
                    aria-invalid={!!emailError}
                    aria-describedby="bewaar-email-hint"
                    onChange={(e) => setEmail(e.target.value)}
                    className="min-w-0 flex-[1_1_220px]"
                  />
                  <Button type="submit" size="default">
                    Stuur me een code
                  </Button>
                </div>
                <span id="bewaar-email-hint" className={emailError ? "text-sm text-danger" : "text-sm text-ink-3"}>
                  {emailError ?? "Je krijgt een code van 6 cijfers. Dit venster blijft open."}
                </span>
                {login && !blocked && (
                  <Button
                    variant="link"
                    size="sm"
                    className="self-start px-0"
                    onClick={() => {
                      setWithPassword(true);
                      setError(null);
                      requestAnimationFrame(() => emailRef.current?.focus());
                    }}
                  >
                    Inloggen met wachtwoord
                  </Button>
                )}
              </form>
            )}
          </>
        ) : (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void confirmCode();
            }}
          >
            <p className="text-[15px]">
              We stuurden een code van 6 cijfers naar <strong className="break-all">{email}</strong>.
            </p>
            <CodeInput value={code} onChange={setCode} label="Code van 6 cijfers" />
            <p className="text-[13px] text-ink-3">In het prototype werkt elke code van 6 cijfers.</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" size="default" disabled={code.length !== 6 || busy}>
                {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
                {login ? "Inloggen" : hasContent ? "Bewaar mijn vergadering" : "Maak mijn account"}
              </Button>
              <Button
                variant="link"
                size="sm"
                onClick={() => {
                  setCode("");
                  toast(`Nieuwe code verstuurd naar ${email}`);
                }}
              >
                Code opnieuw sturen
              </Button>
              <Button variant="link" size="sm" onClick={() => setStage("choose")}>
                Ander e-mailadres
              </Button>
            </div>
          </form>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-faint pt-3">
          <DialogClose asChild>
            <Button variant="ghost" size="sm">
              {login && !hasContent && !keepDraft ? "Annuleren" : "Nog niet, ik kijk verder rond"}
            </Button>
          </DialogClose>
          {!login && <span className="text-[13px] text-ink-3">Gratis 30 dagen · geen creditcard</span>}
        </div>
      </div>
      {hasContent && <SaveSummary intent={intent} />}
      {keepDraft && <DraftSummary draft={draft} />}
    </div>
  );
}
