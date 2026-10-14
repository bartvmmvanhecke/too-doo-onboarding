import { test, expect } from "@playwright/test";

test("onboarding document: writing, templates, undo, persistence and mobile", async ({ page }) => {
  await page.goto("/probeer?variant=b");
  await page.getByRole("button", { name: /^Start met een lege vergadering/ }).click();
  const editor = page.locator(".onboarding-notepad");
  await expect(editor).toBeVisible();
  await expect(editor.getByRole("heading", { name: "Agendapunten", exact: true })).toBeVisible();
  const input = editor.getByLabel("Nieuw agendapunt", { exact: true }).first();
  await expect(
    page.getByRole("button", { name: "Nieuwe vergadering. Naam van de vergadering aanpassen", exact: true }),
  ).toBeVisible();
  await input.focus();
  await page.getByRole("heading", { name: "Openstaande acties", exact: true }).click();
  await page.mouse.move(0, 0);
  await page.screenshot({ path: "screenshots/notepad-empty.png", fullPage: true });
  await expect(input).toHaveAttribute("placeholder", "+ typ of plak een nieuwe agendapunt");
  await expect(editor.getByText("Staal-leverancier opnieuw te laat")).toHaveCount(0);
  await input.click();
  await expect(input).toBeFocused();
  await page.keyboard.type("Nieuwe offerte voor klant X bespreken");
  await input.press("Enter");
  const items = editor.getByRole("textbox", { name: /^Agendapunt in/ });
  await expect(items.first()).toHaveValue("Nieuwe offerte voor klant X bespreken");
  await expect(editor.locator("input:focus")).toHaveValue("");
  const controls = items
    .first()
    .locator("xpath=..")
    .locator("xpath=..")
    .getByRole("button", { name: "Duur toevoegen", exact: true });
  await items.first().focus();
  await expect(controls).toBeVisible();
  await editor.getByRole("textbox", { name: "Nieuw agendapunt", exact: true }).first().focus();
  await editor.locator("input:focus").fill("Planning");
  await editor.locator("input:focus").press("Enter");
  await editor.locator("input:focus").press("Tab");
  await editor.locator("input:focus").fill("Een notitie");
  await editor.locator("input:focus").press("Enter");
  await expect(editor.getByRole("textbox", { name: "Notitie bij Planning" }).first()).toHaveValue("Een notitie");
  await items.first().fill("Offerte aangepast");
  await items.first().press("Enter");
  // Exercise the real clipboard paste handler without OS clipboard permissions.
  await editor.locator("input:focus").evaluate((el) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData("text/plain", "Eerste geplakte regel\nTweede geplakte regel");
    el.dispatchEvent(new ClipboardEvent("paste", { clipboardData, bubbles: true, cancelable: true }));
  });
  await expect(items).toHaveCount(4);
  const templates = editor.getByRole("button", { name: "Gebruik een sjabloon" });
  await templates.click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("option", { name: "1-op-1", exact: true })).toHaveCount(0);
  await templates.click();
  await page.getByRole("heading", { level: 1 }).click();
  await expect(page.getByRole("option", { name: "1-op-1", exact: true })).toHaveCount(0);
  await templates.click();
  await page.getByRole("option", { name: "Agenda van vorige vergadering", exact: true }).click();
  await expect(page.getByText("Er is nog geen vorige vergadering met een agenda in deze reeks.")).toBeVisible();
  await page.keyboard.press("Escape");
  for (const name of ["Lopende zaken + Varia", "1-op-1", "Directievergadering met tijden"]) {
    const before = await items.count();
    await templates.click();
    await page.getByRole("option", { name, exact: true }).click();
    await expect(items).toHaveCount(before + (name === "Lopende zaken + Varia" ? 2 : 3));
    await expect(items.first()).toHaveValue("Offerte aangepast");
    await expect(editor.locator("input:focus")).not.toHaveValue("");
  }
  await page
    .locator('[data-sonner-toast][data-front="true"]')
    .getByRole("button", { name: "Ongedaan maken", exact: true })
    .click();
  await expect(items).toHaveCount(9);
  await page.reload();
  await expect(items.first()).toHaveValue("Offerte aangepast");
  await expect(items).toHaveCount(9);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(templates).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "screenshots/notepad-mobile.png", fullPage: true });
  await templates.click();
  const menu = page.locator("[data-slot=popover-content]").last();
  const rect = await menu.boundingBox();
  expect(rect!.x).toBeGreaterThanOrEqual(0);
  expect(rect!.x + rect!.width).toBeLessThanOrEqual(390);
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: process.env.NOTEPAD_SCREENSHOT ?? "screenshots/notepad.png", fullPage: true });
  await page.getByRole("button", { name: "Start vergadering", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Bewaar je overleg. Het blijft precies zoals het is." }),
  ).toBeVisible();
});

