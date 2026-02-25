<script>
	import PhysicsPlayground from '$lib/components/PhysicsPlayground.svelte';
	import Cutscene from '$lib/components/Cutscene.svelte';
	import logoLarge from '$lib/assets/x-300.png';
	import { goto } from '$app/navigation';

	let highlightType = $state(null);
	let triggerSwirl = $state(null);
	let triggerShake = $state(null);
	let triggerReset = $state(null);
	let score = $state(0);

	// Cutscene state
	let cutsceneActive = $state(false);
	let cutsceneScore = $state(0);
	let cutsceneHealth = $state(25);
	let springLength = $state(425);
	let springStiffnessSlider = $state(30);  // Slider value 1-60
	let springStiffness = $derived(springStiffnessSlider / 100000);
	let driveFrequency = $state(0);          // 0-100 → mapped to Hz
	let driveExcitement = $state(0);         // 0-100 → amplitude
	let mobileDrawerOpen = $state(false);
	let isMobile = $state(false);
	let prefersReducedMotion = $state(false);

	// Blob click popover state
	let selectedBlob = $state(null);
	let popoverStyle = $state('');

	function toggleHighlight(type) {
		highlightType = highlightType === type ? null : type;
	}

	function handleSwirlReady(fn) {
		triggerSwirl = fn;
	}

	function handleShakeReady(fn) {
		triggerShake = fn;
	}

	function handleResetReady(fn) {
		triggerReset = fn;
	}

	function handleScoreChange(newScore) {
		score = newScore;
	}

	function handleShipEscaped(data) {
		cutsceneScore = data.score;
		cutsceneHealth = data.shipHealth;
		cutsceneActive = true;
	}

	function handleCutsceneComplete() {
		cutsceneActive = false;
		goto(`/game?score=${cutsceneScore}&health=${cutsceneHealth}`);
	}

	function toggleDrawer() {
		mobileDrawerOpen = !mobileDrawerOpen;
	}

	function handleBlobClick(data) {
		if (!data) {
			selectedBlob = null;
			return;
		}

		if (!isMobile) {
			// Desktop: physics tooltips handle display inside canvas.
			// This callback fires when user clicks the tooltip → navigate directly.
			if (data.type === 'tag') {
				goto(`/tag/${data.tagName}`);
			} else {
				goto(`/${data.type}s/${data.slug}`);
			}
			return;
		}

		// Mobile: use bottom sheet
		selectedBlob = data;
	}

	let centerHidden = $state(false);

	function handleCenterDestroyed(dead) {
		centerHidden = dead;
	}

	function dismissPopover() {
		selectedBlob = null;
	}

	function navigateToBlob() {
		if (!selectedBlob) return;

		if (selectedBlob.type === 'tag') {
			goto(`/tag/${selectedBlob.tagName}`);
		} else {
			goto(`/${selectedBlob.type}s/${selectedBlob.slug}`);
		}
	}

	// Check for mobile + reduced motion on mount
	import { onMount } from 'svelte';
	onMount(() => {
		const checkMobile = () => {
			isMobile = window.innerWidth < 768;
		};
		checkMobile();
		window.addEventListener('resize', checkMobile);

		const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
		prefersReducedMotion = motionQuery.matches;
		const onMotionChange = (e) => {
			prefersReducedMotion = e.matches;
			if (e.matches) {
				driveFrequency = 0;
				driveExcitement = 0;
			}
		};
		motionQuery.addEventListener('change', onMotionChange);

		return () => {
			window.removeEventListener('resize', checkMobile);
			motionQuery.removeEventListener('change', onMotionChange);
		};
	});
</script>

