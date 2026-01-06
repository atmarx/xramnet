import { loadAllContent } from '$lib/content/loader';

export async function load() {
	const projects = loadAllContent('projects');
	return { projects };
}
