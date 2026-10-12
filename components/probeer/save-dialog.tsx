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
import { joinNl } from "@/lib/utils";

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

/**
 * Bewaar-modal van Variant A (C5): het account komt als "bewaren". Microsoft (demo-uitkomsten, bij
 * "geblokkeerd" terugval op e-mail), Google, of werk-e-mail met een code van 6 cijfers. Geen wachtwoord.
 */
export function SaveDialog({
  intent,
  onClose,
  onSaved,
}: {
  intent: SaveIntent | null;
  onClose: () => void;
  onSaved: (meetingId: string | null, intent: SaveIntent) => void;
}) {
  return (
    <Dialog open={intent !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[920px] gap-0 p-0 sm:p-0">
        {intent && <SaveForm intent={intent} onSaved={onSaved} />}
      </DialogContent>
    </Dialog>
  );
}

function SaveForm({
  intent,
  onSaved,
}: {
  intent: SaveIntent;
  onSaved: (id: string | null, intent: SaveIntent) => void;
}) {
  const meeting = useGuestStore((s) => s.meeting);
  const { start, pending } = useSsoLogin();
  const [email, setEmail] = useState("");
  const [stage, setStage] = useState<"choose" | "code">("choose");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  const finish = (user: User) => onSaved(saveGuestToApp(user, intent), intent);

  const sso = async (provider: "microsoft" | "google") => {
    track("signup_method_selected", { methode: provider });
    setError(null);
    const outcome = await start(provider);
    track("sso_result", { provider, resultaat: outcome });
    if (outcome === "success") return finish(ssoUser(provider));
    setBlocked(true);
    setError("Inloggen met Microsoft lukt niet bij je bedrijf. Gebruik je werk-e-mail.");
    requestAnimationFrame(() => emailRef.current?.focus());
  };

  const sendCode = () => {
    if (!isEmail(email)) {
      setError("Vul je werk-e-mailadres in, bijvoorbeeld naam@bedrijf.be.");
      emailRef.current?.focus();
      return;
    }
    track("signup_method_selected", { methode: "email" });
    setError(null);
    setStage("code");
  };

  const confirmCode = async () => {
    if (!/^\d{6}$/.test(code)) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, 400));
    const names = namesFromEmail(email);
    finish({
      firstName: names.first || email.split("@")[0],
      lastName: names.last,
      email: email.trim(),
      company: companyFromEmail(email),
      method: blocked ? "email-blocked" : "email",
    });
  };

  const login = intent === "login";

  return (
    <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5 pr-12">
          <DialogTitle className="text-[26px] leading-tight">
            {login
              ? "Log in. Je overleg gaat mee naar je account."
              : "Bewaar je overleg. Het blijft precies zoals het is."}
          </DialogTitle>
          <DialogDescription>{introText(intent, weekdayName(meeting))}</DialogDescription>
        </div>

        {stage === "choose" ? (
          <>
            <Button variant="outline" size="lg" disabled={pending !== null} onClick={() => sso("microsoft")}>
              {pending === "microsoft" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <MicrosoftMark />}
              Doorgaan met Microsoft
            </Button>
            <Button variant="outline" size="lg" disabled={pending !== null} onClick={() => sso("google")}>
              {pending === "google" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <GoogleMark />}
              Doorgaan met Google
            </Button>
            {error && blocked && (
              <Callout live variant="warning">
                {error}
              </Callout>
            )}
            <div className="flex items-center gap-3 text-sm text-ink-3">
              <span aria-hidden className="h-px flex-1 bg-line-soft" />
              of met je werk-e-mail
              <span aria-hidden className="h-px flex-1 bg-line-soft" />
            </div>
            <form
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
                  aria-invalid={!!error && !blocked}
                  aria-describedby="bewaar-email-hint"
                  onChange={(e) => setEmail(e.target.value)}
                  className="min-w-0 flex-[1_1_220px]"
                />
                <Button type="submit" size="default">
                  Stuur me een code
                </Button>
              </div>
              <span id="bewaar-email-hint" className={error && !blocked ? "text-sm text-danger" : "text-sm text-ink-3"}>
                {error && !blocked ? error : "Je krijgt een code van 6 cijfers. Dit venster blijft open."}
              </span>
            </form>
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
                Bewaar mijn overleg
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
              Nog niet, ik kijk verder rond
            </Button>
          </DialogClose>
          <span className="text-[13px] text-ink-3">Gratis 30 dagen · geen creditcard</span>
        </div>
      </div>
      <SaveSummary intent={intent} />
    </div>
  );
}
