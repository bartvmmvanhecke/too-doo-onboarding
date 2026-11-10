import { expect, test } from "@playwright/test";
import { seedWrapUp, storedMeetings } from "./fixtures/wrap-up";

for (const scheduled of [true, false]) {
  test(`optionele volgende vergadering: ${scheduled ? "bestaande afspraak wijzigen" : "bewaren voor later"}`, async ({
    page,
  }) => {
    await seedWrapUp(page, { automatic: true });
    await page.getByRole("button", { name: "Afronden →", exact: true }).click();
    await page.getByRole("button", { name: "4. Volgende vergadering", exact: true }).click();
    const prototype = page.getByRole("region", { name: "Prototype volgende vergadering" });
    await prototype
      .getByRole("button", {
        name: scheduled ? "Volgende reeds ingepland" : "Volgende nog niet ingepland",
        exact: true,
      })
      .click();
    if (scheduled) {
      await expect(page.getByRole("heading", { name: "Al gepland · uit de reeks" })).toBeVisible();
      await page.getByRole("button", { name: "Datum of tijd wijzigen" }).click();
      await page.getByLabel("Naam", { exact: true }).fill("Verplaatst overleg");
      await page.getByLabel("Datum", { exact: true }).fill("2026-11-18");
      await page.getByRole("button", { name: "Annuleren", exact: true }).click();
      await expect(page.getByText(/Verplaatst overleg/)).toHaveCount(0);
      await page.getByRole("button", { name: "Datum of tijd wijzigen" }).click();
      await page.getByLabel("Naam", { exact: true }).fill("Verplaatst overleg");
      await page.getByLabel("Datum", { exact: true }).fill("2026-11-18");
    } else {
      await expect(page.getByRole("heading", { name: "Nog geen volgende vergadering gepland", exact: true })).toBeVisible();
      await expect(page.getByLabel("Naam", { exact: true })).toHaveValue("Directievergadering");
      await expect(page.getByLabel("Datum", { exact: true })).toHaveValue("");
      await expect(page.getByLabel("Tijd", { exact: true })).toHaveValue("");
      await page.getByRole("button", { name: /over 2 weken/ }).click();
      await expect(page.getByLabel("Datum", { exact: true })).toHaveValue("2026-11-23");
      await expect(page.getByLabel("Tijd", { exact: true })).toHaveValue("09:00");
      await page.getByLabel("Datum", { exact: true }).fill("");
      await expect(page.getByText("Gaat naar “Bewaard voor later”", { exact: true })).toBeVisible();
    }
    await page.getByRole("button", { name: "Afronden →", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Vergaderscore (optioneel)", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Vergadering afronden", exact: true }).click();
    const meetings = await storedMeetings(page);
    const current = meetings.find((meeting: { id: string }) => meeting.id === "wrap-test");
    expect(current.followUpStatus).toBe("saved");
    const next = meetings.filter(
      (meeting: { seriesId: string; id: string }) => meeting.seriesId === current.seriesId && meeting.id !== current.id,
    );
    expect(next).toHaveLength(scheduled ? 1 : 0);
    if (scheduled) expect(next[0]).toMatchObject({ name: "Verplaatst overleg", date: "2026-11-18" });
    else expect(current.blocks[0].items.some((item: { carry: string }) => item.carry === "next")).toBe(true);
  });
}
