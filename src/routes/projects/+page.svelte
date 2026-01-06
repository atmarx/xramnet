<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Projects | xram.net</title>
</svelte:head>

<div class="projects-page">
	<h1>Projects</h1>
	<p class="subtitle">Things I've built and worked on.</p>

	{#if data.projects.length === 0}
		<p class="empty">Projects coming soon.</p>
	{:else}
		<div class="projects-grid">
			{#each data.projects as project}
				<a href="/projects/{project.slug}" class="project-card">
					<h2>{project.title}</h2>
					<p>{project.description}</p>
					<div class="tags">
						{#each project.tags as tag}
							<span class="tag">{tag}</span>
						{/each}
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
