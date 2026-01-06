<script lang="ts">
	import { contentTypes } from '$lib/content/config';

	let { data } = $props();

	const months = ['January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'];

	function formatDate(d: unknown): string {
		const str = d instanceof Date ? d.toISOString().split('T')[0] : String(d);
		const [year, month, day] = str.split('-');
		return `${months[parseInt(month) - 1]} ${parseInt(day)}, ${year}`;
	}

	function getTypeLabel(type: string): string {
		return type.charAt(0).toUpperCase() + type.slice(1);
	}

	function getItemUrl(type: string, slug: string): string {
		return `/${type}/${slug}`;
	}
</script>

<svelte:head>
	<title>#{data.tag} | xram.net</title>
</svelte:head>

<div class="tag-page">
	<h1>#{data.tag}</h1>
	<p class="subtitle">All content tagged with "{data.tag}"</p>

	{#each contentTypes as type}
		{#if data.contentByType[type]?.length > 0}
			<section class="tag-section">
				<h2>{getTypeLabel(type)}</h2>
				<div class="tag-list">
					{#each data.contentByType[type] as item}
						<a href={getItemUrl(type, item.slug)} class="tag-card">
							<h3>{item.title}</h3>
							{#if item.description}
								<p>{item.description}</p>
							{/if}
							{#if item.date}
								<time>{formatDate(item.date.split(',')[0].trim())}</time>
							{/if}
						</a>
					{/each}
				</div>
			</section>
		{/if}
	{/each}
</div>
