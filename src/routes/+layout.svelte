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
			<a href="/musings">Musings</a>
		</div>
	</nav>

	<main>
		{@render children()}
	</main>

	<footer>
		<p>&copy; {new Date().getFullYear()} xram.net</p>
	</footer>
</div>
