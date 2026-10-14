import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./meeting-to-action-still.module.css";

/**
 * "Van agendapunt naar acties" in eindtoestand, voor het startscherm: gedimde kaarten op het navy vlak, met het
 * nieuwe agendapunt als enige heldere punt. Bij het laden wordt het oude punt één keer doorgestreept en schuift
 * het nieuwe punt in; daarna staat alles stil (geen loop). Bij `prefers-reduced-motion` meteen de eindtoestand.
 * Decoratief (`aria-hidden`). De volledige animatie (MeetingToActionIllustration) blijft voor login en website.
 */
export function MeetingToActionStill({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn(styles.stage, className)}>
      <svg className={styles.links} viewBox="0 0 580 360" preserveAspectRatio="none">
        <path d="M310 196 C 330 196, 330 64, 350 64" />
        <path d="M310 196 C 330 196, 330 268, 350 268" />
      </svg>
      <div className={cn(styles.card, styles.agenda)}>
        <span className={styles.kicker}>Productieoverleg · maandag</span>
        <div className={styles.heading}>Lopende orders</div>
        <div className={styles.bar} style={{ width: "92%", marginTop: 14 }} />
        <div className={styles.bar} style={{ width: "64%" }} />
        <div className={styles.item}>
          <span className={styles.dot} />
          <span>
            <span className={styles.strike}>Staal-leverancier blijft te laat leveren</span>
          </span>
        </div>
        <div className={styles.new}>
          <span className={styles.dot} />
          Nieuwe staal-leverancier bevestigen
          <span className={styles.tag}>nieuw</span>
        </div>
      </div>
      <div className={cn(styles.card, styles.outcome, styles.action)}>
        <span className={styles.label}>
          <span className={styles.check}>
            <Check size={11} strokeWidth={4} />
          </span>
          Actie
        </span>
        <span className={styles.title}>Staal-leverancier opnieuw bellen</span>
        <span className={styles.done}>Afgevinkt door Sofie, via mail</span>
      </div>
      <div className={cn(styles.card, styles.outcome, styles.decision)}>
        <span className={styles.label}>
          <span className={styles.check}>
            <Check size={11} strokeWidth={4} />
          </span>
          Beslissing
        </span>
        <span className={styles.title}>We werken met een andere leverancier</span>
        <span className={styles.done}>Bevestigd in het overleg</span>
      </div>
    </div>
  );
}
