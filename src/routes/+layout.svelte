<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import logoSmall from '$lib/assets/x-200.png';
	import logoLarge from '$lib/assets/x-300.png';

	let { children } = $props();

	const isHome = $derived($page.url.pathname === '/');
	const isSubpage = $derived(!isHome);
</script>

<svelte:head>
	<title>xram.net</title>
	<meta name="description" content="Personal portfolio and projects" />
</svelte:head>

<div class="site">
	<header>
		<nav>
			<a href="/" class="site-name" class:has-logo={isSubpage} class:has-logo-large={isHome}>
				{#if isHome}
					<img src={logoLarge} alt="xram.net" class="site-logo site-logo-large" />
				{:else}
					<img src={logoSmall} alt="xram.net" class="site-logo" />
				{/if}
				xram.net
			</a>
			<div class="nav-links">
				<a href="/about">About</a>
				<a href="/projects">Projects</a>
				<a href="/musings">Musings</a>
			</div>
		</nav>
	</header>

	<main>
		{@render children()}
	</main>

	<footer>
		<p>&copy; {new Date().getFullYear()} xram.net</p>
	</footer>
</div>
