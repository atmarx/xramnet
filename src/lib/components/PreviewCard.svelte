<script lang="ts">
	import type { ContentItem } from '$lib/content/types';
	import type { ContentType } from '$lib/content/config';

	let {
		item,
		type,
		tagName,
		position,
		containerBounds,
		onClose,
		onNavigate
	}: {
		item?: ContentItem;
		type: 'musing' | 'project' | 'tag' | 'center';
		tagName?: string;
		position: { x: number; y: number };
		containerBounds: { width: number; height: number };
		onClose: () => void;
		onNavigate: (href: string) => void;
	} = $props();

	// Calculate card position - keep within bounds
	const cardWidth = 220;
	const cardHeight = 140;
	const padding = 10;

	const left = $derived(Math.min(
		Math.max(padding, position.x - cardWidth / 2),
		containerBounds.width - cardWidth - padding
	));

	const top = $derived(Math.min(
		Math.max(padding, position.y + 30),
		containerBounds.height - cardHeight - padding
	));

	// Build href
	const href = $derived.by(() => {
		if (type === 'tag' && tagName) {
			return `/tag/${tagName}`;
		}
		if (item) {
			const contentType: ContentType = type === 'musing' ? 'musings' : 'projects';
			return `/${contentType}/${item.slug}`;
		}
		return null;
	});

	function handleNavigate() {
		if (href) {
			onNavigate(href);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}

	function truncate(str: string, maxLen: number): string {
		if (!str || str.length <= maxLen) return str || '';
		return str.slice(0, maxLen - 1) + '…';
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="preview-backdrop" onclick={onClose}></div>

<div
	class="preview-card"
	class:is-tag={type === 'tag'}
	style="left: {left}px; top: {top}px;"
	role="dialog"
	aria-modal="true"
>
	<button class="close-btn" onclick={onClose} aria-label="Close">×</button>

	{#if type === 'tag' && tagName}
		<div class="tag-preview">
			<span class="tag-hash">#</span>
			<span class="tag-name">{tagName}</span>
		</div>
		<p class="tag-hint">View all content with this tag</p>
	{:else if item}
		<h3 class="title">{truncate(item.title, 40)}</h3>
		{#if item.description}
			<p class="description">{truncate(item.description, 80)}</p>
		{/if}
		{#if item.tags.length > 0}
			<div class="tags">
				{#each item.tags.slice(0, 3) as tag}
					<span class="tag">{tag}</span>
				{/each}
				{#if item.tags.length > 3}
					<span class="tag more">+{item.tags.length - 3}</span>
				{/if}
			</div>
		{/if}
	{/if}

	{#if href}
		<button class="read-btn" onclick={handleNavigate}>
			{type === 'tag' ? 'Browse' : 'Read'} →
		</button>
	{/if}
</div>

<style>
	.preview-backdrop {
		position: fixed;
		inset: 0;
		z-index: 99;
	}

	.preview-card {
		position: absolute;
		z-index: 100;
		width: 220px;
		background: rgba(30, 30, 45, 0.95);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		padding: 12px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
		animation: fadeIn 0.15s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(-5px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.close-btn {
		position: absolute;
		top: 6px;
		right: 8px;
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.5);
		font-size: 18px;
		cursor: pointer;
		padding: 0;
		line-height: 1;
	}

	.close-btn:hover {
		color: #fff;
	}

	.title {
		margin: 0 0 6px;
		font-size: 14px;
		font-weight: 600;
		color: #fff;
		line-height: 1.3;
	}

	.description {
		margin: 0 0 8px;
		font-size: 12px;
		color: rgba(255, 255, 255, 0.7);
		line-height: 1.4;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		margin-bottom: 10px;
	}

	.tag {
		font-size: 10px;
		padding: 2px 6px;
		background: rgba(100, 100, 100, 0.5);
		border-radius: 4px;
		color: rgba(255, 255, 255, 0.8);
	}

	.tag.more {
		background: rgba(100, 100, 100, 0.3);
		color: rgba(255, 255, 255, 0.5);
	}

	.tag-preview {
		display: flex;
		align-items: baseline;
		gap: 2px;
		margin-bottom: 6px;
	}

	.tag-hash {
		color: rgba(255, 255, 255, 0.4);
		font-size: 16px;
	}

	.tag-name {
		font-size: 16px;
		font-weight: 600;
		color: #fff;
	}

	.tag-hint {
		margin: 0 0 10px;
		font-size: 11px;
		color: rgba(255, 255, 255, 0.5);
	}

	.read-btn {
		display: block;
		width: 100%;
		padding: 8px;
		background: rgba(107, 159, 255, 0.2);
		border: 1px solid rgba(107, 159, 255, 0.4);
		border-radius: 6px;
		color: rgb(107, 159, 255);
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s;
	}

	.read-btn:hover {
		background: rgba(107, 159, 255, 0.3);
		border-color: rgba(107, 159, 255, 0.6);
	}

	.is-tag .read-btn {
		background: rgba(100, 100, 100, 0.2);
		border-color: rgba(100, 100, 100, 0.4);
		color: rgba(255, 255, 255, 0.8);
	}

	.is-tag .read-btn:hover {
		background: rgba(100, 100, 100, 0.3);
		border-color: rgba(100, 100, 100, 0.6);
	}
</style>
