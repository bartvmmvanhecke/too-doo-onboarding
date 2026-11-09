"use client";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { DIGEST_DEFAULT } from "@/lib/meetingWrapUp.config";
import type { DigestFrequency } from "@/lib/meeting-digest";
export function NotificationSettings() {
  const frequency = useStore((s) => s.digestFrequency ?? DIGEST_DEFAULT);
  return (
    <section className="space-y-5 rounded-2xl border border-line bg-white p-6">
      <h1 className="text-3xl font-bold">Meldingen</h1>
      <label className="flex flex-col items-start gap-3 font-semibold">
        Periodieke samenvatting
        <select
          className="min-h-11 rounded-lg border border-line bg-white px-3 text-sm"
          value={frequency}
          onChange={(e) => useStore.setState({ digestFrequency: e.target.value as DigestFrequency })}
        >
          <option value="weekly">Wekelijks</option>
          <option value="biweekly">Om de twee weken</option>
          <option value="off">Uit</option>
        </select>
      </label>
      <p className="text-sm text-ink-3">Maandag om 08:30 · alleen als er iets voor je klaarstaat.</p>
      <Link className="inline-flex min-h-11 items-center text-brand underline" href="/app/samenvatting-preview">
        Voorbeeld van de samenvatting
      </Link>
    </section>
  );
}
