<script lang="ts">
	import { tick } from 'svelte';
	import { getContentBySlug } from '$lib/content/loader';
	import type { ContentItem } from '$lib/content/types';
	import type { ContentType } from '$lib/content/config';

	interface DiscoveredEntry {
		item: ContentItem;
		id: string;
		title: string;
		type: 'musing' | 'project';
		timestamp: number;
	}

	let { onVisibilityChange = (_visible: boolean) => {} }: { onVisibilityChange?: (visible: boolean) => void } = $props();

	let entries: DiscoveredEntry[] = $state([]);
	let scrollContainer: HTMLDivElement | undefined = $state(undefined);
	let isPaused = $state(false);
	let isVisible = $state(false);

	// Auto-scroll
	$effect(() => {
		if (!scrollContainer || !isVisible) return;

		let animationFrame: number;
		let lastTime = performance.now();

		function scroll(now: number) {
			if (!isPaused && scrollContainer) {
				const delta = (now - lastTime) / 1000;
				if (scrollContainer.scrollHeight > scrollContainer.clientHeight) {
					scrollContainer.scrollTop += 40 * delta;
				}
			}
			lastTime = now;
			animationFrame = requestAnimationFrame(scroll);
		}

		animationFrame = requestAnimationFrame(scroll);
		return () => cancelAnimationFrame(animationFrame);
	});

	export function addDiscovery(type: string, slug: string, title: string) {
		const contentType = (type === 'musing' ? 'musings' : 'projects') as ContentType;
		const id = `${contentType}:${slug}`;

		// Deduplicate
		if (entries.some((e) => e.id === id)) return;

		const item = getContentBySlug(contentType, slug);
		if (!item || !item.content) return;

		entries = [
			...entries,
			{ item, id, title, type: type as 'musing' | 'project', timestamp: Date.now() }
		];
		if (!isVisible) {
			isVisible = true;
			onVisibilityChange(true);
		}

		// Scroll to new content after DOM update
		tick().then(() => {
			if (!isPaused && scrollContainer) {
				scrollContainer.scrollTo({
					top: scrollContainer.scrollHeight,
					behavior: 'smooth'
				});
			}
		});
	}

	function handleLogClick(e: MouseEvent) {
		const target = e.target as HTMLElement;
		const link = target.closest('a');
		if (link) {
			e.preventDefault();
			window.open(link.href, '_blank');
		}
	}
</script>

