<script lang="ts">
	let { data } = $props();

	// Import all project images
	const images = import.meta.glob('/src/lib/assets/projects/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

	// Get image URL from metadata path by matching filename
	function getImageUrl(imagePath: string | undefined): string | null {
		if (!imagePath) return null;
		const filename = imagePath.split('/').pop();
		const entry = Object.entries(images).find(([key]) => key.endsWith('/' + filename));
		return entry ? entry[1] : null;
	}

	const months = ['January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'];

	function formatDate(d: unknown): string {
		const str = d instanceof Date ? d.toISOString().split('T')[0] : String(d);
		const [year, month, day] = str.split('-');
		return `${months[parseInt(month) - 1]} ${parseInt(day)}, ${year}`;
	}

	// Parse comma-delimited dates into array
	const dates = $derived(
		data.type === 'post' && data.metadata.date
			? String(data.metadata.date).split(',').map((d: string) => d.trim())
			: []
	);

	// Parse comma-delimited tags into array
	const tags = $derived(
		data.type === 'post' && data.metadata.tags
			? String(data.metadata.tags).split(',').map((t: string) => t.trim())
			: []
	);

	const pageTitle = $derived(
		data.type === 'post' ? `${data.metadata.title} | xram.net` : `#${data.tag} | xram.net`
	);

	const pageDescription = $derived(data.type === 'post' ? data.metadata.description : null);

	const imageUrl = $derived(data.type === 'post' ? getImageUrl(data.metadata.image) : null);

	function getDateLabel(index: number) {
		return index === 0 ? 'Added' : 'Updated';
	}
</script>

<svelte:head>
	<title>{pageTitle}</title>
	{#if pageDescription}
		<meta name="description" content={pageDescription} />
	{/if}
</svelte:head>

{#if data.type === 'post'}
	<article class="project">
		<div class="project-layout">
			<div class="project-main">
				<h1>{data.metadata.title}</h1>

				<div class="project-content">
					<data.content />
				</div>

				{#if imageUrl}
					<div class="project-image">
						<img src={imageUrl} alt="{data.metadata.title} screenshot" />
					</div>
				{/if}

				{#if data.metadata.url}
					<div class="project-link">
						<a href={data.metadata.url} target="_blank" rel="noopener" class="visit-button">
							Visit Project &rarr;
						</a>
					</div>
				{/if}

				<footer>
					<a href="/projects">&larr; Back to Projects</a>
				</footer>
			</div>

			<aside class="sidebar">
				{#if dates.length > 0}
					<div class="sidebar-section">
						{#each dates as date, i}
							<div class="sidebar-date">
								<span class="date-label">{getDateLabel(i)}</span>
								<time>{formatDate(date)}</time>
							</div>
						{/each}
					</div>
				{/if}

				{#if tags.length > 0}
					<div class="sidebar-section">
						<span class="sidebar-label">Tags</span>
						<div class="sidebar-tags">
							{#each tags as tag}
								<a href="/projects/{tag.toLowerCase()}" class="tag">{tag}</a>
							{/each}
						</div>
					</div>
				{/if}

				{#if data.metadata.url}
					<div class="sidebar-section">
						<span class="sidebar-label">URL</span>
						<div class="sidebar-url">
							<a href={data.metadata.url} class="url">{data.metadata.url.replace(/^https?:\/\//, '')}</a>
						</div>
					</div>
				{/if}

				{#if data.metadata.git}
					<div class="sidebar-section">
						<span class="sidebar-label">Source</span>
						<div class="sidebar-git">
							<a href={data.metadata.git} class="git-link">
								<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
									<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
								</svg>
								{data.metadata.git.replace(/^https?:\/\/(www\.)?github\.com\//, '')}
							</a>
						</div>
					</div>
				{/if}

			</aside>
		</div>
	</article>
{:else}
	<div class="projects-page">
		<h1>#{data.tag}</h1>
		<p class="subtitle">Projects tagged with "{data.tag}"</p>

		<div class="projects-grid">
			{#each data.posts as project}
				<a href="/projects/{project.slug}" class="project-card">
					<h2>{project.title}</h2>
					{#if project.description}
						<p>{project.description}</p>
					{/if}
					{#if project.date}
						<time>{formatDate(project.date.split(',')[0].trim())}</time>
					{/if}
				</a>
			{/each}
		</div>

		<div class="tag-back">
			<a href="/projects">&larr; All Projects</a>
		</div>
	</div>
{/if}
