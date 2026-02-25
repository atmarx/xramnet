/**
 * Loads text snippets from the site's musings and projects content.
 * These float in space as shootable "text blob" entities.
 */
const musings = import.meta.glob('/src/lib/musings/*.md', { eager: true });
const projects = import.meta.glob('/src/lib/projects/*.md', { eager: true });

export interface ContentFragment {
	title: string;
	description: string;
	type: 'musing' | 'project';
	slug: string;
	/** Short display text for the floating blob */
	displayText: string;
}

const fragments: ContentFragment[] = [];

for (const [path, mod] of Object.entries(musings)) {
	const m = (mod as Record<string, any>).metadata;
	if (!m?.title) continue;
	if (m.draft) continue;
	const slug = path.split('/').pop()?.replace('.md', '') ?? '';
	fragments.push({
		title: m.title,
		description: m.description ?? '',
		type: 'musing',
		slug,
		displayText: m.title
	});
}

for (const [path, mod] of Object.entries(projects)) {
	const m = (mod as Record<string, any>).metadata;
	if (!m?.title) continue;
	if (m.draft) continue;
	const slug = path.split('/').pop()?.replace('.md', '') ?? '';
	fragments.push({
		title: m.title,
		description: m.description ?? '',
		type: 'project',
		slug,
		displayText: m.title
	});
}

// Fallback if no content found
if (fragments.length === 0) {
	fragments.push(
		{
			title: 'Signal detected...',
			description: 'A transmission from somewhere in the void.',
			type: 'musing',
			slug: '',
			displayText: 'Signal detected...'
		},
		{
			title: 'Welcome to The Rift',
			description: 'You have entered uncharted space.',
			type: 'musing',
			slug: '',
			displayText: 'Welcome to The Rift'
		}
	);
}

export function getFragmentCount(): number {
	return fragments.length;
}

export function getFragment(index: number): string {
	return fragments[index % fragments.length].displayText;
}

export function getFragmentData(index: number): ContentFragment {
	return fragments[index % fragments.length];
}
