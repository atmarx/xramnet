import { error } from '@sveltejs/kit';
import { getContentBySlug, getContentByTag } from '$lib/content/loader';

export async function load({ params }) {
	// First, try to find a project with this slug
	const project = getContentBySlug('projects', params.slug);

	if (project) {
		return {
			type: 'post' as const,
			content: project.content,
			metadata: project.metadata,
			item: project  // Full ContentItem for MiniGalaxy
		};
	}

	// No project found, check if it's a tag
	const tag = params.slug;
	const projectsWithTag = getContentByTag('projects', tag);

	if (projectsWithTag.length > 0) {
		return {
			type: 'tag' as const,
			tag,
			posts: projectsWithTag
		};
	}

	// Neither project nor tag found
	throw error(404, `Not found: ${params.slug}`);
}
