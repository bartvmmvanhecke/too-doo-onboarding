import Link from "next/link";
import { NotAvailableLink } from "@/components/site/client-bits";
import { SiteHeading, siteButton } from "@/components/site/home/site-ui";
import { IMAGES } from "@/lib/site-content";

/** Slot-CTA "Je volgende vergadering kan eindigen met …". */
export function CtaSection() {
  return (
    <section aria-labelledby="cta-titel" className="mt-[104px] px-5 md:px-10">
      <div
        className="mx-auto max-w-[1043px] rounded-3xl px-6 py-[84px] text-center"
        style={{
          background: `url("${IMAGES.ctaBackground}") center/cover no-repeat, radial-gradient(circle at 0% 100%, rgba(176,148,250,.45), transparent 45%), radial-gradient(circle at 100% 0%, rgba(200,225,250,.7), transparent 45%), #F1F3FC`,
        }}
      >
        <SiteHeading
          id="cta-titel"
          className="mx-auto max-w-[760px]"
          lines={[
            { text: "Je volgende vergadering kan eindigen met" },
            { text: "beslissingen die echt gebeuren.", highlight: true },
          ]}
        />
        <p className="mt-4 text-lg text-site-navy">
          Sluit je aan bij 500+ teams die voorbereiden, beslissen en uitvoeren met too-doo.
        </p>
        <div className="mt-7 mb-3.5 flex flex-wrap justify-center gap-3">
          <Link href="/prototype" className={siteButton("primary")}>
            Start je pilot van 30 dagen
          </Link>
          <NotAvailableLink href="#demo" className={siteButton("secondary")}>
            Boek een demo
          </NotAvailableLink>
        </div>
        <p className="text-sm text-[#5F637E]">
          Geen kredietkaart nodig. Na 30 dagen bekijken we samen wat er effectief uitgevoerd is.
        </p>
      </div>
    </section>
  );
}
