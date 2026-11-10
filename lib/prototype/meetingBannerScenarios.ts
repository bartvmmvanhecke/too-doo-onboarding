import { useStore } from "@/lib/store";
import { agendaItems, plannedEnd } from "@/lib/meeting-wrap-up";
import { initialWrapUpDraft, finishWrapUp } from "@/lib/wrap-up-flow";
import { loadAutoClosedPreview } from "./meetingsOverviewScenarios";

export type MeetingBannerScenario = "proposed" | "no-activity" | "unfinished" | "completed";
export function loadMeetingBannerScenario(scenario: MeetingBannerScenario) {
  const id = loadAutoClosedPreview();
  if (!id) return;
  const state = useStore.getState();
  let meeting = state.meetings.find((item) => item.id === id)!;
  if (scenario === "no-activity")
    meeting = {
      ...meeting,
      noActivity: true,
      endedAt: plannedEnd(meeting),
      lastActivityAt: meeting.startedAt,
      blocks: meeting.blocks.map((block) => ({
        ...block,
        items: block.items.map((item) => ({ ...item, runStatus: "open", visitedAt: undefined, entries: [] })),
      })),
    };
  if (scenario === "unfinished")
    meeting = {
      ...meeting,
      endTimeConfirmed: true,
      wrapUpDraft: { ...initialWrapUpDraft(meeting, state.meetings), step: 3, entry: "later" },
    };
  if (scenario === "completed") {
    meeting = {
      ...meeting,
      endTimeConfirmed: true,
      wrapUpDraft: {
        ...initialWrapUpDraft(meeting, state.meetings),
        noNext: true,
        decisions: Object.fromEntries(agendaItems(meeting).map((item) => [item.id, "done"])),
      },
    };
    useStore.setState({ meetings: finishWrapUp(meeting, state.meetings, "saved") });
    return;
  }
  useStore.setState({ meetings: state.meetings.map((item) => (item.id === id ? meeting : item)) });
}
