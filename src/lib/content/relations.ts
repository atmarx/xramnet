import { contentTypes, type ContentType } from './config';
import { loadAllContent } from './loader';
import type { ContentItem } from './types';

export interface RelatedContent {
	item: ContentItem;
	type: ContentType;
	sharedTags: string[];
}

/**
 * Find all content that shares at least one tag with the given item.
 * Returns related items sorted by number of shared tags (most overlap first).
 */
export function getRelatedContent(
	item: ContentItem,
	excludeSelf = true
): RelatedContent[] {
	const itemTags = new Set(item.tags.map((t) => t.toLowerCase()));
	if (itemTags.size === 0) return [];

	const relations = new Map<string, RelatedContent>();

	for (const type of contentTypes) {
		for (const candidate of loadAllContent(type)) {
			// Skip self if requested
			if (excludeSelf && candidate.slug === item.slug) continue;

			// Find shared tags
			const sharedTags = candidate.tags.filter((t) =>
				itemTags.has(t.toLowerCase())
			);

			if (sharedTags.length > 0) {
				const key = `${type}:${candidate.slug}`;
				relations.set(key, {
					item: candidate,
					type,
					sharedTags
				});
			}
		}
	}

	// Sort by number of shared tags (most overlap first)
	return Array.from(relations.values()).sort(
		(a, b) => b.sharedTags.length - a.sharedTags.length
	);
}

/**
 * Get the neighborhood data for a content item:
 * - The item's own tags
 * - Related content (one degree)
 */
export function getNeighborhood(item: ContentItem, currentType: ContentType) {
	return {
		center: { item, type: currentType },
		tags: item.tags,
		related: getRelatedContent(item)
	};
}
