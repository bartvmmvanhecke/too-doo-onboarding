# Werkafspraken
- Elke opdracht begint op een nieuwe branch vanaf de laatste main:
  `git fetch && git switch -c <prefix>/<naam> origin/main`
  (prefix: claude voor Claude Code, codex voor Codex)
- Push nooit naar main. Merge niet. Werk alleen op je eigen branch.
- Raak alleen de mappen en bestanden aan die in de opdracht staan.
- Gedeelde bestanden zo weinig mogelijk aanraken: theme/tokens, globals.css, package.json, package-lock.json, routes en het prototypemenu. Moet het toch, voeg alleen iets toe (niets hernoemen of verwijderen) en vermeld het in je samenvatting.
- Geen nieuwe dependencies zonder dat te melden.
- Commit in kleine stappen. Na elke commit bouwt de app en zijn lint en typecheck groen.
- Op het einde: rebase op origin/main, push je branch en open een PR naar main.
- Eindig met een korte samenvatting: wat gebouwd is, welke gedeelde bestanden je aanraakte, en afwijkingen van de opdracht.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
