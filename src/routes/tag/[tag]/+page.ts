import { error } from '@sveltejs/kit';
import { getAllContentByTag, getAllTags } from '$lib/content/loader';

export function entries() {
	return getAllTags().map((tag) => ({ tag }));
}

export async function load({ params }) {
	const tag = params.tag;
	const contentByType = getAllContentByTag(tag);

	// Check if any content exists with this tag
	const hasContent = Object.keys(contentByType).length > 0;

	if (!hasContent) {
		throw error(404, `No content found with tag: ${tag}`);
	}

	return {
		tag,
		contentByType
	};
}
