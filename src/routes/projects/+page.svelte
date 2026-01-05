<script lang="ts">
	interface Project {
		title: string;
		description: string;
		tags: string[];
		url?: string;
	}

	const projects: Project[] = [
		// Add your projects here
	];
</script>

<svelte:head>
	<title>Projects | xram.net</title>
</svelte:head>

<div class="projects-page">
	<h1>Projects</h1>
	<p class="subtitle">Things I've built and worked on.</p>

	{#if projects.length === 0}
		<p class="empty">Projects coming soon.</p>
	{:else}
		<div class="projects-grid">
			{#each projects as project}
				<div class="project-card">
					<h2>{project.title}</h2>
					<p>{project.description}</p>
					<div class="tags">
						{#each project.tags as tag}
							<span class="tag">{tag}</span>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.projects-page {
		padding-top: 2rem;
	}

	h1 {
		font-size: 2rem;
		margin-bottom: 0.5rem;
	}

	.subtitle {
		color: var(--color-text-muted);
		margin-bottom: 2rem;
	}

	.projects-grid {
		display: grid;
		gap: 1.5rem;
	}

	.project-card {
		background: var(--color-bg-secondary);
		padding: 1.5rem;
		border-radius: 8px;
		color: var(--color-text);
		transition: transform 0.2s, background 0.2s;
		display: block;
	}

	.project-card:hover {
		transform: translateY(-2px);
		background: #222;
	}

	.project-card h2 {
		font-size: 1.2rem;
		margin-bottom: 0.5rem;
	}

	.project-card p {
		color: var(--color-text-muted);
		margin-bottom: 1rem;
		font-size: 0.95rem;
	}

	.tags {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.tag {
		background: var(--color-bg);
		color: var(--color-accent);
		padding: 0.2rem 0.6rem;
		border-radius: 4px;
		font-size: 0.8rem;
		font-family: var(--font-mono);
	}

	.empty {
		color: var(--color-text-muted);
		font-style: italic;
	}
</style>
