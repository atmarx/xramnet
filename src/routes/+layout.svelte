<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>xram.net</title>
	<meta name="description" content="Personal portfolio and projects" />
</svelte:head>

<div class="site">
	<nav>
		<a href="/" class="site-name">xram.net</a>
		<div class="nav-links">
			<a href="/about">About</a>
			<a href="/projects">Projects</a>
		</div>
	</nav>

	<main>
		{@render children()}
	</main>

	<footer>
		<p>&copy; {new Date().getFullYear()} xram.net</p>
	</footer>
</div>

<style>
	.site {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	nav {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem 2rem;
		max-width: var(--max-width);
		width: 100%;
		margin: 0 auto;
	}

	.site-name {
		font-weight: 600;
		font-size: 1.1rem;
		color: var(--color-text);
	}

	.site-name:hover {
		color: var(--color-accent);
	}

	.nav-links {
		display: flex;
		gap: 1.5rem;
	}

	.nav-links a {
		color: var(--color-text-muted);
	}

	.nav-links a:hover {
		color: var(--color-accent);
	}

	main {
		flex: 1;
		max-width: var(--max-width);
		width: 100%;
		margin: 0 auto;
		padding: 2rem;
	}

	footer {
		padding: 2rem;
		text-align: center;
		color: var(--color-text-muted);
		font-size: 0.9rem;
	}
</style>
