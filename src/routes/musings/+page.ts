import { loadAllContent } from '$lib/content/loader';

export async function load() {
	const musings = loadAllContent('musings');
	return { musings };
}
