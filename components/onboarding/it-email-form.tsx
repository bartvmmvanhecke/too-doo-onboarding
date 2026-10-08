"use client";

import { useId, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Callout } from "@/components/callout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isEmail } from "@/lib/people";
import { simulateSend } from "@/lib/simulate";

/** E-mail van de IT-beheerder + verzendknop. Verzenden is gesimuleerd. */
export function ItEmailForm({
  label,
  placeholder,
  buttonLabel,
  autoFocus,
}: {
  label: string;
  placeholder: string;
  buttonLabel: string;
  autoFocus?: boolean;
}) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isEmail(email)) {
      setError("Vul het e-mailadres van je IT-beheerder in.");
      document.getElementById(id)?.focus();
      return;
    }
    setError(null);
    setSending(true);
    await simulateSend();
    setSending(false);
    setSentTo(email.trim());
  };

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-3">
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        <Input
          id={id}
          type="email"
          autoComplete="off"
          placeholder={placeholder}
          value={email}
          autoFocus={autoFocus}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => setEmail(e.target.value)}
          className="min-h-[46px] flex-[1_1_220px] p-3 text-[15px]"
        />
        <Button type="submit" variant="outline" size="sm" className="min-h-[46px]" disabled={sending}>
          {sending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {buttonLabel}
        </Button>
      </div>
      {error && (
        <p id={`${id}-error`} className="text-[13px] font-bold text-danger">
          {error}
        </p>
      )}
      <div aria-live="polite">
        {sentTo && (
          <Callout variant="success" className="py-3 text-sm">
            Verstuurd naar {sentTo}. Je hoeft niet te wachten om verder te gaan.
          </Callout>
        )}
      </div>
    </form>
  );
}
