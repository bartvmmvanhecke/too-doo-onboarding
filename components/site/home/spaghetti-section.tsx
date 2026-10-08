import Image from "next/image";
import { SiteHeading } from "@/components/site/home/site-ui";
import { IMAGES } from "@/lib/site-content";

/** "Heb je het gehad met vergaderspaghetti?" */
export function SpaghettiSection() {
  return (
    <section aria-labelledby="spaghetti-titel" className="px-5 py-20 md:px-10">
      <div className="mx-auto max-w-[800px] pb-12 text-center">
        <SiteHeading
          id="spaghetti-titel"
          lines={[
            { text: "Heb je het gehad met vergaderspaghetti?", highlight: true },
            { text: "Mooi, wij maken er lasagna van." },
          ]}
        />
        <p className="mt-4 text-sm text-site-muted">Vergaderspaghetti? Oké, even uitleggen.</p>
      </div>
      <div className="mx-auto grid max-w-[963px] items-center gap-12 md:grid-cols-2">
        <div>
          <h3 className="text-xl font-medium text-site-blue-dark">Een onderwerp verlaat het managementoverleg.</h3>
          <p className="mt-2.5 text-site-muted">
            Het belandt in een werkgroep, duikt weer op in een 1-op-1 tussen sales en marketing en eindigt bij de
            stuurgroep. Ergens onderweg is er een beslissing genomen, en die verdwijnt onder de mat.{" "}
            <span className="text-gradient-site font-normal">Niemand weet welke, of ze ook uitgevoerd is,</span> en even
            later zit dezelfde groep opnieuw over hetzelfde onderwerp te buigen.
          </p>
          <p className="mt-3 text-site-muted">
            too-doo verbindt de puntjes: elke beslissing en actie blijft gekoppeld aan haar onderwerp, uit welke
            vergadering ze ook komt. Eén draad, van begin tot eind.
          </p>
        </div>
        <Image
          src={IMAGES.actions}
          alt=""
          width={866}
          height={700}
          unoptimized
          className="mx-auto h-auto w-full max-w-[433px] md:mr-0 md:ml-auto"
        />
      </div>
    </section>
  );
}
