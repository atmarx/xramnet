import { contentTypes, type ContentType } from './config';
import type { ContentItem, ContentModule, ContentMetadata } from './types';

function parseMetadata(metadata: ContentMetadata | undefined, slug: string): ContentItem | null {
	// Skip files without valid frontmatter
	if (!metadata) return null;

	const tags = metadata.tags
		? String(metadata.tags)
				.split(',')
				.map((t) => t.trim())
		: [];

	return {
		slug,
		title: metadata.title ?? slug,
		description: metadata.description ?? '',
		date: metadata.date ?? '',
		tags,
		metadata
	};
}

function getSlugFromPath(path: string): string {
	return path.split('/').pop()?.replace('.md', '') ?? '';
}

function getTypeFromPath(path: string): string {
	const parts = path.split('/');
	const libIndex = parts.indexOf('lib');
	return parts[libIndex + 1] ?? '';
}

// Load all markdown files from all content types
// Using a pattern that captures all content directories
const allModules = import.meta.glob('/src/lib/*/*.md', { eager: true }) as Record<
	string,
	ContentModule
>;

export function loadAllContent(type: ContentType): ContentItem[] {
	const items: ContentItem[] = [];

	for (const [path, module] of Object.entries(allModules)) {
		if (getTypeFromPath(path) !== type) continue;

		const slug = getSlugFromPath(path);
		const item = parseMetadata(module.metadata, slug);
		if (!item) continue;  // Skip files without valid frontmatter
		if (module.metadata?.draft) continue;  // Skip drafts
		item.content = module.default;
		items.push(item);
	}

	return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getContentBySlug(type: ContentType, slug: string): ContentItem | null {
	const path = `/src/lib/${type}/${slug}.md`;
	const module = allModules[path];

	if (!module) return null;
	if (module.metadata?.draft) return null;  // Skip drafts

	const item = parseMetadata(module.metadata, slug);
	if (!item) return null;  // Skip files without valid frontmatter
	item.content = module.default;
	return item;
}

export function getContentByTag(type: ContentType, tag: string): ContentItem[] {
	return loadAllContent(type).filter((item) =>
		item.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
	);
}

export function getAllContentByTag(tag: string): Record<ContentType, ContentItem[]> {
	const result = {} as Record<ContentType, ContentItem[]>;

	for (const type of contentTypes) {
		const items = getContentByTag(type, tag);
		if (items.length > 0) {
			result[type] = items;
		}
	}

	return result;
}

export function getAllTags(): string[] {
	const tagSet = new Set<string>();

	for (const type of contentTypes) {
		for (const item of loadAllContent(type)) {
			for (const tag of item.tags) {
				tagSet.add(tag.toLowerCase());
			}
		}
	}

	return Array.from(tagSet).sort();
}
