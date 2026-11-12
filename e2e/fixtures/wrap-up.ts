import type { Page } from "@playwright/test";
export async function seedWrapUp(
  page: Page,
  options: { automatic?: boolean; next?: boolean; age?: number; noActivity?: boolean; separateFeedback?: boolean } = {},
) {
  await page.clock.install({ time: new Date("2026-11-09T10:20:00+01:00") });
  await page.goto("/app");
  await page.evaluate((options) => {
    const now = Date.now(),
      start = now - 80 * 60000;
    const meeting = {
      id: "wrap-test",
      name: "Directievergadering",
      type: "Management",
      recurrence: "weekly",
      seriesId: "series",
      date: "2026-11-09",
      time: 540,
      duration: 60,
      participants: ["jp", "sd"],
      startedBy: "jp",
      actions: [{ id: "action", what: "Offerte opvragen", ownerId: null, deadline: "", done: false }],
      showWelcome: false,
      held: false,
      invited: true,
      startedAt: start,
      lastActivityAt: options.noActivity ? start : now - 30 * 60000,
      blocks: [
        {
          id: "topics",
          kind: "topics",
          title: "Lopende zaken",
          presenterId: null,
          duration: null,
          items: Array.from({ length: 6 }, (_, i) => ({
            id: String(i + 1),
            text: `Punt ${i + 1}`,
            ownerIds: ["jp"],
            purposes: [],
            duration: 10,
            entries:
              i === 1
                ? [
                    {
                      id: "entry",
                      kind: "action",
                      actionId: "action",
                      text: "Offerte opvragen",
                      ownerId: null,
                      date: "",
                    },
                  ]
                : [],
            visitedAt: i === 1 || i === 4 ? now - 30 * 60000 : undefined,
            runStatus: [0, 3].includes(i) ? "done" : "open",
          })),
        },
      ],
      run: options.automatic
        ? null
        : { startedAt: start, stepStartedAt: now, currentId: "5", doneIds: ["1", "4"], postponedIds: [], actuals: {} },
      ...(options.automatic
        ? {
            endedAt: now - (options.age ?? 0) * 86400000 - 15 * 60000,
            endReason: "auto",
            endTimeConfirmed: false,
            followUpStatus: "pending",
            noActivity: options.noActivity ?? false,
          }
        : {}),
    };
    const raw = JSON.parse(localStorage.getItem("too-doo-onboarding") || '{"state":{},"version":4}');
    raw.state.user = { firstName: "Jan", lastName: "Peeters", email: "jan@example.com", company: "Test" };
    raw.state.demo = {
      login: "success",
      calendar: "series",
      wrapUpToolbar: true,
      wrapUpPrimary: false,
      wrapUpCompact: false,
      wrapUpSeparateFeedback: options.separateFeedback ?? false,
    };
    raw.state.meetings = [
      meeting,
      ...(options.next === false
        ? []
        : [
            {
              ...meeting,
              id: "next",
              date: "2026-11-16",
              run: null,
              blocks: [],
              actions: [],
              startedAt: undefined,
              lastActivityAt: undefined,
              endedAt: undefined,
              followUpStatus: undefined,
            },
          ]),
    ];
    localStorage.setItem("too-doo-onboarding", JSON.stringify(raw));
  }, options);
  await page.goto("/app/overleg/wrap-test");
}
export async function storedMeetings(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("too-doo-onboarding")!).state.meetings);
}
