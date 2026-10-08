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
