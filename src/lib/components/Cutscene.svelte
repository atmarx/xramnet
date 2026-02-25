<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	let {
		score = 0,
		shipHealth = 25,
		onComplete = () => {}
	}: {
		score?: number;
		shipHealth?: number;
		onComplete?: () => void;
	} = $props();

	let canvas: HTMLCanvasElement;
	let animationId: number;
	let startTime = 0;
	let w = 0;
	let h = 0;

	// ─── Timeline (seconds) ──────────────────────────────────────
	const FADE_IN = 0.8;
	const SWAN_ENTER = 0.8;
	const SWAN_EXIT = 3.5;
	const RIFT_START = 2.0;
	const SHIP_ENTER = 4.0;
	const SHIP_ARRIVE = 6.5;
	const FLASH_START = 6.5;
	const FLASH_PEAK = 7.0;
	const TEXT_START = 7.2;
	const TEXT_END = 9.2;
	const COMPLETE_TIME = 9.8;

	// ─── Particles ───────────────────────────────────────────────
	interface Particle {
		x: number; y: number;
		vx: number; vy: number;
		size: number;
		born: number;
		lifespan: number;
		hue: number;
	}
	const particles: Particle[] = [];

	// ─── Stars ───────────────────────────────────────────────────
	interface Star {
		x: number; y: number;
		size: number;
		phase: number;
		speed: number;
	}
	let stars: Star[] = [];

	function generateStars() {
		stars = [];
		for (let i = 0; i < 200; i++) {
			stars.push({
				x: Math.random() * w,
				y: Math.random() * h,
				size: 0.5 + Math.random() * 2,
				phase: Math.random() * Math.PI * 2,
				speed: 1 + Math.random() * 3
			});
		}
	}

	// ─── Swan Path ───────────────────────────────────────────────
	function swanPos(t: number) {
		const p = Math.min(1, (t - SWAN_ENTER) / (SWAN_EXIT - SWAN_ENTER));
		return {
			x: -60 + (w + 120) * p,
			y: h * 0.65 - p * h * 0.4 + Math.sin(p * Math.PI * 2) * 20,
			p
		};
	}

	// ─── Ship Path ───────────────────────────────────────────────
	function shipPos(t: number) {
		const p = Math.min(1, (t - SHIP_ENTER) / (SHIP_ARRIVE - SHIP_ENTER));
		const ease = p * p * (3 - 2 * p); // smoothstep
		return {
			x: w * 0.08 + (w * 0.74) * ease,
			y: h * 0.5 + Math.sin(t * 1.5) * 8,
			p
		};
	}

	// ─── Rift Position ───────────────────────────────────────────
	const riftXFrac = 0.85;

	// ─── Lifecycle ───────────────────────────────────────────────

	onMount(() => {
		w = window.innerWidth;
		h = window.innerHeight;
		canvas.width = w;
		canvas.height = h;
		generateStars();

		startTime = performance.now();
		const ctx = canvas.getContext('2d')!;

		function tick(now: number) {
			const t = (now - startTime) / 1000;
			render(ctx, t);
			if (t < COMPLETE_TIME) {
				animationId = requestAnimationFrame(tick);
			} else {
				onComplete();
			}
		}
		animationId = requestAnimationFrame(tick);

		function handleResize() {
			w = window.innerWidth;
			h = window.innerHeight;
			canvas.width = w;
			canvas.height = h;
			generateStars();
		}
		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
		};
	});

	onDestroy(() => {
		if (animationId) cancelAnimationFrame(animationId);
	});

	// ─── Main Render ─────────────────────────────────────────────

	function render(ctx: CanvasRenderingContext2D, t: number) {
		ctx.fillStyle = '#000';
		ctx.fillRect(0, 0, w, h);

		const fadeIn = Math.min(1, t / FADE_IN);
		ctx.save();
		ctx.globalAlpha = fadeIn;

		drawStars(ctx, t);
		drawBlackHoleRemnant(ctx, t);

		// Swan
		if (t > SWAN_ENTER && t < SWAN_EXIT + 1.5) {
			const st = Math.min(t, SWAN_EXIT);
			const { x, y } = swanPos(st);
			const alpha = t < SWAN_EXIT ? 1 : Math.max(0, 1 - (t - SWAN_EXIT) / 1.5);

			if (alpha > 0) {
				drawSwan(ctx, x, y, 1.3, t * 3, alpha);

				// Spawn trail particles
				if (t < SWAN_EXIT) {
					for (let i = 0; i < 3; i++) {
						particles.push({
							x: x - 15 + (Math.random() - 0.5) * 12,
							y: y + (Math.random() - 0.5) * 12,
							vx: -0.3 + Math.random() * 0.2,
							vy: (Math.random() - 0.5) * 0.4,
							size: 1 + Math.random() * 2.5,
							born: t,
							lifespan: 1.5 + Math.random() * 2,
							hue: 210 + Math.random() * 40 // blue range
						});
					}
				}
			}
		}

		drawParticles(ctx, t);

		if (t > RIFT_START) drawRift(ctx, t);

		// Ship drifting toward rift
		if (t > SHIP_ENTER && t < FLASH_PEAK + 0.5) {
			const { x, y } = shipPos(t);
			const alpha = t > FLASH_START ? Math.max(0, 1 - (t - FLASH_START) * 3) : 1;
			if (alpha > 0) drawShip(ctx, x, y, alpha);
		}

		ctx.restore();

		// Flash (full screen, above everything)
		if (t > FLASH_START && t < TEXT_START) {
			const ramp = Math.min(1, (t - FLASH_START) / (FLASH_PEAK - FLASH_START));
			const decay = t > FLASH_PEAK ? Math.max(0, 1 - (t - FLASH_PEAK) / (TEXT_START - FLASH_PEAK)) : 1;
			const a = ramp * ramp * decay;
			ctx.fillStyle = `rgba(160, 200, 255, ${a * 0.85})`;
			ctx.fillRect(0, 0, w, h);
		}

		// End text
		if (t > TEXT_START && t < TEXT_END + 0.5) {
			const textFadeIn = Math.min(1, (t - TEXT_START) / 0.6);
			const textFadeOut = t > TEXT_END ? Math.max(0, 1 - (t - TEXT_END) / 0.5) : 1;
			const a = textFadeIn * textFadeOut;
			if (a > 0) {
				ctx.save();
				ctx.globalAlpha = a;
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				ctx.font = 'bold 36px system-ui, sans-serif';
				ctx.fillStyle = 'rgba(100, 150, 255, 0.95)';
				ctx.shadowColor = 'rgba(60, 100, 255, 0.8)';
				ctx.shadowBlur = 25;
				ctx.fillText('Entering The Rift...', w / 2, h / 2 - 10);

				ctx.font = '16px system-ui, sans-serif';
				ctx.shadowBlur = 8;
				ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
				ctx.fillText('Coming Soon', w / 2, h / 2 + 30);
				ctx.restore();
			}
		}
	}

	// ─── Stars ───────────────────────────────────────────────────

	function drawStars(ctx: CanvasRenderingContext2D, t: number) {
		for (const s of stars) {
			const twinkle = 0.4 + 0.6 * Math.sin(t * s.speed + s.phase);
			ctx.fillStyle = `rgba(200, 220, 255, ${twinkle * 0.7})`;
			ctx.beginPath();
			ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	// ─── Black Hole Remnant ──────────────────────────────────────

	function drawBlackHoleRemnant(ctx: CanvasRenderingContext2D, t: number) {
		if (t > 5) return;
		const alpha = Math.max(0, 1 - t / 5);
		const bx = w * 0.15 - t * 12;
		const by = h * 0.5;

		const grad = ctx.createRadialGradient(bx, by, 0, bx, by, 80);
		grad.addColorStop(0, `rgba(0, 0, 0, ${alpha})`);
		grad.addColorStop(0.4, `rgba(10, 0, 30, ${alpha * 0.4})`);
		grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
		ctx.fillStyle = grad;
		ctx.beginPath();
		ctx.arc(bx, by, 80, 0, Math.PI * 2);
		ctx.fill();

		ctx.strokeStyle = `rgba(80, 40, 160, ${alpha * 0.3})`;
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.arc(bx, by, 45, t * 2, t * 2 + Math.PI * 1.5);
		ctx.stroke();
	}

	// ─── Swan ────────────────────────────────────────────────────

	function drawSwan(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, wingPhase: number, alpha: number) {
		ctx.save();
		ctx.translate(x, y);
		ctx.scale(scale, scale);
		ctx.globalAlpha *= alpha;

		// Glow
		ctx.shadowColor = 'rgba(200, 220, 255, 0.7)';
		ctx.shadowBlur = 18;

		// Body
		ctx.fillStyle = 'white';
		ctx.beginPath();
		ctx.ellipse(0, 0, 18, 10, -0.1, 0, Math.PI * 2);
		ctx.fill();

		// Neck (graceful S-curve up and right)
		ctx.beginPath();
		ctx.moveTo(12, -6);
		ctx.bezierCurveTo(22, -18, 18, -30, 20, -36);
		ctx.lineWidth = 3.5;
		ctx.strokeStyle = 'white';
		ctx.lineCap = 'round';
		ctx.stroke();

		// Head
		ctx.beginPath();
		ctx.arc(20, -36, 3.5, 0, Math.PI * 2);
		ctx.fillStyle = 'white';
		ctx.fill();

		// Beak
		ctx.shadowBlur = 0;
		ctx.fillStyle = '#e8a040';
		ctx.beginPath();
		ctx.moveTo(24, -36);
		ctx.lineTo(29, -35);
		ctx.lineTo(24, -34);
		ctx.closePath();
		ctx.fill();

		// Wing (animated)
		ctx.shadowColor = 'rgba(200, 220, 255, 0.5)';
		ctx.shadowBlur = 10;
		const wingLift = Math.sin(wingPhase) * 8;
		ctx.fillStyle = 'rgba(235, 240, 255, 0.9)';
		ctx.beginPath();
		ctx.moveTo(-8, -6);
		ctx.bezierCurveTo(-2, -18 - wingLift, 8, -20 - wingLift, 12, -6);
		ctx.fill();

		// Tail feathers
		ctx.shadowBlur = 5;
		ctx.fillStyle = 'white';
		ctx.beginPath();
		ctx.moveTo(-16, -2);
		ctx.lineTo(-26, -10);
		ctx.lineTo(-22, 0);
		ctx.closePath();
		ctx.fill();

		ctx.restore();
	}

	// ─── Particles ───────────────────────────────────────────────

	function drawParticles(ctx: CanvasRenderingContext2D, t: number) {
		const riftX = w * riftXFrac;
		const riftY = h * 0.5;

		for (let i = particles.length - 1; i >= 0; i--) {
			const p = particles[i];
			const age = t - p.born;
			if (age > p.lifespan) {
				particles.splice(i, 1);
				continue;
			}

			// Drift toward rift convergence point
			p.x += p.vx;
			p.y += p.vy;
			p.vx += (riftX - p.x) * 0.0004;
			p.vy += (riftY - p.y) * 0.0004;

			const alpha = 1 - age / p.lifespan;
			ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${alpha * 0.8})`;
			ctx.shadowColor = `hsla(${p.hue}, 80%, 60%, ${alpha * 0.5})`;
			ctx.shadowBlur = 4;
			ctx.beginPath();
			ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.shadowBlur = 0;
	}

	// ─── Rift ────────────────────────────────────────────────────

	function drawRift(ctx: CanvasRenderingContext2D, t: number) {
		const progress = Math.min(1, (t - RIFT_START) / 4);
		const rx = w * riftXFrac;
		const ry = h * 0.5;
		const riftH = 40 + progress * h * 0.7;
		const riftW = 1.5 + progress * 10;

		ctx.save();

		// Broad glow
		const glow = ctx.createRadialGradient(rx, ry, 0, rx, ry, riftH * 0.4);
		glow.addColorStop(0, `rgba(40, 80, 220, ${0.2 * progress})`);
		glow.addColorStop(1, 'rgba(40, 80, 220, 0)');
		ctx.fillStyle = glow;
		ctx.beginPath();
		ctx.arc(rx, ry, riftH * 0.4, 0, Math.PI * 2);
		ctx.fill();

		// Core crack — jagged vertical line
		ctx.shadowColor = `rgba(100, 150, 255, ${0.8 * progress})`;
		ctx.shadowBlur = 15 + progress * 30;
		ctx.strokeStyle = `rgba(180, 210, 255, ${0.9 * progress})`;
		ctx.lineWidth = riftW;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';

		const segs = 14;
		ctx.beginPath();
		for (let i = 0; i <= segs; i++) {
			const sy = ry - riftH / 2 + (riftH * i / segs);
			const jitter = (Math.sin(i * 3.7 + t * 2) * 3 + Math.sin(i * 7.1 + t * 3) * 2) * progress;
			if (i === 0) ctx.moveTo(rx + jitter, sy);
			else ctx.lineTo(rx + jitter, sy);
		}
		ctx.stroke();

		// Inner bright core
		ctx.shadowBlur = 8;
		ctx.strokeStyle = `rgba(220, 240, 255, ${progress})`;
		ctx.lineWidth = Math.max(1, riftW * 0.3);
		ctx.beginPath();
		for (let i = 0; i <= segs; i++) {
			const sy = ry - riftH / 2 + (riftH * i / segs);
			const jitter = (Math.sin(i * 3.7 + t * 2) * 3 + Math.sin(i * 7.1 + t * 3) * 2) * progress;
			if (i === 0) ctx.moveTo(rx + jitter, sy);
			else ctx.lineTo(rx + jitter, sy);
		}
		ctx.stroke();

		ctx.restore();
	}

	// ─── Ship ────────────────────────────────────────────────────

	function drawShip(ctx: CanvasRenderingContext2D, x: number, y: number, alpha: number) {
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(-Math.PI / 2); // Point right
		ctx.globalAlpha *= alpha;

		// Body
		ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
		ctx.beginPath();
		ctx.moveTo(0, -14);
		ctx.lineTo(-8, 10);
		ctx.lineTo(0, 6);
		ctx.lineTo(8, 10);
		ctx.closePath();
		ctx.fill();

		// Engine glow
		ctx.shadowColor = 'rgba(255, 150, 50, 0.6)';
		ctx.shadowBlur = 8;
		const flicker = 0.7 + Math.random() * 0.6;
		ctx.fillStyle = 'rgba(255, 180, 50, 0.8)';
		ctx.beginPath();
		ctx.moveTo(-4, 10);
		ctx.lineTo(0, 10 + 8 * flicker);
		ctx.lineTo(4, 10);
		ctx.closePath();
		ctx.fill();

		ctx.restore();
	}
</script>

<canvas bind:this={canvas} class="cutscene-canvas"></canvas>

<style>
	.cutscene-canvas {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		z-index: 1000;
	}
</style>
