import Image from "next/image";
import { SiteHeading } from "@/components/site/home/site-ui";
import { FEATURES, IMAGES } from "@/lib/site-content";

/** "Gedaan met 'Oeps…'": tagline, beeld en zes functies. */
export function FeaturesSection() {
  return (
    <section id="product" aria-labelledby="product-titel" className="mt-[140px] scroll-mt-24 px-5 md:px-10">
      <div className="mx-auto max-w-[800px] pb-10 text-center">
        <SiteHeading
          id="product-titel"
          lines={[
            { text: 'Gedaan met "Oeps, ik dacht dat jij dat zou doen".' },
            { text: "Duidelijk eigenaarschap. Na elke vergadering.", highlight: true },
          ]}
        />
        <p className="mt-4 text-base text-site-muted">
          Eén verantwoordelijke, één einddatum en één overzicht voor het hele team. Geen vergeten taken, geen
          verrassingen.
        </p>
      </div>
      <div className="mx-auto max-w-[963px]">
        <div className="min-h-[200px] overflow-hidden rounded-2xl bg-site-mint">
          <Image src={IMAGES.meeting} alt="" width={1926} height={1084} unoptimized className="h-auto w-full" />
        </div>
        <ul className="grid gap-8 px-4 pt-12 md:grid-cols-2 md:gap-12">
          {FEATURES.map((f) => (
            <li key={f.title}>
              <Image src={f.icon} alt="" width={24} height={24} unoptimized className="mb-3 size-6" />
              <h3 className="pb-0.5 text-xl font-medium text-site-blue-dark">{f.title}</h3>
              <p className="mt-1.5 text-base text-site-muted">{f.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