test("previous agenda: keyboard preview, latest meeting, titles without old notes or actions", async ({ page }) => {
  await page.addInitScript(() => {
    const item = (text: string) => ({
      id: text,
      text,
      ownerIds: [],
      duration: 15,
      purposes: [],
      entries: [{ id: "old-note", kind: "note", text: "Vertrouwelijke oude notitie", ownerId: null, date: "" }],
    });
    const previous = (id: string, date: string, text: string) => ({
      id,
      name: "Nieuwe vergadering",
      date,
      time: 480,
      duration: 60,
      recurrence: "weekly",
      type: "",
      participants: [],
      actions: [{ id: "done", what: "Oude voltooide actie", done: true }],
      blocks: [
        {
          id: id + "-block",
          kind: "topics",
          title: "Opvolging",
          duration: null,
          presenterId: null,
          items: [item(text)],
        },
      ],
      showWelcome: false,
      invited: false,
      held: true,
    });
    localStorage.setItem(
      "too-doo-onboarding",
      JSON.stringify({
        version: 4,
        state: {
          meetings: [
            { ...previous("older", "2021-01-01", "Ouder punt"), time: 420 },
            previous("latest", "2021-01-01", "Recent punt"),
          ],
        },
      }),
    );
  });
  await page.goto("/probeer?variant=b");
  await page.getByRole("button", { name: /^Start met een lege vergadering/ }).click();
  const editor = page.locator(".onboarding-notepad");
  const input = editor.getByLabel("Nieuw agendapunt", { exact: true }).first();
  await input.fill("Eigen punt");
  await input.press("Enter");
  await editor.getByRole("button", { name: "Gebruik een sjabloon" }).click();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Agenda toevoegen", exact: true })).toBeVisible();
  await expect(page.getByText("Recent punt", { exact: true })).toBeVisible();
  await expect(page.getByText("Ouder punt", { exact: true })).toHaveCount(0);
  await expect(editor.getByRole("textbox", { name: /^Agendapunt in/ })).toHaveCount(1);
  await page.getByRole("button", { name: "Agenda toevoegen", exact: true }).click();
  await expect(editor.locator("input:focus")).toHaveValue("Recent punt");
  await expect(editor.getByRole("textbox", { name: /^Agendapunt in/ }).first()).toHaveValue("Eigen punt");
  await expect(page.getByText("Vertrouwelijke oude notitie", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Oude voltooide actie", { exact: true })).toHaveCount(0);
});

test("ingevulde agenda controls blijven zichtbaar na blur en herladen", async ({ page }) => {
  await page.goto("/probeer?variant=b");
  await page.getByRole("button", { name: /^Start met een lege vergadering/ }).click();
  const editor = page.locator(".onboarding-notepad");
  const input = editor.getByLabel("Nieuw agendapunt", { exact: true }).first();
  await input.fill("Planning");
  await input.press("Enter");
  const title = editor.getByRole("textbox", { name: /^Agendapunt in/ }).first();
  const controls = editor.locator("[data-document-filled]").first();
  await page.getByRole("heading", { name: "Openstaande acties", exact: true }).click();
  await page.mouse.move(0, 0);
  await expect(controls).toHaveCSS("opacity", "0");
  await title.focus();
  await editor.getByRole("button", { name: "Duur toevoegen", exact: true }).click();
  await page.getByRole("button", { name: "20", exact: true }).click();
  await page.getByRole("heading", { name: "Openstaande acties", exact: true }).click();
  await page.mouse.move(0, 0);
  await expect(controls).toHaveAttribute("data-document-filled", "true");
  await expect(controls).toHaveCSS("opacity", "1");
  await page.reload();
  await expect(editor.getByRole("button", { name: "Duur: 20 minuten. Wijzigen" })).toBeVisible();
  await page.getByRole("heading", { name: "Openstaande acties", exact: true }).click();
  await page.mouse.move(0, 0);
  await expect(controls).toHaveCSS("opacity", "1");
  const titleBox = await title.boundingBox();
  const controlsBox = await controls.boundingBox();
  expect(controlsBox!.x).toBeGreaterThanOrEqual(titleBox!.x + titleBox!.width);
  expect(controlsBox!.x - (titleBox!.x + titleBox!.width)).toBeLessThanOrEqual(16);
  expect(Math.abs(controlsBox!.y - titleBox!.y)).toBeLessThan(16);
  await page.screenshot({ path: "screenshots/notepad-filled-controls.png", fullPage: true });
  await editor.getByRole("button", { name: "Duur: 20 minuten. Wijzigen" }).click();
  await page.getByRole("button", { name: "Geen duur", exact: true }).click();
  await page.getByRole("heading", { name: "Openstaande acties", exact: true }).click();
  await page.mouse.move(0, 0);
  await expect(controls).toHaveCSS("opacity", "0");
});

test("assistant opens as an inset rounded frame below the blue band", async ({ page }) => {
  await page.goto("/probeer?variant=b");
  await page.getByRole("button", { name: /^Start met een lege vergadering/ }).click();
  const panel = page.getByRole("complementary", { name: "Assistent", exact: true });
  await expect(panel).toBeVisible();
  await expect(panel).toHaveCSS("border-top-left-radius", "16px");
  await expect(panel).toHaveCSS("border-bottom-right-radius", "16px");
  for (const width of [1440, 960, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const box = await panel.boundingBox();
    expect(Math.abs(width - box!.x - box!.width - 16)).toBeLessThanOrEqual(1);
    expect(Math.abs(900 - box!.y - box!.height - 16)).toBeLessThanOrEqual(1);
    if (width >= 1024) expect(box!.y).toBe(32);
    else if (width >= 900) expect(box!.y).toBe(16);
    else expect(box!.x).toBe(16);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await panel.getByRole("button", { name: "Assistent sluiten", exact: true }).click();
  await page.getByRole("button", { name: "Assistent openen", exact: true }).click();
  await expect(panel).toBeVisible();
  await expect(panel).toHaveCSS("border-bottom-right-radius", "16px");
  await expect(panel).toHaveCSS("opacity", "1");
  await page.screenshot({ path: "screenshots/assistant-frame.png", fullPage: true });
});
