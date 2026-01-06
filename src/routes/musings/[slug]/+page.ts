import { error } from '@sveltejs/kit';
import { getContentBySlug, getContentByTag } from '$lib/content/loader';

export async function load({ params }) {
	// First, try to find a post with this slug
	const post = getContentBySlug('musings', params.slug);

	if (post) {
		return {
			type: 'post' as const,
			content: post.content,
			metadata: post.metadata
		};
	}

	// No post found, check if it's a tag
	const tag = params.slug;
	const postsWithTag = getContentByTag('musings', tag);

	if (postsWithTag.length > 0) {
		return {
			type: 'tag' as const,
			tag,
			posts: postsWithTag
		};
	}

	// Neither post nor tag found
	throw error(404, `Not found: ${params.slug}`);
}
