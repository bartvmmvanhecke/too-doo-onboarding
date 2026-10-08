import { expect, type Page } from "@playwright/test";

/** Volgt console-fouten en paginafouten; faalt de test als er een optrad. */
export function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  return {
    assertNone: () => expect(errors, errors.join("\n")).toEqual([]),
  };
}

/** Kiest een uitkomst in de demo-balk via de interface zelf. */
export async function setDemo(
  page: Page,
  opts: {
    login?: "Slaagt" | "Bedrijf blokkeert";
    calendar?: "Reeksen gevonden" | "Geen reeksen" | "IT-goedkeuring nodig" | "Geannuleerd";
  },
) {
  await page.getByRole("button", { name: "Demo", exact: true }).click();
  const panel = page.getByRole("region", { name: "Demo-instellingen" });
  if (opts.login)
    await panel.getByRole("group", { name: "Microsoft-login" }).getByText(opts.login, { exact: true }).click();
  if (opts.calendar)
    await panel.getByRole("group", { name: "Agendatoestemming" }).getByText(opts.calendar, { exact: true }).click();
  await panel.getByRole("button", { name: "Demo-balk sluiten" }).click();
}

export async function expectToast(page: Page, text: string | RegExp) {
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: text }).first()).toBeVisible();
}

export async function fillAction(
  page: Page,
  n: number,
  what: string,
  owner?: { type: string; pick?: string },
  deadline?: string,
) {
  await page.getByLabel(`Actie ${n}`, { exact: true }).fill(what);
  if (owner) {
    const box = page.getByRole("combobox", { name: `Eigenaar actie ${n}` });
    await box.fill(owner.type);
    if (owner.pick)
      await page
        .getByRole("option", { name: new RegExp(owner.pick) })
        .first()
        .click();
  }
  if (deadline) await page.getByLabel(`Deadline actie ${n}`).fill(deadline);
}

/** Elementen met eigen tekst of interactie die de knop raken. */
export async function overlapsWithNav(page: Page): Promise<string[]> {
  // De knop staat vast; we controleren de rustpositie bovenaan de pagina.
  // Next herstelt na een navigatie soms nog de scrollpositie: wacht tot die stilstaat.
  await page.waitForTimeout(300);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  return page.evaluate(() => {
    const nav = document.querySelector("[data-prototype-nav]");
    if (!nav) return ["(geen lijst-knop gevonden)"];
    const r = nav.getBoundingClientRect();
    const hits: string[] = [];
    const candidates = document.querySelectorAll<HTMLElement>(
      "a, button, input, select, textarea, label, h1, h2, h3, p, span, li, img, svg",
    );
    for (const el of candidates) {
      if (nav.contains(el) || el.closest("[data-sonner-toaster], [aria-label='Demo-instellingen']")) continue;
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none") continue;
      const hasOwnText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim());
      const interactive = el.matches("a, button, input, select, textarea, img, svg");
      if (!hasOwnText && !interactive) continue;
      const b = el.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) continue;
      if (b.right > r.left && b.left < r.right && b.bottom > r.top && b.top < r.bottom) {
        hits.push(`${el.tagName.toLowerCase()} "${(el.textContent ?? "").trim().slice(0, 40)}"`);
      }
    }
    return hits;
  });
}