<div class="home-fullscreen">
	<PhysicsPlayground
		{highlightType}
		{springLength}
		{springStiffness}
		driveFrequency={prefersReducedMotion ? 0 : driveFrequency}
		driveExcitement={prefersReducedMotion ? 0 : driveExcitement}
		reducedMotion={prefersReducedMotion}
		{isMobile}
		onSwirlReady={handleSwirlReady}
		onShakeReady={handleShakeReady}
		onBlobClick={handleBlobClick}
		onCenterDestroyed={handleCenterDestroyed}
		onResetReady={handleResetReady}
		onScoreChange={handleScoreChange}
		onShipEscaped={handleShipEscaped}
	/>

	<!-- Cutscene overlay -->
	{#if cutsceneActive}
		<Cutscene
			score={cutsceneScore}
			shipHealth={cutsceneHealth}
			onComplete={handleCutsceneComplete}
		/>
	{/if}

	<!-- Center circle with logo and greeting -->
	<a href="/about" class="center-identity" style:opacity={centerHidden || cutsceneActive ? 0 : 1} style:pointer-events={centerHidden || cutsceneActive ? 'none' : 'auto'} style:transition="opacity 0.5s">
		<div class="center-badge">
			<img src={logoLarge} alt="xram.net" class="center-logo" />
			<span class="center-greeting">Hi, I'm Andrew</span>
		</div>
	</a>

	<!-- Mobile: Bottom sheet popover -->
	{#if selectedBlob && isMobile}
		<button class="popover-backdrop" onclick={dismissPopover} aria-label="Close"></button>
		<div class="blob-sheet">
			<button class="sheet-close" onclick={dismissPopover}>×</button>
			<h3 class="sheet-title" class:project={selectedBlob.type === 'project'} class:musing={selectedBlob.type === 'musing'} class:tag={selectedBlob.type === 'tag'}>
				{selectedBlob.title}
			</h3>
			{#if selectedBlob.description}
				<p class="sheet-description">{selectedBlob.description}</p>
			{/if}
			<button class="sheet-view-btn" onclick={navigateToBlob}>
				View {selectedBlob.type === 'tag' ? 'Tagged Items' : selectedBlob.type} →
			</button>
		</div>
	{/if}

	<!-- Desktop: Bottom control bar -->
	{#if !isMobile}
		<div class="control-bar" style:opacity={cutsceneActive ? 0 : 1} style:pointer-events={cutsceneActive ? 'none' : 'auto'} style:transition="opacity 0.5s">
			<div class="control-section filters">
				<button
					class="control-btn projects"
					class:active={highlightType === 'project'}
					onclick={() => toggleHighlight('project')}
				>Projects</button>
				<button
					class="control-btn musings"
					class:active={highlightType === 'musing'}
					onclick={() => toggleHighlight('musing')}
				>Musings</button>
				<button
					class="control-btn tags"
					class:active={highlightType === 'tag'}
					onclick={() => toggleHighlight('tag')}
				>Tags</button>
			</div>

			<div class="control-section actions">
				<button
					class="control-btn shake"
					onclick={() => triggerShake?.()}
					disabled={!triggerShake}
				>Shake</button>
				<button
					class="control-btn swirl"
					onclick={() => triggerSwirl?.()}
					disabled={!triggerSwirl}
				>Swirl</button>
				<button
					class="control-btn reset"
					onclick={() => triggerReset?.()}
					disabled={!triggerReset}
				>Reset</button>
			</div>

			{#if score > 0}
				<div class="control-section score">
					<span class="score-display">{score.toLocaleString()}</span>
				</div>
			{/if}

			<div class="control-section sliders">
				<label class="slider-group">
					<span>Spring Length</span>
					<input type="range" min="50" max="800" bind:value={springLength} />
				</label>
				<label class="slider-group">
					<span>Springiness</span>
					<input type="range" min="1" max="60" bind:value={springStiffnessSlider} />
				</label>
				{#if !prefersReducedMotion}
					<label class="slider-group">
						<span>Frequency</span>
						<input type="range" min="0" max="100" bind:value={driveFrequency} />
					</label>
					<label class="slider-group">
						<span>Excitement</span>
						<input type="range" min="0" max="100" bind:value={driveExcitement} />
					</label>
				{/if}
			</div>

			<div class="control-section nav-links">
				<a href="/about">About</a>
				<a href="/projects">Projects</a>
				<a href="/musings">Musings</a>
			</div>

			<div class="control-section credits">
				<span>&copy; {new Date().getFullYear()} Andrew Marx</span>
				<a href="https://github.com/atmarx" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
					<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
						<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
					</svg>
				</a>
			</div>
		</div>
	{/if}

	<!-- Mobile: Drawer toggle + Drawer -->
	{#if isMobile && !cutsceneActive}
		<button class="drawer-toggle" onclick={toggleDrawer} class:open={mobileDrawerOpen}>
			<span class="drawer-icon">{mobileDrawerOpen ? '×' : '☰'}</span>
		</button>

		<div class="mobile-drawer" class:open={mobileDrawerOpen}>
			<div class="drawer-section">
				<span class="drawer-label">Filter</span>
				<div class="drawer-buttons">
					<button
						class="control-btn projects"
						class:active={highlightType === 'project'}
						onclick={() => toggleHighlight('project')}
					>Projects</button>
					<button
						class="control-btn musings"
						class:active={highlightType === 'musing'}
						onclick={() => toggleHighlight('musing')}
					>Musings</button>
					<button
						class="control-btn tags"
						class:active={highlightType === 'tag'}
						onclick={() => toggleHighlight('tag')}
					>Tags</button>
				</div>
			</div>

			<div class="drawer-section">
				<span class="drawer-label">Actions</span>
				<div class="drawer-buttons">
					<button
						class="control-btn shake"
						onclick={() => triggerShake?.()}
						disabled={!triggerShake}
					>Shake</button>
					<button
						class="control-btn swirl"
						onclick={() => triggerSwirl?.()}
						disabled={!triggerSwirl}
					>Swirl</button>
					<button
						class="control-btn reset"
						onclick={() => triggerReset?.()}
						disabled={!triggerReset}
					>Reset</button>
				</div>
				{#if score > 0}
					<div class="drawer-score">Score: {score.toLocaleString()}</div>
				{/if}
			</div>

			<div class="drawer-section">
				<span class="drawer-label">Physics</span>
				<label class="slider-group">
					<span>Spring Length</span>
					<input type="range" min="50" max="800" bind:value={springLength} />
				</label>
				<label class="slider-group">
					<span>Springiness</span>
					<input type="range" min="1" max="60" bind:value={springStiffnessSlider} />
				</label>
				{#if !prefersReducedMotion}
					<label class="slider-group">
						<span>Frequency</span>
						<input type="range" min="0" max="100" bind:value={driveFrequency} />
					</label>
					<label class="slider-group">
						<span>Excitement</span>
						<input type="range" min="0" max="100" bind:value={driveExcitement} />
					</label>
				{/if}
			</div>

			<div class="drawer-section nav">
				<a href="/about">About Me</a>
				<a href="/projects">Projects</a>
				<a href="/musings">Musings</a>
			</div>

			<div class="drawer-section credits">
				<span>&copy; {new Date().getFullYear()} Andrew Marx</span>
				<a href="https://github.com/atmarx" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
					<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
						<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
					</svg>
				</a>
			</div>
		</div>
	{/if}
</div>

<style>
	.home-fullscreen {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		overflow: hidden;
	}

	/* Center identity badge */
	.center-identity {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		text-decoration: none;
		color: var(--color-text);
		z-index: 10;
		pointer-events: auto;
	}

	.center-badge {
		display: flex;
		flex-direction: column;
		align-items: center;
		background: rgba(0, 0, 0, 0.85);
		border-radius: 20px;
		padding: 1.5rem 2rem;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
		transition: transform 0.3s, box-shadow 0.3s;
	}

	.center-identity:hover .center-badge {
		transform: scale(1.03);
		box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
	}

	.center-logo {
		width: 100px;
		height: 100px;
		border-radius: 50%;
	}

	.center-greeting {
		margin-top: 0.75rem;
		font-size: 1.25rem;
		font-weight: 600;
		color: #fff;
	}

	/* Mobile: smaller center */
	@media (max-width: 767px) {
		.center-badge {
			padding: 1rem 1.5rem;
			border-radius: 16px;
		}
		.center-logo {
			width: 70px;
			height: 70px;
		}
		.center-greeting {
			font-size: 1rem;
		}
	}

	/* Desktop control bar */
	.control-bar {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 1rem 2rem;
		padding: 1rem 2rem;
		background: linear-gradient(transparent, rgba(26, 26, 46, 0.95));
		z-index: 100;
	}

	/* Medium screens: two-row layout */
	@media (max-width: 1100px) and (min-width: 768px) {
		.control-bar {
			display: grid;
			grid-template-columns: auto auto auto auto;
			grid-template-rows: auto auto;
			gap: 0.75rem 1.5rem;
			padding: 0.75rem 1.5rem 1rem;
			justify-content: center;
			justify-items: center;
		}

		.control-section.filters { grid-row: 1; }
		.control-section.actions { grid-row: 1; }
		.control-section.score { grid-row: 1; }
		.control-section.sliders { grid-row: 1; }
		.control-section.nav-links {
			grid-row: 2;
			grid-column: 1 / 3;
			margin-left: 0;
		}
		.control-section.credits {
			grid-row: 2;
			grid-column: 3 / 5;
		}
	}

	.control-section {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.control-section.sliders {
		gap: 1.5rem;
	}

	.control-section.nav-links {
		margin-left: auto;
		gap: 1rem;
	}

	.control-section.nav-links a {
		color: var(--color-text-muted);
		text-decoration: none;
		font-size: 0.9rem;
		transition: color 0.2s;
	}

	.control-section.nav-links a:hover {
		color: var(--color-text);
	}

	.control-section.credits {
		gap: 0.5rem;
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	.control-section.credits a {
		color: var(--color-text-muted);
		display: flex;
		align-items: center;
		transition: color 0.2s;
	}

	.control-section.credits a:hover {
		color: var(--color-text);
	}

	.control-btn {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: var(--color-text);
		padding: 0.5rem 1rem;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.9rem;
		transition: all 0.2s;
	}

	.control-btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.2);
	}

	.control-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.control-btn.projects {
		background: rgba(100, 200, 150, 0.2);
		border-color: rgba(100, 200, 150, 0.4);
		color: rgb(100, 200, 150);
	}

	.control-btn.projects:hover {
		background: rgba(100, 200, 150, 0.3);
	}

	.control-btn.projects.active {
		background: rgba(100, 200, 150, 0.4);
		border-color: rgba(100, 200, 150, 0.8);
		box-shadow: 0 0 12px rgba(100, 200, 150, 0.5);
	}

	.control-btn.musings {
		background: rgba(107, 159, 255, 0.2);
		border-color: rgba(107, 159, 255, 0.4);
		color: rgb(107, 159, 255);
	}

	.control-btn.musings:hover {
		background: rgba(107, 159, 255, 0.3);
	}

	.control-btn.musings.active {
		background: rgba(107, 159, 255, 0.4);
		border-color: rgba(107, 159, 255, 0.8);
		box-shadow: 0 0 12px rgba(107, 159, 255, 0.5);
	}

	.control-btn.tags {
		background: rgba(100, 100, 100, 0.2);
		border-color: rgba(100, 100, 100, 0.4);
		color: rgb(180, 180, 180);
	}

	.control-btn.tags:hover {
		background: rgba(100, 100, 100, 0.3);
	}

	.control-btn.tags.active {
		background: rgba(100, 100, 100, 0.4);
		border-color: rgba(180, 180, 180, 0.8);
		box-shadow: 0 0 12px rgba(180, 180, 180, 0.4);
	}

	.control-btn.reset {
		background: rgba(255, 120, 80, 0.2);
		border-color: rgba(255, 120, 80, 0.4);
		color: rgb(255, 160, 120);
	}

	.control-btn.reset:hover:not(:disabled) {
		background: rgba(255, 120, 80, 0.3);
	}

	.score-display {
		font-size: 0.9rem;
		font-weight: 600;
		color: rgb(255, 215, 80);
		font-variant-numeric: tabular-nums;
	}

	.drawer-score {
		margin-top: 0.5rem;
		font-size: 0.9rem;
		font-weight: 600;
		color: rgb(255, 215, 80);
		font-variant-numeric: tabular-nums;
	}

	/* Sliders */
	.slider-group {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	.slider-group input[type="range"] {
		width: 100px;
		height: 4px;
		-webkit-appearance: none;
		background: rgba(255, 255, 255, 0.2);
		border-radius: 2px;
		cursor: pointer;
	}

	.slider-group input[type="range"]::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 14px;
		height: 14px;
		background: var(--color-accent);
		border-radius: 50%;
		cursor: pointer;
	}

	/* Mobile drawer toggle */
	.drawer-toggle {
		position: absolute;
		bottom: 1rem;
		right: 1rem;
		width: 50px;
		height: 50px;
		border-radius: 50%;
		background: rgba(26, 26, 46, 0.9);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: var(--color-text);
		font-size: 1.5rem;
		cursor: pointer;
		z-index: 200;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.2s;
	}

	.drawer-toggle.open {
		transform: rotate(90deg);
	}

	/* Mobile drawer */
	.mobile-drawer {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		background: rgba(26, 26, 46, 0.98);
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		padding: 1.5rem;
		transform: translateY(100%);
		transition: transform 0.3s ease-out;
		z-index: 150;
		max-height: 70vh;
		overflow-y: auto;
	}

	.mobile-drawer.open {
		transform: translateY(0);
	}

	.drawer-section {
		margin-bottom: 1.25rem;
	}

	.drawer-section:last-child {
		margin-bottom: 0;
	}

	.drawer-label {
		display: block;
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-text-muted);
		margin-bottom: 0.5rem;
	}

	.drawer-buttons {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.drawer-section.nav {
		display: flex;
		gap: 1rem;
		padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.drawer-section.nav a {
		color: var(--color-text-muted);
		text-decoration: none;
		font-size: 0.9rem;
	}

	.drawer-section.nav a:hover {
		color: var(--color-text);
	}

	.drawer-section.credits {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding-top: 0.75rem;
		font-size: 0.7rem;
		color: var(--color-text-muted);
	}

	.drawer-section.credits a {
		color: var(--color-text-muted);
		display: flex;
		align-items: center;
	}

	/* Mobile slider adjustments */
	@media (max-width: 767px) {
		.slider-group {
			width: 100%;
		}
		.slider-group input[type="range"] {
			width: 100%;
		}
	}

	/* Popover backdrop */
	.popover-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: transparent;
		border: none;
		cursor: default;
		z-index: 300;
	}

	/* Desktop floating card */
	.floating-card {
		position: fixed;
		width: 280px;
		background: rgba(26, 26, 46, 0.98);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 12px;
		padding: 1rem;
		z-index: 350;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
		animation: cardFadeIn 0.2s ease-out;
	}

	@keyframes cardFadeIn {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.card-close {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		background: none;
		border: none;
		color: var(--color-text-muted);
		font-size: 1.25rem;
		cursor: pointer;
		padding: 0.25rem;
		line-height: 1;
	}

	.card-close:hover {
		color: var(--color-text);
	}

	.card-title {
		margin: 0 0 0.5rem 0;
		font-size: 1rem;
		font-weight: 600;
		padding-right: 1.5rem;
	}

	.card-title.project {
		color: rgba(100, 200, 150, 1);
	}

	.card-title.musing {
		color: rgba(107, 159, 255, 1);
	}

	.card-title.tag {
		color: rgba(180, 180, 180, 1);
	}

	.card-description {
		margin: 0 0 1rem 0;
		font-size: 0.85rem;
		color: var(--color-text-muted);
		line-height: 1.4;
	}

	.card-view-btn {
		width: 100%;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: var(--color-text);
		padding: 0.6rem 1rem;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.9rem;
		transition: all 0.2s;
	}

	.card-view-btn:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	/* Mobile bottom sheet */
	.blob-sheet {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background: rgba(26, 26, 46, 0.98);
		border-top: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 16px 16px 0 0;
		padding: 1.5rem;
		z-index: 350;
		animation: sheetSlideUp 0.3s ease-out;
	}

	@keyframes sheetSlideUp {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}

	.sheet-close {
		position: absolute;
		top: 1rem;
		right: 1rem;
		background: none;
		border: none;
		color: var(--color-text-muted);
		font-size: 1.5rem;
		cursor: pointer;
		padding: 0.25rem;
		line-height: 1;
	}

	.sheet-title {
		margin: 0 0 0.75rem 0;
		font-size: 1.25rem;
		font-weight: 600;
		padding-right: 2rem;
	}

	.sheet-title.project {
		color: rgba(100, 200, 150, 1);
	}

	.sheet-title.musing {
		color: rgba(107, 159, 255, 1);
	}

	.sheet-title.tag {
		color: rgba(180, 180, 180, 1);
	}

	.sheet-description {
		margin: 0 0 1.25rem 0;
		font-size: 0.95rem;
		color: var(--color-text-muted);
		line-height: 1.5;
	}

	.sheet-view-btn {
		width: 100%;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: var(--color-text);
		padding: 0.9rem 1rem;
		border-radius: 8px;
		cursor: pointer;
		font-size: 1rem;
		transition: all 0.2s;
	}

	.sheet-view-btn:hover {
		background: rgba(255, 255, 255, 0.2);
	}
</style>
