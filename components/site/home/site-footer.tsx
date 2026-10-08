import { NotAvailableLink } from "@/components/site/client-bits";
import { SiteLogo } from "@/components/site/home/site-logo";

const LINKS = [
  { href: "#product", label: "Product" },
  { href: "#compare", label: "Vergelijken" },
  { href: "#testimonials", label: "Ervaringen" },
  { href: "#pricing", label: "Prijzen" },
];

const link = "inline-flex min-h-11 items-center text-site-navy no-underline hover:text-site-primary";
const contact = "text-site-muted no-underline hover:text-site-primary";

/** Footer van de nieuwe website. */
export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-site-border px-5 pt-16 pb-8 font-site md:px-10">
      <div className="mx-auto max-w-[1200px]">
        <div className="flex flex-col justify-between gap-10 md:flex-row">
          <div>
            <SiteLogo />
            <nav aria-label="Footer" className="mt-4 flex flex-wrap gap-x-7 text-sm font-normal">
              {LINKS.map((l) => (
                <a key={l.href} href={l.href} className={link}>
                  {l.label}
                </a>
              ))}
            </nav>
          </div>
          <address className="text-sm leading-[1.8] text-site-muted not-italic">
            <a href="tel:+3293242584" className={contact}>
              +32 9 324 25 84
            </a>
            <br />
            <a href="mailto:info@too-doo.be" className={contact}>
              info@too-doo.be
            </a>
            <br />
            IDOLA Businesscenter
            <br />
            Antwerpse Steenweg 19
            <br />
            9080 Lochristi
            <br />
            <NotAvailableLink
              href="#linkedin"
              aria-label="LinkedIn"
              className="mt-1.5 inline-flex min-h-11 items-center"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#6E728E" aria-hidden>
                <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 110-4.12 2.06 2.06 0 010 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
              </svg>
            </NotAvailableLink>
          </address>
        </div>
        <div className="mt-14 flex flex-wrap justify-between gap-5 border-t border-site-border pt-6 text-[13px] text-site-muted">
          <span>© 2026 Too-Doo</span>
          <div className="flex flex-wrap gap-x-6">
            {["Algemene voorwaarden", "Privacy", "Cookies"].map((l) => (
              <NotAvailableLink
                key={l}
                href={`#${l.toLowerCase().replace(/\s+/g, "-")}`}
                className={`${contact} inline-flex min-h-11 items-center`}
              >
                {l}
              </NotAvailableLink>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
