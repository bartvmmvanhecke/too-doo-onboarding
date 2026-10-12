/**
 * Meetpunten van Variant A (SPEC-LAZY.md §8). Logt nu naar de console; later naar PostHog.
 * Eén plek, zodat de koppeling enkel hier verandert.
 */
export type TrackEvent =
  | "cta_clicked"
  | "trial_app_opened"
  | "assistant_entry_chosen"
  | "assistant_message_sent"
  | "meeting_parsed"
  | "meeting_confirmed"
  | "actions_extracted"
  | "first_action_with_owner"
  | "meeting_ready"
  | "save_prompt_shown"
  | "signup_method_selected"
  | "sso_result"
  | "signup_completed"
  | "owner_mails_sent"
  | "guest_returned";

export type TrackProps = Record<string, string | number | boolean | string[] | null>;

export function track(event: TrackEvent, props: TrackProps = {}): void {
  console.info(`[track] ${event}`, props);
}
