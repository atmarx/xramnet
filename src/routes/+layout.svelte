<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import logoSmall from '$lib/assets/x-200.png';
	import logoLarge from '$lib/assets/x-300.png';

	let { children } = $props();

	const isHome = $derived($page.url.pathname === '/');
	const isSubpage = $derived(!isHome);

	onMount(() => {
		// Process external links to open in new tabs
		function processExternalLinks() {
			const links = document.querySelectorAll('a[href]');
			const currentHost = window.location.host;

			links.forEach((link) => {
				const href = link.getAttribute('href');
				if (!href) return;

				// Check if it's an external link
				try {
					const url = new URL(href, window.location.origin);
					if (url.host !== currentHost) {
						link.setAttribute('target', '_blank');
						link.setAttribute('rel', 'noopener noreferrer nofollow');
					}
				} catch {
					// Invalid URL, skip
				}
			});
		}

		// Process on initial load
		processExternalLinks();

		// Re-process after navigation (SvelteKit client-side routing)
		const observer = new MutationObserver(processExternalLinks);
		observer.observe(document.body, { childList: true, subtree: true });

		return () => observer.disconnect();
	});
</script>

<svelte:head>
	<title>xram.net</title>
	<meta name="description" content="Personal portfolio and projects" />
	<link rel="icon" href="/favicon.ico" />
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
				<span class="site-name-text">xram.net</span>
			</a>
			<div class="nav-links">
				<a href="/about">About Me</a>
				<a href="/projects">Projects</a>
				<a href="/musings">Musings</a>
			</div>
		</nav>
	</header>

	<main>
		{@render children()}
	</main>

	<footer>
		<p>&copy; {new Date().getFullYear()} Andrew Marx | <a href="https://github.com/atmarx/">github</a></p>
	</footer>
</div>
