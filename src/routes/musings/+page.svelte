<script lang="ts">
	let { data } = $props();

	const months = ['January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'];

	function formatDate(d: unknown): string {
		const str = d instanceof Date ? d.toISOString().split('T')[0] : String(d);
		const [year, month, day] = str.split('-');
		return `${months[parseInt(month) - 1]} ${parseInt(day)}, ${year}`;
	}
</script>

<svelte:head>
	<title>Musings | xram.net</title>
</svelte:head>

<div class="musings-page">
	<h1>Musings</h1>
	<p class="subtitle">Thoughts, rants, and occasional wisdom.</p>

	{#if data.musings.length === 0}
		<p class="empty">Nothing here yet.</p>
	{:else}
		<div class="musings-list">
			{#each data.musings as musing}
				<a href="/musings/{musing.slug}" class="musing-card">
					<div class="musing-header">
						<h2>{musing.title}</h2>
						{#if musing.date}
							<time>{formatDate(musing.date)}</time>
						{/if}
					</div>
					{#if musing.description}
						<p>{musing.description}</p>
					{/if}
					<div class="tags">
						{#each musing.tags as tag}
							<span class="tag">{tag}</span>
						{/each}
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