{#if isVisible}
	<div
		class="ships-log"
		bind:this={scrollContainer}
		onmouseenter={() => (isPaused = true)}
		onmouseleave={() => (isPaused = false)}
		onclick={handleLogClick}
		role="log"
	>
		<div class="log-title-bar">
			<span class="log-icon">📡</span>
			<span class="log-title">SHIP'S LOG</span>
			<span class="log-count">{entries.length}</span>
		</div>

		{#each entries as entry (entry.id)}
			<div
				class="log-entry"
				class:musing={entry.type === 'musing'}
				class:project={entry.type === 'project'}
			>
				<div class="log-header">
					<span class="log-entry-title">{entry.title}</span>
					<span class="log-label">
						{entry.type === 'musing' ? 'TRANSMISSION' : 'ARTIFACT'}
					</span>
				</div>
				<div class="log-content">
					<entry.item.content />
				</div>
				<div class="log-divider"></div>
			</div>
		{/each}

		{#if entries.length === 0}
			<div class="log-empty">
				<p>No transmissions received.</p>
				<p class="log-hint">Fly near text fragments to decode them.</p>
			</div>
		{/if}
	</div>
{/if}

<style>
	.ships-log {
		position: fixed;
		left: 0;
		top: 0;
		bottom: 0;
		width: 340px;
		overflow-y: auto;
		overflow-x: hidden;
		background: rgba(8, 12, 24, 0.9);
		border-right: 1px solid rgba(68, 136, 204, 0.15);
		backdrop-filter: blur(8px);
		z-index: 90;
		padding: 0 16px 32px;
		font-family: var(--font-mono);
		color: #8899aa;
		scrollbar-width: thin;
		scrollbar-color: rgba(68, 136, 204, 0.3) transparent;
		animation: log-slide-in 0.5s ease-out;
	}

	@keyframes log-slide-in {
		from {
			transform: translateX(-100%);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}

	.log-title-bar {
		position: sticky;
		top: 0;
		background: rgba(8, 12, 24, 0.95);
		padding: 12px 0 8px;
		border-bottom: 1px solid rgba(68, 136, 204, 0.2);
		display: flex;
		align-items: center;
		gap: 8px;
		z-index: 10;
		font-family: var(--font-pixel, var(--font-mono));
	}

	.log-icon {
		font-size: 14px;
	}

	.log-title {
		font-size: 10px;
		letter-spacing: 3px;
		color: #4488cc;
		flex: 1;
	}

	.log-count {
		font-size: 9px;
		color: #446688;
		background: rgba(68, 136, 204, 0.1);
		padding: 2px 6px;
		border-radius: 3px;
	}

	.log-entry {
		margin-top: 20px;
	}

	.log-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: 10px;
		padding-bottom: 6px;
		border-bottom: 1px solid rgba(68, 136, 204, 0.1);
	}

	.log-entry-title {
		font-size: 13px;
		color: #bbddff;
		font-family: var(--font-pixel, var(--font-mono));
		line-height: 1.4;
	}

	.log-label {
		font-size: 8px;
		letter-spacing: 2px;
		color: #446688;
		text-transform: uppercase;
		white-space: nowrap;
		margin-left: 8px;
	}

	/* Override mdsvex-rendered content for game context */
	.log-content {
		overflow-x: auto;
	}

	.log-content :global(h1),
	.log-content :global(h2),
	.log-content :global(h3),
	.log-content :global(h4) {
		color: #88bbdd;
		font-size: 12px;
		margin: 1em 0 0.4em;
		font-family: var(--font-pixel, var(--font-mono));
		letter-spacing: 0.5px;
	}

	.log-content :global(h1) {
		font-size: 13px;
	}

	.log-content :global(p) {
		font-size: 11px;
		line-height: 1.7;
		margin-bottom: 0.8em;
		color: #8899aa;
	}

	.log-content :global(a) {
		color: #4488cc;
		text-decoration: none;
		border-bottom: 1px dotted rgba(68, 136, 204, 0.3);
		pointer-events: auto;
		cursor: pointer;
	}

	.log-content :global(a:hover) {
		color: #66aaff;
	}

	.log-content :global(em) {
		color: #99aabb;
	}
	.log-content :global(strong) {
		color: #aaccdd;
	}

	.log-content :global(code) {
		font-size: 10px;
		background: rgba(20, 30, 50, 0.6);
		padding: 1px 4px;
		border-radius: 2px;
		color: #88aacc;
	}

	.log-content :global(pre) {
		font-size: 10px;
		background: rgba(15, 25, 40, 0.8);
		padding: 8px;
		border-radius: 4px;
		overflow-x: auto;
		max-width: 100%;
		margin: 0.8em 0;
		border: 1px solid rgba(68, 136, 204, 0.1);
	}

	.log-content :global(blockquote) {
		border-left: 2px solid rgba(68, 136, 204, 0.3);
		margin: 0.8em 0;
		padding: 4px 12px;
		color: #7788aa;
		font-style: italic;
	}

	.log-content :global(ul),
	.log-content :global(ol) {
		margin: 0.5em 0;
		padding-left: 20px;
		font-size: 11px;
		line-height: 1.6;
	}

	.log-content :global(hr) {
		border: none;
		border-top: 1px solid rgba(68, 136, 204, 0.1);
		margin: 1em 0;
	}

	.log-content :global(img) {
		max-width: 100%;
		height: auto;
		border-radius: 4px;
		margin: 0.5em 0;
		opacity: 0.8;
	}

	.log-content :global(sup) {
		font-size: 9px;
	}

	.log-content :global(table) {
		font-size: 10px;
		border-collapse: collapse;
		width: 100%;
		margin: 0.8em 0;
	}

	.log-content :global(th),
	.log-content :global(td) {
		padding: 4px 8px;
		border: 1px solid rgba(68, 136, 204, 0.15);
		text-align: left;
	}

	.log-content :global(th) {
		background: rgba(68, 136, 204, 0.08);
		color: #88bbdd;
	}

	/* Glowing divider between entries */
	.log-divider {
		height: 1px;
		margin: 24px 0;
		background: linear-gradient(90deg, transparent, rgba(68, 200, 255, 0.35), transparent);
		box-shadow: 0 0 8px rgba(68, 200, 255, 0.15);
	}

	/* Empty state */
	.log-empty {
		padding: 40px 20px;
		text-align: center;
		color: #445566;
		font-size: 11px;
	}

	.log-hint {
		margin-top: 8px;
		font-size: 9px;
		color: #334455;
		font-style: italic;
	}

	/* Musing vs Project subtle color differences */
	.log-entry.musing .log-entry-title {
		color: #aaccff;
	}
	.log-entry.project .log-entry-title {
		color: #aaffcc;
	}
	.log-entry.musing .log-label {
		color: #4466aa;
	}
	.log-entry.project .log-label {
		color: #44aa66;
	}
</style>
