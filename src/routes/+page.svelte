<script>
	import PhysicsPlayground from '$lib/components/PhysicsPlayground.svelte';

	let highlightType = $state(null);
	let triggerSwirl = $state(null);
	let triggerShake = $state(null);

	function toggleHighlight(type) {
		highlightType = highlightType === type ? null : type;
	}

	function handleSwirlReady(fn) {
		triggerSwirl = fn;
	}

	function handleShakeReady(fn) {
		triggerShake = fn;
	}
</script>

<div class="home">
	<div class="header-text">
		<h1>Hi, I'm Andrew</h1>
		<p class="tagline">Welcome to my corner of the internet.</p>
	</div>

	<div class="filter-buttons">
		<button
			class="filter-btn projects"
			class:active={highlightType === 'project'}
			onclick={() => toggleHighlight('project')}
		>
			<span class="btn-title">Projects</span>
			<span class="btn-desc">Things I've built</span>
		</button>
		<button
			class="filter-btn musings"
			class:active={highlightType === 'musing'}
			onclick={() => toggleHighlight('musing')}
		>
			<span class="btn-title">Musings</span>
			<span class="btn-desc">Thoughts and rants</span>
		</button>
		<button
			class="filter-btn tag-filter"
			class:active={highlightType === 'tag'}
			onclick={() => toggleHighlight('tag')}
		>
			<span class="btn-title">Tags</span>
			<span class="btn-desc">The glue :)</span>
		</button>
		<button
			class="filter-btn shake"
			onclick={() => triggerShake?.()}
			disabled={!triggerShake}
		>
			<span class="btn-title">Shake</span>
			<span class="btn-desc">Untangle</span>
		</button>
		<button
			class="filter-btn swirl"
			onclick={() => triggerSwirl?.()}
			disabled={!triggerSwirl}
		>
			<span class="btn-title">Swirl</span>
			<span class="btn-desc">Mix it up!</span>
		</button>
	</div>

	<PhysicsPlayground {highlightType} onSwirlReady={handleSwirlReady} onShakeReady={handleShakeReady} />
</div>

<style>
	.home {
		padding-top: 0;
	}

	.header-text {
		text-align: center;
		margin-bottom: 2rem;
	}

	.header-text h1 {
		font-size: 2.5rem;
		margin-bottom: 0.25rem;
	}

	.header-text .tagline {
		color: var(--color-text-muted);
		font-size: 1.1rem;
		margin: 0;
	}

	.filter-buttons {
		display: flex;
		gap: 1rem;
		justify-content: center;
	}

	.filter-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		background: transparent;
		border: 2px solid;
		padding: 0.75rem 1.25rem;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
		text-align: center;
	}

	.filter-btn.projects {
		border-color: rgba(100, 200, 150, 0.5);
		color: #fff;
	}

	.filter-btn.projects:hover,
	.filter-btn.projects.active {
		background: rgba(100, 200, 150, 0.15);
		border-color: rgba(100, 200, 150, 0.8);
	}

	.filter-btn.musings {
		border-color: rgba(107, 159, 255, 0.5);
		color: #fff;
	}

	.filter-btn.musings:hover,
	.filter-btn.musings.active {
		background: rgba(107, 159, 255, 0.15);
		border-color: rgba(107, 159, 255, 0.8);
	}

	.filter-btn.tag-filter {
		border-color: rgba(136, 136, 136, 0.5);
		color: #fff;
	}

	.filter-btn.tag-filter:hover,
	.filter-btn.tag-filter.active {
		background: rgba(136, 136, 136, 0.15);
		border-color: rgba(136, 136, 136, 0.8);
	}

	.filter-btn.shake {
		border-color: rgba(200, 180, 100, 0.5);
		color: #fff;
	}

	.filter-btn.shake:hover:not(:disabled) {
		background: rgba(200, 180, 100, 0.15);
		border-color: rgba(200, 180, 100, 0.8);
	}

	.filter-btn.swirl {
		border-color: rgba(255, 150, 100, 0.5);
		color: #fff;
	}

	.filter-btn.swirl:hover:not(:disabled) {
		background: rgba(255, 150, 100, 0.15);
		border-color: rgba(255, 150, 100, 0.8);
	}

	.filter-btn.shake:disabled,
	.filter-btn.swirl:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-title {
		font-size: 1.1rem;
		font-weight: 600;
	}

	.btn-desc {
		font-size: 0.85rem;
		opacity: 0.7;
	}
</style>
