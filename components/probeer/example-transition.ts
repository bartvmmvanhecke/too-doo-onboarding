/**
 * "Bekijk eerst een voorbeeld": naar /voorbeeld, een andere route (de app-shell met de meeting detail). Daar
 * werkt de layout-animatie van framer-motion niet over de routegrens heen; de View Transitions API neemt het
 * over. Het navy vlak en het logo zijn gedeelde elementen (`view-transition-name`, enkel tijdens deze
 * navigatie) die in de zijbalk van de app landen; de rest crossfadet.
 *
 * - Breed scherm, beweging toegestaan: morph van 500 ms.
 * - Reduced motion: enkel een crossfade van 150 ms. Smal scherm: crossfade van 200 ms.
 * - Geen View Transitions in de browser: de pagina vervaagt (200 ms), dan de nieuwe pagina.
 */

type ViewTransition = { finished: Promise<void> };
type DocumentWithViewTransition = Document & {
  startViewTransition?: (update: () => Promise<void>) => ViewTransition;
};

/**
 * Wacht tot de bestemming getoond kan worden (de titel van de meeting detail), maximaal `ms`. Met `setTimeout`:
 * tijdens een view transition is het renderen gepauzeerd en lopen `requestAnimationFrame`-callbacks niet.
 */
function until(ready: () => boolean, ms: number): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now();
    const check = () => (ready() || performance.now() - start > ms ? resolve() : setTimeout(check, 16));
    check();
  });
}

const arrived = (path: string) => () => window.location.pathname === path && !!document.querySelector("main h1");

/** Na de overgang: de focus op de titel van de meeting detail. */
function focusTitle() {
  const title = document.querySelector<HTMLElement>("main h1");
  if (!title) return;
  title.tabIndex = -1;
  title.focus({ preventScroll: true });
}

export function openWithTransition(href: string, push: (href: string) => void, reduce: boolean) {
  const path = href.split("?")[0];
  const root = document.documentElement;
  const doc = document as DocumentWithViewTransition;
  const wide = window.matchMedia("(min-width: 1024px)").matches;

  if (!doc.startViewTransition) {
    root.dataset.onboardingFade = "out";
    setTimeout(async () => {
      push(href);
      await until(arrived(path), 3000);
      root.dataset.onboardingFade = "in";
      focusTitle();
      setTimeout(() => delete root.dataset.onboardingFade, 250);
    }, 200);
    return;
  }

  root.dataset.onboardingVt = reduce ? "reduce" : wide ? "morph" : "fade";
  const transition = doc.startViewTransition(async () => {
    push(href);
    await until(arrived(path), 3000);
  });
  transition.finished.finally(() => {
    delete root.dataset.onboardingVt;
    focusTitle();
  });
}
