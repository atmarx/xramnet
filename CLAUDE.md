# xramnet - Personal Portfolio & Blog

A static SvelteKit site with a generic content system. Deployed to GitHub Pages.

## Tech Stack
- **SvelteKit 2** + **Svelte 5** (static adapter for GitHub Pages)
- **mdsvex** - Markdown with Svelte components
- **Vanilla CSS** - Dark theme, no framework

## Adding Content (Most Common Task)

### New Musing
Create `src/lib/musings/your-slug.md`:
```yaml
---
title: Your Title
description: Optional preview text
date: 2026-01-12
tags: tag1, tag2
---

Markdown content here...
```

### New Project
Create `src/lib/projects/your-slug.md`:
```yaml
---
title: Project Name
description: Short description
date: 2026-01-12
tags: tag1, tag2
url: https://example.com              # Optional: external link
image: /src/lib/assets/projects/x.webp  # Optional: screenshot
---

Markdown content here...
```

**That's it.** Content auto-discovers via `import.meta.glob()`. No registration needed.

### Date Format
- ISO format: `YYYY-MM-DD`
- Multiple dates (comma-separated) show as "Added" + "Updated": `2024-01-01, 2026-01-12`

### Images
- Store in `src/lib/assets/projects/` as `.webp`
- Convert with: `cwebp input.png -o output.webp`

## Project Structure
```
src/
├── lib/
│   ├── content/           # Generic loader system
│   │   ├── config.ts      # Content types: ['musings', 'projects']
│   │   ├── loader.ts      # Discovery & loading utilities
│   │   └── types.ts       # TypeScript interfaces
│   ├── musings/           # Musing markdown files
│   ├── projects/          # Project markdown files
│   └── assets/            # Images, logos, favicon
├── routes/
│   ├── +layout.svelte     # Header, nav, footer
│   ├── musings/           # /musings and /musings/[slug]
│   ├── projects/          # /projects and /projects/[slug]
│   └── tag/[tag]/         # Unified cross-type tag view
└── app.css                # All styles (~555 lines)
```

## Key Conventions
- **Dual-mode [slug] routes**: Show detail page OR tag filter (same route)
- **Tags**: Comma-separated in frontmatter, auto-lowercased
- **Extensible**: Add type to `config.ts` + create `src/lib/{type}/` + routes

## Commands
```bash
npm run dev      # Dev server at localhost:5173
npm run build    # Static build to /build
npm run preview  # Preview production build
```

## Development Environment
This project uses **nodeenv** (Node.js installed in a Python venv structure). When running in a **Flatpak-sandboxed environment** (like VSCode Flatpak), npm commands must be wrapped:

```bash
# Install dependencies
flatpak-spawn --host bash -c "source .venv/bin/activate && npm install"

# Add a new package
flatpak-spawn --host bash -c "source .venv/bin/activate && npm install package-name"

# Run any npm command
flatpak-spawn --host bash -c "source .venv/bin/activate && npm run dev"
```

Direct `npm` commands will fail in the sandbox because the `.venv` activation and node binaries are on the host system.

## Deployment
- Auto-deploys on push to `main` via GitHub Actions
- Workflow: `.github/workflows/deploy.yml`
- No manual steps needed
