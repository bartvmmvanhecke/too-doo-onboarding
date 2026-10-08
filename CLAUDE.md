@AGENTS.md

## UI: shadcn/ui

- Use shadcn/ui for all UI. Before building any UI element, check if a shadcn component exists.
- Install components only via `npx shadcn@latest add <component>`, so they land in `components/ui/`. Never hand-write or copy component code.
- Composed patterns (e.g. date picker = popover + calendar + button) go in a component outside `components/ui/`.
- Never overwrite existing files in `components/ui/` without asking me first.
- No hardcoded colors (hex, bg-blue-600, …). Use semantic classes (bg-primary, text-muted-foreground). New tokens go in `app/globals.css`.
