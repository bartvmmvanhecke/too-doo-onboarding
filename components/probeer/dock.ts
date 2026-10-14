/** Overgang startscherm → app (± 700 ms): gedeelde elementen en timing. */

/** Gedeelde elementen (framer-motion `layoutId`): het navy vlak wordt de zijbalk, het logo landt erin. */
export const SHARED = { panel: "trial-nav", logo: "trial-logo" } as const;

/** Ease van de hele overgang. */
export const DOCK_EASE = [0.4, 0, 0.2, 1] as const;
/** Laag 1 (0–150 ms): links leegmaken en de keuzes laten vervagen; logo en paneel blijven staan. */
export const CLEAR = { duration: 0.15, ease: DOCK_EASE };
/** Laag 2 (150–650 ms): vlak → zijbalk, contentvlak schuift in, paneel versmalt. */
export const DOCK = { duration: 0.5, ease: DOCK_EASE };

/** Wanneer elke laag start en wanneer de app-layout er exact staat (ms). */
export const DOCK_AT = 150;
export const DOCK_DONE = 700;
