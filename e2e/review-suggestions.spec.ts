import { test, expect, type Page } from "@playwright/test";
import { trackErrors } from "./helpers";

async function seed(page: Page, days = 7, account = false) {
  await page.addInitScript(
    ({ days, account }) => {
      if (localStorage.getItem("toodoo-guest")) return;
      const now = Date.now();
      localStorage.setItem(
        "toodoo-guest",
        JSON.stringify({
          version: 2,
          state: {
            guestId: "review-test",
            createdAt: now - (7 - days) * 86400000,
            step: 2,
            meeting: {
              name: "Productieoverleg",
              participants: [{ id: "jan", name: "Jan", initials: "JA", color: "blue" }],
              topics: [],
              time: null,
              weekday: null,
              duration: 60,
              recurrence: "weekly",
            },
            actions: Array.from({ length: 9 }, (_, i) => ({
              id: `a${i}`,
              text: i === 1 ? "Leveranciers" : i === 0 ? "Jan vraagt een offerte" : `Offerte ${i} aanvragen`,
              ownerId: i === 0 ? "jan" : null,
              deadline: null,
              confirmed: false,
              reviewStatus: "open",
              ownerLater: false,
            })),
            decisions: [],
            others: [],
            conversation: [{ id: "m", from: "user", text: "Notities" }],
            account: account
              ? { firstName: "Jan", lastName: "Peeters", email: "jan@example.test", provider: "google" }
              : null,
            entry: "notes",
            startPath: "notes",
            pending: { kind: "place-actions" },
            transitionPlayed: true,
            assistantOpen: false,
            closedHintShown: true,
          },
        }),
      );
    },
    { days, account },
  );
}
for (const variant of ["a", "b"]) {
  test(`voorstellen nakijken met toetsenbord, ongedaan maken, agenda en bulk (${variant})`, async ({ page }) => {
    const errors = trackErrors(page);
    await seed(page);
    await page.goto(`/probeer?variant=${variant}`);
    const card = page.getByRole("region", { name: "Openstaande acties" });
    await expect(page.getByText("Proefomgeving: geen account nodig")).toHaveCount(0);
    await expect(page.getByText("Niet bewaard · nog 7 dagen")).toBeVisible();
    await expect(page.getByRole("button", { name: "Start vergadering" })).toBeEnabled();
    await expect(card.getByRole("checkbox")).toHaveCount(0);
    await expect(card.getByRole("button", { name: "✓ Klopt" })).toHaveCount(5);
    await page.screenshot({ path: `/tmp/review-suggestions-${variant}.png`, fullPage: true });
    await page.getByRole("button", { name: "Nakijken", exact: true }).click();
    await expect(card.getByRole("button", { name: "✓ Klopt" }).first()).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(card.getByRole("button", { name: "✓ Klopt" }).first()).toBeFocused();
    await expect(card.getByText("1 van 9 nagekeken", { exact: true }).last()).toBeVisible();
    await card.getByRole("button", { name: "Ongedaan maken" }).click();
    await expect(card.getByRole("button", { name: "✓ Klopt" }).first()).toBeFocused();
    await card.getByRole("button", { name: "Geen actie" }).first().click();
    await expect(card.getByRole("button", { name: "✓ Klopt" }).first()).toBeFocused();
    await card.getByRole("button", { name: "Maak er een agendapunt van" }).click();
    await expect(page.getByText("Agendapunt in Lopende zaken", { exact: true })).toBeVisible();
    await card.getByRole("button", { name: "Ongedaan maken" }).last().click();
    await card.getByRole("button", { name: "Alle 8 bevestigen" }).click();
    await expect(page.getByRole("status").filter({ hasText: "7 acties bevestigd." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Nakijken", exact: true })).toHaveCount(0);
    await expect(card.getByRole("checkbox")).toHaveCount(7);
    for (const checkbox of await card.getByRole("checkbox").all()) await expect(checkbox).not.toBeChecked();
    await card.getByRole("checkbox").first().click();
    await expect(card.getByText("6 open", { exact: true })).toBeVisible();
    await page.reload();
    await expect(card.getByText("6 open", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Melding sluiten" }).click();
    await expect(page.getByRole("status").filter({ hasText: "acties bevestigd." })).toHaveCount(0);
    errors.assertNone();
  });
}
test("dringend bewaarslot en account-slot hebben geen dubbele bewaarstatus", async ({ page }) => {
  await seed(page, 2);
  await page.goto("/probeer");
  await expect(page.getByText("Nog 2 dagen", { exact: true })).toBeVisible();
  await expect(page.getByText("Daarna is je werk weg", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Account maken", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
test("met account toont het slot de gebruiker en bedrijfskeuze", async ({ page }) => {
  await seed(page, 2, true);
  await page.goto("/probeer");
  await expect(page.getByText("Jan Peeters", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Bedrijf kiezen" })).toBeVisible();
  await expect(page.getByText("Daarna is je werk weg")).toHaveCount(0);
});

test("mobiel en reduced motion: nakijken blijft met toetsenbord bruikbaar", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seed(page);
  await page.goto("/probeer?variant=b");
  await page.getByRole("button", { name: "Nakijken", exact: true }).click();
  const card = page.getByRole("region", { name: "Openstaande acties" });
  await expect(card.getByRole("button", { name: "✓ Klopt" }).first()).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(card.getByRole("button", { name: "✓ Klopt" }).first()).toBeFocused();
  await expect(page.getByRole("button", { name: "Start vergadering" })).toBeEnabled();
});
