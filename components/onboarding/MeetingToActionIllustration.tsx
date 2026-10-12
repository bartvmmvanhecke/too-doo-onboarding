"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Overgang, laag 1 (0–220 ms): terug naar het agendapunt en vervagen. */
const RETREAT = { x: -190, scale: 0.9, opacity: 0 };
const EXIT = { duration: 0.22, ease: [0.65, 0, 0.35, 1] as const };

function Check() {
  return (
    <span className="mta-check">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </span>
  );
}

/**
 * "Van agendapunt naar acties" (SPEC-LAZY.md §4, Stap 0; C0f): een agendapunt geeft een actie en een beslissing,
 * die worden afgevinkt, en het volgende agendapunt staat klaar. Loop van 12 s in pure CSS; bij
 * `prefers-reduced-motion` de eindtoestand. Decoratief (`aria-hidden`), ook bruikbaar op de website.
 *
 * `retreat`: de overgang naar de app (laag 1); actie en beslissing schuiven terug naar het agendapunt
 * (AnimatePresence) en verdwijnen.
 * `renderAgenda`: omhulsel rond de agendakaart, bv. voor een gedeeld element dat de titel van het overleg wordt.
 */
export function MeetingToActionIllustration({
  retreat = false,
  renderAgenda = (card) => card,
  className,
}: {
  retreat?: boolean;
  renderAgenda?: (card: ReactNode) => ReactNode;
  className?: string;
}) {
  return (
    <div aria-hidden className={cn("mta-stage", className)}>
      {renderAgenda(
        <div className={cn("mta-card", "mta-agenda")}>
          <span className="mta-kicker">Productieoverleg · maandag</span>
          <div className="mta-heading">Lopende orders</div>
          <div className="mta-bar" style={{ width: "92%", marginTop: 14 }} />
          <div className="mta-bar" style={{ width: "64%" }} />
          <div className="mta-item">
            <span className="mta-dot" />
            <span className="mta-item-text">Staal-leverancier blijft te laat leveren</span>
          </div>
          <div className="mta-new">
            <span className="mta-dot" />
            Nieuwe staal-leverancier bevestigen
            <span className="mta-new-tag">nieuw</span>
          </div>
        </div>,
      )}
      <AnimatePresence>
        {!retreat && (
          <motion.div key="lines" exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <div className={cn("mta-line", "mta-line1")} />
            <div className={cn("mta-line", "mta-line2")} />
          </motion.div>
        )}
        {!retreat && (
          <motion.div key="action" className={cn("mta-slot", "mta-slot-action")} exit={RETREAT} transition={EXIT}>
            <div className={cn("mta-card", "mta-act")}>
              <span className="mta-label">
                <Check />
                Actie
              </span>
              <span className="mta-title">Staal-leverancier opnieuw bellen</span>
              <span className="mta-done">Afgevinkt door Sofie, via mail</span>
              <span className="mta-meta">
                <span className="mta-avatar">SO</span>
                Sofie
                <span className="mta-date">vr 16 okt</span>
              </span>
            </div>
          </motion.div>
        )}
        {!retreat && (
          <motion.div key="decision" className={cn("mta-slot", "mta-slot-decision")} exit={RETREAT} transition={EXIT}>
            <div className={cn("mta-card", "mta-act")}>
              <span className="mta-label">
                <Check />
                Beslissing
              </span>
              <span className="mta-title">We werken met een andere leverancier</span>
              <span className="mta-done">Bevestigd in het overleg</span>
              <span className="mta-meta">
                <span className="mta-decide">Beslissen</span>
                <span style={{ marginLeft: "auto" }}>ma 12 okt</span>
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
