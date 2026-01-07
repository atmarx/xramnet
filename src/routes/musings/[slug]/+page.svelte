<script lang="ts">
	let { data } = $props();

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
	<article class="musing">
		<div class="musing-layout">
			<div class="musing-main">
				<h1>{data.metadata.title}</h1>

				<div class="musing-content">
					<data.content />
				</div>

				<footer>
					<a href="/musings">&larr; Back to Musings</a>
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
								<a href="/musings/{tag.toLowerCase()}" class="tag">{tag}</a>
							{/each}
						</div>
					</div>
				{/if}
			</aside>
		</div>
	</article>
{:else}
	<div class="musings-page">
		<h1>#{data.tag}</h1>
		<p class="subtitle">Posts tagged with "{data.tag}"</p>

		<div class="musings-list">
			{#each data.posts as musing}
				<a href="/musings/{musing.slug}" class="musing-card">
					<h2>{musing.title}</h2>
					{#if musing.description}
						<p>{musing.description}</p>
					{/if}
					{#if musing.date}
						<time>{formatDate(musing.date.split(',')[0].trim())}</time>
					{/if}
				</a>
			{/each}
		</div>

		<div class="tag-back">
			<a href="/musings">&larr; All Musings</a>
		</div>
	</div>
{/if}
