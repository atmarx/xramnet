<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { loadAllContent } from '$lib/content/loader';
	import type { ContentItem } from '$lib/content/types';
	import { goto } from '$app/navigation';

	// Props
	let { highlightType = null, onSwirlReady = (_fn: () => void) => {}, onShakeReady = (_fn: () => void) => {} }: {
		highlightType: 'musing' | 'project' | 'tag' | null,
		onSwirlReady?: (fn: () => void) => void,
		onShakeReady?: (fn: () => void) => void
	} = $props();

	// Matter.js types (loaded dynamically)
	type MatterType = typeof import('matter-js');
	let Matter: MatterType;

	// Config - tweak these!
	const CONFIG = {
		TAG_MIN_USE: 1,
		POST_CORNER_RADIUS: 12,
		TAG_RADIUS: 20,
		CONSTRAINT_STIFFNESS: 0.001,
		CONSTRAINT_LENGTH: 250,
		FRICTION_AIR: 0.015,       // Lower = less drag = more drift
		RESTITUTION: 0.6,          // Bounciness
		INITIAL_VELOCITY_MAX: 2,
		BROWNIAN_FORCE: 0.0003,    // Random force applied each tick
		COLORS: {
			musings: 'rgba(107, 159, 255, 0.7)',    // Blue (accent)
			projects: 'rgba(100, 200, 150, 0.7)',   // Green-teal
			tags: 'rgba(136, 136, 136, 0.5)',       // Muted grey
			constraint: 'rgba(136, 136, 136, 0.15)',
			hover: 'rgba(139, 180, 255, 0.9)',
		}
	};

	interface PostBody extends Matter.Body {
		postData?: {
			type: 'musing' | 'project';
			item: ContentItem;
		};
		tagData?: {
			name: string;
			uses: number;
		};
	}

	let canvas: HTMLCanvasElement;
	let container: HTMLDivElement;
	let engine: Matter.Engine;
	let render: Matter.Render;
	let runner: Matter.Runner;
	let mouse: Matter.Mouse;
	let mouseConstraint: Matter.MouseConstraint;
	let hoveredBody: PostBody | null = null;
	let mouseDownPos: { x: number; y: number } | null = null;
	const DRAG_THRESHOLD = 5; // pixels - if mouse moves more than this, it's a drag
	let width = 800;
	let height = 600;
	let allBodies: PostBody[] = [];
	let time = 0;
	let tornadoActive = false;
	let tornadoEndTime = 0;

	// Load content
	const musings = loadAllContent('musings');
	const projects = loadAllContent('projects');
	const allPosts = [
		...musings.map(item => ({ type: 'musing' as const, item })),
		...projects.map(item => ({ type: 'project' as const, item }))
	];

	// Build tag usage map
	const tagUsage = new Map<string, { count: number; posts: typeof allPosts }>();
	for (const post of allPosts) {
		for (const tag of post.item.tags) {
			const normalized = tag.toLowerCase();
			if (!tagUsage.has(normalized)) {
				tagUsage.set(normalized, { count: 0, posts: [] });
			}
			const entry = tagUsage.get(normalized)!;
			entry.count++;
			entry.posts.push(post);
		}
	}

	// Filter tags by minimum usage
	const filteredTags = Array.from(tagUsage.entries())
		.filter(([_, data]) => data.count >= CONFIG.TAG_MIN_USE);

	// Measure text and cache sizes
	const postSizeCache = new Map<string, { width: number; height: number; lines: string[] }>();

	function measurePostSize(item: ContentItem): { width: number; height: number; lines: string[] } {
		const cacheKey = item.slug;
		if (postSizeCache.has(cacheKey)) {
			return postSizeCache.get(cacheKey)!;
		}

		// Create temp canvas for measuring
		const tempCanvas = document.createElement('canvas');
		const ctx = tempCanvas.getContext('2d')!;
		ctx.font = '14px system-ui, sans-serif';

		const title = item.title;
		const titleWidth = ctx.measureText(title).width;
		const padding = 24; // 12px each side
		const minWidth = 80;
		const maxWidth = 180;

		let lines: string[] = [title];
		let finalWidth = Math.min(maxWidth, Math.max(minWidth, titleWidth + padding));

		// If title is too wide, try to break into 2 balanced lines
		if (titleWidth > maxWidth - padding) {
			const words = title.split(' ');
			if (words.length > 1) {
				// Find the best split point for balanced lines
				let bestSplit = 1;
				let bestDiff = Infinity;

				for (let i = 1; i < words.length; i++) {
					const line1 = words.slice(0, i).join(' ');
					const line2 = words.slice(i).join(' ');
					const w1 = ctx.measureText(line1).width;
					const w2 = ctx.measureText(line2).width;
					const diff = Math.abs(w1 - w2);

					if (diff < bestDiff) {
						bestDiff = diff;
						bestSplit = i;
					}
				}

				const line1 = words.slice(0, bestSplit).join(' ');
				const line2 = words.slice(bestSplit).join(' ');
				lines = [line1, line2];

				const maxLineWidth = Math.max(
					ctx.measureText(line1).width,
					ctx.measureText(line2).width
				);
				finalWidth = Math.min(maxWidth, Math.max(minWidth, maxLineWidth + padding));
			}
		}

		// Height depends on number of lines
		const lineHeight = 16;
		const dateHeight = 14;
		const vertPadding = 16;
		const finalHeight = (lines.length * lineHeight) + dateHeight + vertPadding;

		const result = { width: finalWidth, height: finalHeight, lines };
		postSizeCache.set(cacheKey, result);
		return result;
	}

	function getPostSize(item: ContentItem): { width: number; height: number } {
		const { width, height } = measurePostSize(item);
		return { width, height };
	}

	function setupPhysics() {
		// Create engine
		engine = Matter.Engine.create();
		engine.gravity.y = 0; // No gravity - floating in space

		// Create renderer
		render = Matter.Render.create({
			element: container,
			canvas: canvas,
			engine: engine,
			options: {
				width,
				height,
				wireframes: false,
				background: 'transparent',
			}
		});

		allBodies = [];
		const postBodies = new Map<string, PostBody>(); // type:slug -> body
		const tagBodies = new Map<string, PostBody>();  // tag name -> body
		const constraints: Matter.Constraint[] = [];

		// Create tag bodies at random positions
		for (const [tagName, data] of filteredTags) {
			const x = Math.random() * (width - CONFIG.TAG_RADIUS * 4) + CONFIG.TAG_RADIUS * 2;
			const y = Math.random() * (height - CONFIG.TAG_RADIUS * 4) + CONFIG.TAG_RADIUS * 2;

			const body = Matter.Bodies.circle(x, y, CONFIG.TAG_RADIUS, {
				restitution: CONFIG.RESTITUTION,
				frictionAir: CONFIG.FRICTION_AIR,
				render: {
					fillStyle: CONFIG.COLORS.tags,
				}
			}) as PostBody;

			body.tagData = { name: tagName, uses: data.count };

			Matter.Body.setVelocity(body, {
				x: (Math.random() - 0.5) * CONFIG.INITIAL_VELOCITY_MAX * 2,
				y: (Math.random() - 0.5) * CONFIG.INITIAL_VELOCITY_MAX * 2
			});

			allBodies.push(body);
			tagBodies.set(tagName, body);
		}

		// Create post bodies at random positions
		for (const post of allPosts) {
			const size = getPostSize(post.item);
			const x = Math.random() * (width - size.width) + size.width / 2;
			const y = Math.random() * (height - size.height) + size.height / 2;

			const body = Matter.Bodies.rectangle(x, y, size.width, size.height, {
				restitution: CONFIG.RESTITUTION,
				frictionAir: CONFIG.FRICTION_AIR,
				chamfer: { radius: CONFIG.POST_CORNER_RADIUS },
				inertia: Infinity,  // Prevent rotation
				render: {
					fillStyle: CONFIG.COLORS[post.type === 'musing' ? 'musings' : 'projects'],
				}
			}) as PostBody;

			body.postData = { type: post.type, item: post.item };

			Matter.Body.setVelocity(body, {
				x: (Math.random() - 0.5) * CONFIG.INITIAL_VELOCITY_MAX * 2,
				y: (Math.random() - 0.5) * CONFIG.INITIAL_VELOCITY_MAX * 2
			});

			allBodies.push(body);
			postBodies.set(`${post.type}:${post.item.slug}`, body);
		}

		// Create constraints between tags and their posts
		for (const [tagName, data] of filteredTags) {
			const tagBody = tagBodies.get(tagName)!;
			for (const post of data.posts) {
				const postBody = postBodies.get(`${post.type}:${post.item.slug}`);
				if (postBody) {
					const constraint = Matter.Constraint.create({
						bodyA: tagBody,
						bodyB: postBody,
						stiffness: CONFIG.CONSTRAINT_STIFFNESS,
						length: CONFIG.CONSTRAINT_LENGTH,
						render: {
							strokeStyle: CONFIG.COLORS.constraint,
							lineWidth: 1,
						}
					});
					constraints.push(constraint);
				}
			}
		}

		// Create walls
		const wallThickness = 50;
		const walls = [
			Matter.Bodies.rectangle(width / 2, -wallThickness / 2, width, wallThickness, { isStatic: true, render: { visible: false } }),
			Matter.Bodies.rectangle(width / 2, height + wallThickness / 2, width, wallThickness, { isStatic: true, render: { visible: false } }),
			Matter.Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height, { isStatic: true, render: { visible: false } }),
			Matter.Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height, { isStatic: true, render: { visible: false } }),
		];

		// Add everything to the world
		Matter.Composite.add(engine.world, [...allBodies, ...walls, ...constraints]);

		// Mouse interaction
		mouse = Matter.Mouse.create(canvas);
		mouseConstraint = Matter.MouseConstraint.create(engine, {
			mouse: mouse,
			constraint: {
				stiffness: 0.2,
				render: { visible: false }
			}
		});
		Matter.Composite.add(engine.world, mouseConstraint);

		// Keep mouse in sync with render
		render.mouse = mouse;

		// Custom rendering for text labels
		Matter.Events.on(render, 'afterRender', () => {
			const ctx = render.context;

			for (const body of allBodies) {
				const pos = body.position;

				if (body.postData) {
					// Draw post label
					const item = body.postData.item;
					const size = getPostSize(item);
					const isHovered = hoveredBody === body;
					const isFilterHighlighted = highlightType && body.postData.type === highlightType;
					const isDimmed = highlightType && (highlightType === 'tag' || body.postData.type !== highlightType);

					// Draw dark overlay on dimmed items to fade the blob background
					if (isDimmed) {
						ctx.save();
						ctx.globalAlpha = 0.7;
						ctx.fillStyle = '#1a1a2e';
						ctx.beginPath();
						ctx.roundRect(
							pos.x - size.width / 2,
							pos.y - size.height / 2,
							size.width,
							size.height,
							CONFIG.POST_CORNER_RADIUS
						);
						ctx.fill();
						ctx.restore();
					}

					// Glow effect for filter-highlighted or hovered items
					if (isFilterHighlighted || isHovered) {
						ctx.save();
						const glowPadding = isHovered ? 6 : 4;
						const glowColor = body.postData.type === 'project'
							? 'rgba(100, 200, 150, 0.4)'
							: 'rgba(107, 159, 255, 0.4)';
						ctx.fillStyle = glowColor;
						ctx.beginPath();
						ctx.roundRect(
							pos.x - size.width / 2 - glowPadding,
							pos.y - size.height / 2 - glowPadding,
							size.width + glowPadding * 2,
							size.height + glowPadding * 2,
							CONFIG.POST_CORNER_RADIUS + glowPadding
						);
						ctx.fill();
						ctx.restore();
					}

					ctx.save();
					ctx.fillStyle = isHovered ? '#fff' : '#e0e0e0';
					ctx.font = `${isHovered ? 'bold ' : ''}14px system-ui, sans-serif`;
					ctx.textAlign = 'center';
					ctx.textBaseline = 'middle';

					// Use cached lines for multi-line titles
					const { lines } = measurePostSize(item);
					const lineHeight = 16;
					const totalTextHeight = lines.length * lineHeight;
					const dateOffset = 10;
					const startY = pos.y - (totalTextHeight / 2) - (dateOffset / 2) + (lineHeight / 2);

					for (let i = 0; i < lines.length; i++) {
						ctx.fillText(lines[i], pos.x, startY + (i * lineHeight));
					}

					// Date below
					ctx.font = '11px system-ui, sans-serif';
					ctx.fillStyle = '#fff';
					const dateStr = new Date(item.date.split(',')[0]).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
					ctx.fillText(dateStr, pos.x, startY + (lines.length * lineHeight) + 4);
					ctx.restore();

				} else if (body.tagData) {
					// Draw tag label
					const isHovered = hoveredBody === body;
					const isFilterHighlighted = highlightType === 'tag';
					const isDimmed = highlightType && highlightType !== 'tag';

					// Draw dark overlay on dimmed tags to fade the blob background
					if (isDimmed) {
						ctx.save();
						ctx.globalAlpha = 0.7;
						ctx.fillStyle = '#1a1a2e';
						ctx.beginPath();
						ctx.arc(pos.x, pos.y, CONFIG.TAG_RADIUS, 0, Math.PI * 2);
						ctx.fill();
						ctx.restore();
					}

					// Glow effect for filter-highlighted or hovered tags
					if (isFilterHighlighted || isHovered) {
						ctx.save();
						ctx.beginPath();
						const glowRadius = isHovered ? CONFIG.TAG_RADIUS + 5 : CONFIG.TAG_RADIUS + 3;
						ctx.arc(pos.x, pos.y, glowRadius, 0, Math.PI * 2);
						ctx.fillStyle = 'rgba(136, 136, 136, 0.4)';
						ctx.fill();
						ctx.restore();
					}

					ctx.save();
					ctx.fillStyle = isHovered ? '#fff' : '#ccc';
					ctx.font = `${isHovered ? 'bold ' : ''}11px system-ui, sans-serif`;
					ctx.textAlign = 'center';
					ctx.textBaseline = 'middle';

					// Split multi-word tags onto separate lines
					const tagName = body.tagData.name;
					const tagWords = tagName.split(' ');
					if (tagWords.length > 1) {
						const tagLineHeight = 12;
						const startY = pos.y - ((tagWords.length - 1) * tagLineHeight) / 2;
						for (let i = 0; i < tagWords.length; i++) {
							ctx.fillText(tagWords[i], pos.x, startY + (i * tagLineHeight));
						}
					} else {
						ctx.fillText(tagName, pos.x, pos.y);
					}
					ctx.restore();
				}
			}
		});

		// Track hovered body
		Matter.Events.on(mouseConstraint, 'mousemove', () => {
			const mousePos = mouse.position;
			hoveredBody = null;

			for (const body of allBodies) {
				let isInside = false;

				if (body.postData) {
					// Rectangle hit test
					const size = getPostSize(body.postData.item);
					const halfW = size.width / 2;
					const halfH = size.height / 2;
					isInside = mousePos.x >= body.position.x - halfW &&
					           mousePos.x <= body.position.x + halfW &&
					           mousePos.y >= body.position.y - halfH &&
					           mousePos.y <= body.position.y + halfH;
				} else {
					// Circle hit test for tags
					const dist = Math.hypot(body.position.x - mousePos.x, body.position.y - mousePos.y);
					isInside = dist < CONFIG.TAG_RADIUS;
				}

				if (isInside) {
					hoveredBody = body;
					canvas.style.cursor = 'pointer';
					break;
				}
			}

			if (!hoveredBody) {
				canvas.style.cursor = 'default';
			}
		});

		// Track mouse down position
		Matter.Events.on(mouseConstraint, 'mousedown', () => {
			mouseDownPos = { x: mouse.position.x, y: mouse.position.y };
		});

		// Handle clicks (only if not dragged)
		Matter.Events.on(mouseConstraint, 'mouseup', () => {
			if (mouseDownPos) {
				const dist = Math.hypot(
					mouse.position.x - mouseDownPos.x,
					mouse.position.y - mouseDownPos.y
				);

				// Only navigate if it wasn't a drag
				if (dist < DRAG_THRESHOLD) {
					if (hoveredBody?.postData) {
						const { type, item } = hoveredBody.postData;
						goto(`/${type}s/${item.slug}`);
					} else if (hoveredBody?.tagData) {
						goto(`/tag/${hoveredBody.tagData.name}`);
					}
				}
			}
			mouseDownPos = null;
		});

		// Smooth drift motion using sine waves with per-body phase offsets
		const bodyPhases = new Map<PostBody, { phaseX: number; phaseY: number; freqX: number; freqY: number }>();
		for (const body of allBodies) {
			bodyPhases.set(body, {
				phaseX: Math.random() * Math.PI * 2,
				phaseY: Math.random() * Math.PI * 2,
				freqX: 0.3 + Math.random() * 0.4,  // Vary frequency slightly per body
				freqY: 0.3 + Math.random() * 0.4,
			});
		}

		Matter.Events.on(engine, 'beforeUpdate', () => {
			time += 0.016; // ~60fps
			const centerX = width / 2;
			const centerY = height / 2;
			const margin = 50; // How far outside before we pull back
			const pullStrength = 0.01; // Force to pull escaped bodies back

			for (const body of allBodies) {
				if (body.isStatic) continue;

				// Boundary enforcement - pull back escaped bodies
				const pos = body.position;
				let pullX = 0, pullY = 0;
				if (pos.x < -margin) pullX = pullStrength;
				if (pos.x > width + margin) pullX = -pullStrength;
				if (pos.y < -margin) pullY = pullStrength;
				if (pos.y > height + margin) pullY = -pullStrength;
				if (pullX !== 0 || pullY !== 0) {
					Matter.Body.applyForce(body, pos, { x: pullX, y: pullY });
				}

				const phases = bodyPhases.get(body)!;

				if (tornadoActive && time < tornadoEndTime) {
					// Tornado effect - swirling vortex
					const dx = body.position.x - centerX;
					const dy = body.position.y - centerY;
					const dist = Math.sqrt(dx * dx + dy * dy) || 1;
					const angle = Math.atan2(dy, dx);

					// Tangential force (spin) + slight inward pull
					const tornadoStrength = 0.002;
					const inwardPull = 0.0005;
					const tangentX = -Math.sin(angle) * tornadoStrength;
					const tangentY = Math.cos(angle) * tornadoStrength;
					const inwardX = -dx / dist * inwardPull;
					const inwardY = -dy / dist * inwardPull;

					// Add some chaos
					const chaos = 0.001;

					Matter.Body.applyForce(body, body.position, {
						x: tangentX + inwardX + (Math.random() - 0.5) * chaos,
						y: tangentY + inwardY + (Math.random() - 0.5) * chaos
					});
				} else {
					// Smooth brownian motion using sine waves
					const forceX = Math.sin(time * phases.freqX + phases.phaseX) * CONFIG.BROWNIAN_FORCE;
					const forceY = Math.sin(time * phases.freqY + phases.phaseY) * CONFIG.BROWNIAN_FORCE;

					Matter.Body.applyForce(body, body.position, { x: forceX, y: forceY });
				}
			}

			// Auto-disable tornado after duration
			if (tornadoActive && time >= tornadoEndTime) {
				tornadoActive = false;
			}
		});

		// Run the engine and renderer
		runner = Matter.Runner.create();
		Matter.Runner.run(runner, engine);
		Matter.Render.run(render);
	}

	function handleResize() {
		if (!container) return;
		width = window.innerWidth;
		height = Math.min(600, window.innerHeight * 0.6);

		if (render) {
			render.canvas.width = width;
			render.canvas.height = height;
			render.options.width = width;
			render.options.height = height;

			// Update walls
			const walls = Matter.Composite.allBodies(engine.world).filter(b => b.isStatic);
			Matter.Composite.remove(engine.world, walls);

			const wallThickness = 50;
			const newWalls = [
				Matter.Bodies.rectangle(width / 2, -wallThickness / 2, width, wallThickness, { isStatic: true, render: { visible: false } }),
				Matter.Bodies.rectangle(width / 2, height + wallThickness / 2, width, wallThickness, { isStatic: true, render: { visible: false } }),
				Matter.Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height, { isStatic: true, render: { visible: false } }),
				Matter.Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height, { isStatic: true, render: { visible: false } }),
			];
			Matter.Composite.add(engine.world, newWalls);
		}
	}

	function triggerSwirl(durationSeconds = 3) {
		tornadoActive = true;
		tornadoEndTime = time + durationSeconds;
	}

	function triggerShake() {
		// Add random velocity to all bodies - monte carlo style energy burst
		for (const body of allBodies) {
			if (body.isStatic) continue;
			const strength = 8;
			Matter.Body.setVelocity(body, {
				x: (Math.random() - 0.5) * strength * 2,
				y: (Math.random() - 0.5) * strength * 2
			});
		}
	}

	onMount(async () => {
		if (!browser) return;

		// Dynamically import Matter.js (client-side only)
		Matter = await import('matter-js');

		handleResize();
		setupPhysics();
		window.addEventListener('resize', handleResize);

		// Expose functions to parent
		onSwirlReady(triggerSwirl);
		onShakeReady(triggerShake);
	});

	onDestroy(() => {
		if (!browser || !Matter) return;
		if (runner) Matter.Runner.stop(runner);
		if (render) Matter.Render.stop(render);
		if (engine) Matter.Engine.clear(engine);
		window.removeEventListener('resize', handleResize);
	});
</script>

<div class="physics-container" bind:this={container}>
	<canvas bind:this={canvas}></canvas>
</div>

<style>
	.physics-container {
		/* Break out of centered container to full viewport width */
		width: 100vw;
		position: relative;
		left: 50%;
		right: 50%;
		margin-left: -50vw;
		margin-right: -50vw;
		height: 600px;
		max-height: 60vh;
		margin-top: 2rem;
		overflow: hidden;
	}

	canvas {
		display: block;
		width: 100%;
		height: 100%;
	}
</style>
