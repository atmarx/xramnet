<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import MiniGalaxy, { type NodeClickData } from '$lib/components/MiniGalaxy.svelte';
	import PreviewCard from '$lib/components/PreviewCard.svelte';

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

	// MiniGalaxy state
	let selectedNode: NodeClickData | null = $state(null);
	let isDesktop = $state(false);

	// Responsive galaxy sizing - larger on ultrawide
	const galaxySize = $derived.by(() => {
		if (!browser) return { width: 300, height: 350 };
		if (window.innerWidth >= 2500) return { width: 480, height: 500 };
		if (window.innerWidth >= 1600) return { width: 360, height: 400 };
		return { width: 300, height: 350 };
	});

	// Check screen width
	$effect(() => {
		if (!browser) return;

		function checkWidth() {
			isDesktop = window.innerWidth >= 1024;
		}

		checkWidth();
		window.addEventListener('resize', checkWidth);

		return () => window.removeEventListener('resize', checkWidth);
	});

	function handleNodeClick(nodeData: NodeClickData | null) {
		// Don't show preview for center node (current page)
		if (nodeData?.type === 'center') return;
		selectedNode = nodeData;
	}

	function handlePreviewClose() {
		selectedNode = null;
	}

	function handleNavigate(href: string) {
		selectedNode = null;
		goto(href);
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

				{#if isDesktop && data.item}
					<div class="sidebar-section galaxy-section">
						<span class="sidebar-label">Related</span>
						<div class="galaxy-container">
							<MiniGalaxy
								currentItem={data.item}
								currentType="musings"
								width={galaxySize.width}
								height={galaxySize.height}
								onNodeClick={handleNodeClick}
							/>
							{#if selectedNode}
								<PreviewCard
									item={selectedNode.item}
									type={selectedNode.type}
									tagName={selectedNode.tagName}
									position={selectedNode.position}
									containerBounds={galaxySize}
									onClose={handlePreviewClose}
									onNavigate={handleNavigate}
								/>
							{/if}
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
