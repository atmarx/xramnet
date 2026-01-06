# xram.net

Personal portfolio and blog built with SvelteKit, mdsvex, and a generic content system.

## Architecture

### Generic Content System

The site uses a content system designed for extensibility. Adding a new content type (like `/art` or `/photos`) requires only:

1. Adding the type name to `src/lib/content/config.ts`
2. Creating markdown files in `src/lib/{type}/`
3. Creating route templates in `src/routes/{type}/`

#### Why This Approach?

Most blog systems either hardcode content types or require heavy configuration. This system sits in the middle: minimal boilerplate, maximum flexibility. The loader doesn't care what type of content it's loading—it just needs to know where to find markdown files and what frontmatter to expect.

#### Content Structure

```
src/lib/
├── content/
│   ├── config.ts     # Content types: ['musings', 'projects']
│   ├── loader.ts     # Generic loading utilities
│   └── types.ts      # TypeScript interfaces
├── musings/          # Markdown files
│   └── *.md
└── projects/         # Markdown files
    └── *.md
```

#### The Loader

`src/lib/content/loader.ts` uses Vite's `import.meta.glob()` to dynamically discover all markdown files at build time. Key functions:

- `loadAllContent(type)` - Get all items of a content type, sorted by date
- `getContentBySlug(type, slug)` - Get a single item or null
- `getContentByTag(type, tag)` - Filter within a content type
- `getAllContentByTag(tag)` - Cross-type tag search (powers `/tag/[tag]`)
- `getAllTags()` - All unique tags across all content types

#### Route Pattern

Each content type uses a dual-purpose `[slug]` route:

1. If slug matches a markdown file → render the detail page
2. If slug matches a tag → render filtered list

This avoids needing separate `/musings/post-name` and `/musings/tag/tag-name` routes.

### Tag System

Tags work at two levels:

- **Within a type**: `/musings/personal` shows musings tagged "personal"
- **Unified view**: `/tag/personal` shows ALL content tagged "personal", grouped by type

The unified tag route iterates over `contentTypes` from config, so new types automatically appear.

#### Prerendering Dynamic Routes

For static site generation, SvelteKit needs to know what dynamic routes exist. The `entries()` function in `+page.ts` files tells it:

```typescript
// src/routes/tag/[tag]/+page.ts
export function entries() {
  return getAllTags().map((tag) => ({ tag }));
}
```

### Markdown Frontmatter

Common fields across all content types:

```yaml
---
title: Required
description: Optional summary
date: 2026-01-05              # Or comma-delimited: 2024-01-01, 2026-01-05
tags: tag1, tag2, tag3        # Comma-delimited
---
```

Projects add:

```yaml
url: https://example.com      # External link button
```

### Date Handling

Dates are stored as `YYYY-MM-DD` strings and converted to display format via simple string manipulation. No `Date` objects, no timezone headaches:

```typescript
const [year, month, day] = str.split('-');
return `${months[parseInt(month) - 1]} ${parseInt(day)}, ${year}`;
```

## Development

```sh
npm install
npm run dev
```

## Building

```sh
npm run build
```

Static output goes to `/build`, configured for GitHub Pages deployment.

## Adding a New Content Type

Example: adding an `/art` section.

1. Update config:
   ```typescript
   // src/lib/content/config.ts
   export const contentTypes = ['musings', 'projects', 'art'] as const;
   ```

2. Create content:
   ```
   src/lib/art/
   ├── painting-one.md
   └── painting-two.md
   ```

3. Create routes:
   ```
   src/routes/art/
   ├── +page.ts          # List loader
   ├── +page.svelte      # List template
   └── [slug]/
       ├── +page.ts      # Detail/tag loader
       └── +page.svelte  # Detail/tag template
   ```

The loader, tag system, and unified `/tag/[tag]` route will automatically include the new type.
