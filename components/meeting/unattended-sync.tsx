"use client";
import { meetingNow } from "@/lib/meeting-clock";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { runDigestJob } from "@/lib/meeting-digest";
import { USER_PERSON_ID } from "@/lib/mock-data";
import { reconcileBacklog } from "@/lib/wrap-up-flow";
import { unattended } from "@/lib/meeting-wrap-up";
/** Local sync fallback, also reconciles when returning after closing the tab.
 * TODO(api): run unattended() in a server job with atomic automatic closure.
 * There is no backend/mail infrastructure in this repository; no emails leave this prototype.
 */
export function UnattendedSync() {
  useEffect(() => {
    const sync = () => {
      const previous = useStore.getState().meetings;
      let changed = false;
      let meetings = previous.map((m) => {
        const updated = unattended(m, meetingNow(m));
        changed ||= updated !== m;
        return updated;
      });
      const attached = reconcileBacklog(meetings);
      changed ||= attached !== meetings;
      meetings = attached;
      const state = useStore.getState();
      // TODO(api): a server worker owns the actual digest delivery. This outbox only simulates the schedule locally.
      const digest = state.user
        ? runDigestJob({
            meetings,
            userId: USER_PERSON_ID,
            now: Date.now(),
            frequency: state.digestFrequency,
            lastSentAt: state.digestLastSentAt,
          })
        : null;
      if (!changed && !digest) return;
      useStore.setState({ meetings, ...(digest ? { digestLastSentAt: digest.sentAt, digestOutbox: digest } : {}) });
    };
    sync();
    const interval = window.setInterval(sync, 30000);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);
  return null;
}
