<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { PageData } from './$types';
	import ShipsLog from '$lib/components/ShipsLog.svelte';

	let { data }: { data: PageData } = $props();

	let gameContainer: HTMLDivElement;
	let game: any = null;
	let shipsLog: ShipsLog;

	// Boss overlay state
	let bossIntroVisible = $state(false);
	let bossIntroName = $state('');
	let bossIntroText = $state('');
	let bossMessageVisible = $state(false);
	let bossMessageText = $state('');
	let bossMessageColor = $state('#ff8844');
	let bossGiveVisible = $state(false);
	let bossGiveItem = $state('');
	let bossGiveName = $state('');

	// Boss key overlay state
	let bossKeyVisible = $state(false);
	let bossKeyEmoji = $state('');
	let bossKeyName = $state('');

	let logVisible = $state(false);
	let eventBusRef: any = null;

	onMount(async () => {
		const PhaserMod = await import('phaser');
		const Phaser = (PhaserMod as any).default ?? PhaserMod;

		const { BootScene } = await import('$lib/game/phaser/scenes/BootScene');
		const { GameScene } = await import('$lib/game/phaser/scenes/GameScene');
		const { HUDScene } = await import('$lib/game/phaser/scenes/HUDScene');
		const { createGameConfig } = await import('$lib/game/phaser/config');
		const { EventBus } = await import('$lib/game/phaser/EventBus');

		eventBusRef = EventBus;

		// Ship's Log: full content discovery
		EventBus.on('content-discovered', (data: { slug: string; type: string; title: string }) => {
			if (data.slug && shipsLog) {
				shipsLog.addDiscovery(data.type, data.slug, data.title);
			}
		});

		EventBus.on('boss-intro', (data: any) => {
			if (!data) {
				bossIntroVisible = false;
				return;
			}
			bossIntroName = data.name;
			bossIntroText = data.text;
			bossIntroVisible = true;
			setTimeout(() => {
				bossIntroVisible = false;
			}, 3000);
		});

		EventBus.on('boss-defeated', (data: any) => {
			bossMessageText = data.quote;
			bossMessageColor = '#ff4444';
			bossMessageVisible = true;
			setTimeout(() => {
				bossMessageVisible = false;
			}, 4000);
		});

		EventBus.on('boss-pacified', (data: any) => {
			bossMessageText = data.quote;
			bossMessageColor = '#44ffaa';
			bossMessageVisible = true;
			setTimeout(() => {
				bossMessageVisible = false;
			}, 4000);
		});

		EventBus.on('boss-give-prompt', (data: any) => {
			if (data.show) {
				bossGiveItem = data.itemName;
				bossGiveName = data.bossName;
				bossGiveVisible = true;
			} else {
				bossGiveVisible = false;
			}
		});

		EventBus.on('boss-key-earned', (key: { emoji: string; name: string }) => {
			bossKeyEmoji = key.emoji;
			bossKeyName = key.name;
			bossKeyVisible = true;
			setTimeout(() => {
				bossKeyVisible = false;
			}, 3000);
		});

		const config = createGameConfig(gameContainer, [BootScene, GameScene, HUDScene]);
		game = new Phaser.Game(config);

		game.registry.set('initialScore', data.score);
		game.registry.set('initialHealth', data.health);
	});

	onDestroy(() => {
		eventBusRef?.off('content-discovered');
		eventBusRef?.off('boss-intro');
		eventBusRef?.off('boss-defeated');
		eventBusRef?.off('boss-pacified');
		eventBusRef?.off('boss-give-prompt');
		eventBusRef?.off('boss-key-earned');
		game?.destroy(true);
		game = null;
	});
</script>

<svelte:head>
	<title>The Rift | xram.net</title>
</svelte:head>

