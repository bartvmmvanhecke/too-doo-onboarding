import { FAQ } from "@/lib/site-content";

/** Veelgestelde vragen (uitklapbaar, native details/summary). */
export function FaqSection() {
  return (
    <section aria-labelledby="faq-titel" className="mt-[104px] px-5 text-center md:px-10">
      <h2 id="faq-titel" className="font-sans text-[28px] font-semibold text-site-navy md:text-[36px]">
        Veelgestelde vragen
      </h2>
      <p className="mt-3 text-sm text-site-muted">Alles wat je moet weten om te beginnen</p>
      <div className="mx-auto mt-11 max-w-[768px] text-left">
        {FAQ.map((f) => (
          <details key={f.q} className="group border-b border-site-border">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-[22px] [&::-webkit-details-marker]:hidden">
              <span className="text-xl font-medium text-site-blue-dark">{f.q}</span>
              <span
                aria-hidden
                className="inline-flex size-6 flex-none items-center justify-center rounded-full border border-site-muted text-[15px] leading-none text-site-muted group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="max-w-[700px] pb-6 text-sm font-normal text-site-muted">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
