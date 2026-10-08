import { SiteHeading } from "@/components/site/home/site-ui";
import { CLIENT_NAMES, TESTIMONIALS } from "@/lib/site-content";
import { cn } from "@/lib/utils";

/** "Teams die hun opvolging onder controle hebben." */
export function TestimonialsSection() {
  return (
    <section id="testimonials" aria-labelledby="testi-titel" className="mt-[100px] scroll-mt-24">
      <div className="px-5 md:px-10">
        <SiteHeading
          id="testi-titel"
          lines={[
            { text: "Teams die hun opvolging" },
            {
              text: (
                <>
                  <span className="text-gradient-site">onder controle hebben</span>.
                </>
              ),
            },
          ]}
        />
      </div>
      <div className="mx-auto mt-11 grid max-w-[900px] gap-5 px-5 md:grid-cols-2">
        {TESTIMONIALS.map((t) => (
          <figure
            key={t.name}
            className={cn(
              "m-0 flex flex-col gap-[22px] rounded-[20px] border border-[#E6E8F2] bg-white p-[30px]",
              t.wide && "md:col-span-2",
            )}
          >
            <blockquote
              className={cn(
                "font-sans leading-normal font-semibold text-site-navy",
                t.wide ? "text-[22px]" : "text-[19px]",
              )}
            >
              {t.quote}
            </blockquote>
            <figcaption className="mt-auto flex items-center gap-3">
              <span
                aria-hidden
                className="flex size-11 flex-none items-center justify-center rounded-full font-site text-sm font-semibold"
                style={{ background: t.color.bg, color: t.color.fg }}
              >
                {t.initials}
              </span>
              <span className="font-site">
                <b className="block text-[15px] font-medium text-site-navy">{t.name}</b>
                <span className="text-sm text-site-muted">{t.company}</span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="mt-10 flex flex-col items-center gap-[18px] px-5 text-center">
        <p className="font-site text-xs font-medium tracking-[1px] text-site-muted uppercase">
          Ook deze organisaties werken met too-doo
        </p>
        <ul className="flex flex-wrap justify-center gap-x-9 gap-y-3 font-sans text-[17px] font-bold text-[#6E728E]">
          {CLIENT_NAMES.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