<div class="game-fullscreen" class:log-open={logVisible} bind:this={gameContainer}>
	{#if bossIntroVisible}
		<div class="boss-intro-overlay">
			<div class="boss-intro-name">{bossIntroName}</div>
			<div class="boss-intro-text">{bossIntroText}</div>
		</div>
	{/if}

	{#if bossMessageVisible}
		<div class="boss-message-overlay" style="--msg-color: {bossMessageColor}">
			<div class="boss-message-text">{bossMessageText}</div>
		</div>
	{/if}

	{#if bossGiveVisible}
		<div class="boss-give-overlay">
			<div class="boss-give-prompt">Give {bossGiveItem} to {bossGiveName}?</div>
			<div class="boss-give-key">[SPACE]</div>
		</div>
	{/if}

	{#if bossKeyVisible}
		<div class="boss-key-overlay">
			<div class="boss-key-emoji">{bossKeyEmoji}</div>
			<div class="boss-key-name">{bossKeyName}</div>
			<div class="boss-key-label">KEY ACQUIRED</div>
		</div>
	{/if}
</div>

<ShipsLog bind:this={shipsLog} onVisibilityChange={(v) => logVisible = v} />

<style>
	.game-fullscreen {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		overflow: hidden;
		background: #000;
		transition: left 0.5s ease-out;
	}

	.game-fullscreen.log-open {
		left: 340px;
	}

	/* Boss Intro Overlay */
	.boss-intro-overlay {
		position: absolute;
		top: 25%;
		left: 50%;
		transform: translateX(-50%);
		text-align: center;
		z-index: 100;
		pointer-events: none;
		animation: boss-intro-in 0.5s ease-out;
	}

	@keyframes boss-intro-in {
		from {
			opacity: 0;
			transform: translateX(-50%) scale(1.5);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) scale(1);
		}
	}

	.boss-intro-name {
		font-size: 32px;
		color: #ff8844;
		font-family: var(--font-pixel, monospace);
		font-weight: bold;
		text-shadow: 0 0 20px rgba(255, 136, 68, 0.6), 0 0 40px rgba(255, 136, 68, 0.3);
		letter-spacing: 4px;
	}

	.boss-intro-text {
		font-size: 14px;
		color: #ffcc88;
		font-family: monospace;
		margin-top: 8px;
		white-space: pre-line;
		text-shadow: 0 0 10px rgba(255, 204, 136, 0.4);
	}

	/* Boss Message (defeat/pacify quotes) */
	.boss-message-overlay {
		position: absolute;
		top: 35%;
		left: 50%;
		transform: translateX(-50%);
		text-align: center;
		z-index: 100;
		pointer-events: none;
		animation: boss-msg-in 0.4s ease-out;
	}

	@keyframes boss-msg-in {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
	}

	.boss-message-text {
		font-size: 18px;
		color: var(--msg-color, #ff8844);
		font-family: monospace;
		font-style: italic;
		white-space: pre-line;
		text-shadow: 0 0 15px currentColor;
	}

	/* Give Item Prompt */
	.boss-give-overlay {
		position: absolute;
		bottom: 120px;
		left: 50%;
		transform: translateX(-50%);
		text-align: center;
		z-index: 100;
		pointer-events: none;
		animation: give-pulse 1s ease-in-out infinite alternate;
	}

	@keyframes give-pulse {
		from {
			opacity: 0.8;
		}
		to {
			opacity: 1;
		}
	}

	.boss-give-prompt {
		font-size: 16px;
		color: #ffcc44;
		font-family: monospace;
		font-weight: bold;
		text-shadow: 0 0 10px rgba(255, 204, 68, 0.5);
	}

	.boss-give-key {
		font-size: 14px;
		color: #aaccee;
		font-family: monospace;
		margin-top: 4px;
		padding: 2px 12px;
		border: 1px solid rgba(170, 204, 238, 0.4);
		border-radius: 4px;
		display: inline-block;
	}

	/* Boss Key Earned */
	.boss-key-overlay {
		position: absolute;
		top: 40%;
		left: 50%;
		transform: translateX(-50%);
		text-align: center;
		z-index: 100;
		pointer-events: none;
		animation: key-earned 0.6s ease-out;
	}

	@keyframes key-earned {
		from {
			opacity: 0;
			transform: translateX(-50%) scale(2);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) scale(1);
		}
	}

	.boss-key-emoji {
		font-size: 48px;
		filter: drop-shadow(0 0 20px rgba(255, 204, 68, 0.6));
	}

	.boss-key-name {
		font-size: 14px;
		color: #ffcc44;
		font-family: var(--font-pixel, monospace);
		margin-top: 8px;
		text-shadow: 0 0 10px rgba(255, 204, 68, 0.5);
	}

	.boss-key-label {
		font-size: 10px;
		color: #aaccee;
		font-family: var(--font-pixel, monospace);
		letter-spacing: 3px;
		margin-top: 4px;
	}
</style>
