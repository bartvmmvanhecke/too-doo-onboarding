"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { inSentence } from "@/lib/utils";

export interface MailPreviewData {
  fromName: string;
  toFirstName: string;
  toEmail: string;
  meetingName: string;
  /** "maandag" */
  meetingWeekday: string | null;
  action: string;
  deadline: string;
}

const inactive = () => toast("In het prototype niet actief");

/** Wat een eigenaar per mail ontvangt (mockup B3b). */
export function MailPreview({ data }: { data: MailPreviewData }) {
  const meeting = inSentence(data.meetingName);
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <dl className="grid w-full max-w-[640px] grid-cols-[auto_1fr] gap-x-1.5 gap-y-1 text-[13px] text-ink-2">
        <dt className="font-bold">Van:</dt>
        <dd>too-doo namens {data.fromName}</dd>
        <dt className="font-bold">Aan:</dt>
        <dd className="break-all">{data.toEmail}</dd>
        <dt className="font-bold">Onderwerp:</dt>
        <dd>Je actie uit het {meeting}</dd>
      </dl>
      <article
        aria-label="Voorbeeldmail"
        className="flex w-full max-w-[640px] flex-col gap-[18px] rounded-[14px] bg-white p-6 shadow-[0_8px_24px_rgba(22,33,58,0.08)] sm:p-8"
      >
        <span className="text-[22px] font-extrabold text-logo">too-doo</span>
        <p className="text-base leading-[1.6]">Dag {data.toFirstName},</p>
        <p className="text-base leading-[1.6]">
          In het {meeting}
          {data.meetingWeekday ? ` van ${data.meetingWeekday}` : ""} werd deze actie aan jou toegewezen:
        </p>
        <div className="flex flex-col gap-1.5 rounded-xl border border-track p-4">
          <span className="text-[17px] font-extrabold">{data.action}</span>
          <span className="text-sm text-ink-2">
            {data.meetingName} · toegewezen door {data.fromName} · {data.deadline || "geen deadline"}
          </span>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button size="sm" className="bg-success text-[15px] hover:bg-success-ink" onClick={inactive}>
            Markeer als klaar
          </Button>
          <Button variant="outline" size="sm" className="text-[15px]" onClick={inactive}>
            Zet een datum
          </Button>
          <Button variant="outline" size="sm" className="text-[15px]" onClick={inactive}>
            Reageer
          </Button>
        </div>
        <p className="text-sm leading-[1.6] text-ink-2">
          Niet afgewerkt tegen het volgende overleg? Dan komt de actie daar vanzelf terug op de agenda.
        </p>
        <p className="border-t border-line-soft pt-3 text-xs leading-normal text-ink-3">
          Je krijgt deze mail omdat {data.fromName} too-doo gebruikt om afspraken op te volgen. Je hoeft geen account
          aan te maken.
        </p>
      </article>
    </div>
  );
}
