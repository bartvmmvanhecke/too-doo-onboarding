"use client";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { carryForward, unattended } from "@/lib/meeting-wrap-up";
/** Local sync fallback, also reconciles when returning after closing the tab.
 * TODO(api): run unattended() in a server job with atomic once-per-meeting reminder delivery.
 * There is no backend/mail infrastructure in this repository; no emails leave this prototype.
 */
export function UnattendedSync() {
  useEffect(()=>{
    const sync = () => {
      const previous = useStore.getState().meetings;
      let changed = false;
      let meetings = previous.map(m=>{const updated = unattended(m,Date.now());changed ||= updated !== m;return updated;});
      if (!changed) return;
      for (const m of meetings) if (m.endReason === "auto" && previous.find(p=>p.id===m.id)?.run) meetings = carryForward(m,meetings);
      useStore.setState({meetings});
    };
    sync();
    const interval = window.setInterval(sync,30000);
    window.addEventListener("focus",sync);
    document.addEventListener("visibilitychange",sync);
    return ()=>{window.clearInterval(interval);window.removeEventListener("focus",sync);document.removeEventListener("visibilitychange",sync);};
  },[]);
  return null;
}
