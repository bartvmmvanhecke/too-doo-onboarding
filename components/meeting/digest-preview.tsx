"use client";
import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand";
import { useStore } from "@/lib/store";
import { buildDigest, type DigestContent } from "@/lib/meeting-digest";
import { digestPreviewData } from "@/lib/prototype/digestPreview";
import { USER_PERSON_ID } from "@/lib/mock-data";
import { formatShortDate } from "@/lib/date";
import { isDemoEnvironment } from "@/lib/demo-environment";
export function DigestMail({ content }: { content: DigestContent }) {
  return (
    <article className="space-y-7 rounded-2xl border border-line bg-white p-5 sm:p-8">
      <Logo href="/app" />
      <h1 className="text-3xl font-bold">Jouw samenvatting</h1>
      {content.pending.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold">Nog af te ronden</h2>
          {content.pending.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-4">
              <div>
                <p className="font-bold">
                  {m.name}
                  {m.date ? ` · ${formatShortDate(m.date)}` : ""}
                </p>
                <p className="mt-1 text-sm text-ink-3">{m.context}</p>
              </div>
              <Link
                className="inline-flex min-h-11 items-center rounded-full bg-brand px-5 text-sm font-bold text-white"
                href={m.href}
              >
                Afronden
              </Link>
            </div>
          ))}
        </section>
      )}
      {content.actions.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold">Jouw acties</h2>
          {content.actions.map((a) => (
            <p key={a.id} className="border-t border-line py-3">
              <Link className="inline-flex min-h-11 items-center font-semibold text-brand" href={a.href}>
                {a.text}
              </Link>
              <span className={`ml-3 text-sm ${a.late ? "text-[var(--wrap-amber-ink)]" : "text-ink-3"}`}>
                {a.late ? "Te laat" : "Deze week"} · {a.deadline}
              </span>
            </p>
          ))}
        </section>
      )}
      {!content.pending.length && !content.actions.length && <p>Er is niets om samen te vatten.</p>}
      <p className="border-t border-line pt-5 text-sm text-ink-3">
        <Link className="inline-flex min-h-11 items-center text-brand underline" href="/app/meldingen">
          Meldingen beheren
        </Link>
      </p>
    </article>
  );
}
export function DigestPreview() {
  const meetings = useStore((s) => s.meetings);
  const [now] = useState(() => Date.now());
  const data = isDemoEnvironment() ? digestPreviewData(now) : meetings;
  return (
    <div className="mx-auto max-w-[760px] space-y-5">
      <p className="text-sm text-ink-3">Voorbeeld periodieke samenvatting</p>
      <DigestMail content={buildDigest(data, USER_PERSON_ID, now)} />
    </div>
  );
}
