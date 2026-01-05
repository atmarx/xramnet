<script lang="ts">
</script>

<div class="home">
	<h1>Hi, I'm xram</h1>
	<p class="tagline">Welcome to my corner of the internet.</p>

	<div class="intro">
		<p>
			This is where I share projects I've been working on and write about things I find interesting.
		</p>
	</div>

	<div class="quick-links">
		<a href="/projects" class="link-card">
			<h2>Projects</h2>
			<p>Things I've built</p>
		</a>
		<a href="/about" class="link-card">
			<h2>About</h2>
			<p>More about me</p>
		</a>
	</div>
</div>

<style>
	.home {
		padding-top: 4rem;
	}

	h1 {
		font-size: 2.5rem;
		margin-bottom: 0.5rem;
	}

	.tagline {
		color: var(--color-text-muted);
		font-size: 1.2rem;
		margin-bottom: 2rem;
	}

	.intro {
		margin-bottom: 3rem;
		font-size: 1.1rem;
	}

	.quick-links {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.link-card {
		background: var(--color-bg-secondary);
		padding: 1.5rem;
		border-radius: 8px;
		color: var(--color-text);
		transition: transform 0.2s, background 0.2s;
	}

	.link-card:hover {
		transform: translateY(-2px);
		background: #222;
	}

	.link-card h2 {
		font-size: 1.2rem;
		margin-bottom: 0.5rem;
	}

	.link-card p {
		color: var(--color-text-muted);
		font-size: 0.9rem;
	}
</style>
