<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { loadAllContent } from '$lib/content/loader';
	import type { ContentItem } from '$lib/content/types';

	// Props
	let {
		highlightType = null,
		springLength = 200,
		springStiffness = 0.001,
		isMobile = false,
		onSwirlReady = (_fn: () => void) => {},
		onShakeReady = (_fn: () => void) => {},
		onBlobClick = (_data: BlobClickData | null) => {}
	}: {
		highlightType: 'musing' | 'project' | 'tag' | null;
		springLength?: number;
		springStiffness?: number;
		isMobile?: boolean;
		onSwirlReady?: (fn: () => void) => void;
		onShakeReady?: (fn: () => void) => void;
		onBlobClick?: (data: BlobClickData | null) => void;
	} = $props();

	interface BlobClickData {
		type: 'project' | 'musing' | 'tag';
		title: string;
		description?: string;
		slug?: string;
		tagName?: string;
		position: { x: number; y: number };
	}

	// Matter.js types (loaded dynamically)
	type MatterType = typeof import('matter-js');
	let Matter: MatterType;

	// Config
	const CONFIG = {
		CIRCLE_RADIUS_DESKTOP: 28,
		CIRCLE_RADIUS_MOBILE: 14,
		CENTER_RADIUS_DESKTOP: 130,  // Sized to match visual badge (~164x160)
		CENTER_RADIUS_MOBILE: 90,    // Sized to match mobile badge (~118x115)
		TAG_MIN_USE_DESKTOP: 1,
		TAG_MIN_USE_MOBILE: 2,  // Only cross-linked tags on mobile
		FRICTION_AIR: 0.08,      // Higher = more damping = calmer
		RESTITUTION: 0.3,        // Lower = less bouncy
		INITIAL_VELOCITY_MAX: 0.5,
		BROWNIAN_FORCE: 0.00005, // Much gentler drift
		COLORS: {
			musings: 'rgb(107, 159, 255)',
			projects: 'rgb(100, 200, 150)',
			tags: 'rgb(100, 100, 100)',
			center: 'rgba(26, 26, 46, 0.01)',
			constraint: 'rgba(136, 136, 136, 0.2)',
		}
	};

	interface BlobBody extends Matter.Body {
		blobData?: {
			type: 'musing' | 'project';
			item: ContentItem;
		};
		tagData?: {
			name: string;
			uses: number;
		};
		isCenter?: boolean;
	}

	let canvas: HTMLCanvasElement;
	let container: HTMLDivElement;
	let engine: Matter.Engine;
	let render: Matter.Render;
	let runner: Matter.Runner;
	let mouse: Matter.Mouse;
	let mouseConstraint: Matter.MouseConstraint;
	let hoveredBody: BlobBody | null = null;
	let mouseDownPos: { x: number; y: number } | null = null;
	let constraints: Matter.Constraint[] = [];
	const DRAG_THRESHOLD = 5;
	let width = 800;
	let height = 600;
	let allBodies: BlobBody[] = [];
	let time = 0;
	let tornadoActive = false;
	let tornadoEndTime = 0;

	// Reactive config based on mobile
	const circleRadius = $derived(isMobile ? CONFIG.CIRCLE_RADIUS_MOBILE : CONFIG.CIRCLE_RADIUS_DESKTOP);
	const centerRadius = $derived(isMobile ? CONFIG.CENTER_RADIUS_MOBILE : CONFIG.CENTER_RADIUS_DESKTOP);
	const tagMinUse = $derived(isMobile ? CONFIG.TAG_MIN_USE_MOBILE : CONFIG.TAG_MIN_USE_DESKTOP);

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

	// Update constraint properties when sliders change
	$effect(() => {
		// Read props to ensure tracking
		const length = springLength;
		const stiffness = springStiffness;

		if (constraints.length > 0 && Matter) {
			for (const constraint of constraints) {
				constraint.length = length;
				constraint.stiffness = stiffness * 0.3;  // Match initial creation multiplier
			}
		}
	});

	function setupPhysics() {
		const currentTagMinUse = isMobile ? CONFIG.TAG_MIN_USE_MOBILE : CONFIG.TAG_MIN_USE_DESKTOP;
		const currentCircleRadius = isMobile ? CONFIG.CIRCLE_RADIUS_MOBILE : CONFIG.CIRCLE_RADIUS_DESKTOP;
		const currentCenterRadius = isMobile ? CONFIG.CENTER_RADIUS_MOBILE : CONFIG.CENTER_RADIUS_DESKTOP;

		// Filter tags by minimum usage
		const filteredTags = Array.from(tagUsage.entries())
			.filter(([_, data]) => data.count >= currentTagMinUse);

		// Create engine
		engine = Matter.Engine.create();
		engine.gravity.y = 0;

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
		const postBodies = new Map<string, BlobBody>();
		const tagBodies = new Map<string, BlobBody>();
		constraints = [];

		// Create center body (static, for collision)
		const centerBody = Matter.Bodies.circle(width / 2, height / 2, currentCenterRadius, {
			isStatic: true,
			render: {
				fillStyle: CONFIG.COLORS.center,
			}
		}) as BlobBody;
		centerBody.isCenter = true;

		// Create tag bodies - spread around the whole screen
		const tagCount = filteredTags.length;
		let tagIndex = 0;
		for (const [tagName, data] of filteredTags) {
			// Distribute tags evenly around the screen edges
			const angle = (tagIndex / tagCount) * Math.PI * 2 + Math.random() * 0.3;
			const dist = Math.min(width, height) * 0.35 + Math.random() * 50;
			const x = width / 2 + Math.cos(angle) * dist;
			const y = height / 2 + Math.sin(angle) * dist;
			tagIndex++;

			const body = Matter.Bodies.circle(x, y, currentCircleRadius * 0.8, {
				restitution: CONFIG.RESTITUTION,
				frictionAir: CONFIG.FRICTION_AIR,
				render: {
					fillStyle: CONFIG.COLORS.tags,
				}
			}) as BlobBody;

			body.tagData = { name: tagName, uses: data.count };

			Matter.Body.setVelocity(body, {
				x: (Math.random() - 0.5) * CONFIG.INITIAL_VELOCITY_MAX * 2,
				y: (Math.random() - 0.5) * CONFIG.INITIAL_VELOCITY_MAX * 2
			});

			allBodies.push(body);
			tagBodies.set(tagName, body);
		}

		// Create post bodies - spread them out evenly
		const postCount = allPosts.length;
		let postIndex = 0;
		for (const post of allPosts) {
			// Distribute posts in a ring, offset from tags
			const angle = (postIndex / postCount) * Math.PI * 2 + Math.PI / postCount;
			const dist = Math.min(width, height) * 0.25 + Math.random() * 30;
			const x = width / 2 + Math.cos(angle) * dist;
			const y = height / 2 + Math.sin(angle) * dist;
			postIndex++;

			const body = Matter.Bodies.circle(x, y, currentCircleRadius, {
				restitution: CONFIG.RESTITUTION,
				frictionAir: CONFIG.FRICTION_AIR,
				render: {
					fillStyle: CONFIG.COLORS[post.type === 'musing' ? 'musings' : 'projects'],
				}
			}) as BlobBody;

			body.blobData = { type: post.type, item: post.item };

			Matter.Body.setVelocity(body, {
				x: (Math.random() - 0.5) * CONFIG.INITIAL_VELOCITY_MAX * 2,
				y: (Math.random() - 0.5) * CONFIG.INITIAL_VELOCITY_MAX * 2
			});

			allBodies.push(body);
			postBodies.set(`${post.type}:${post.item.slug}`, body);
		}

		// Connect tags to their posts with very soft springs
		for (const [tagName, data] of filteredTags) {
			const tagBody = tagBodies.get(tagName)!;
			for (const post of data.posts) {
				const postBody = postBodies.get(`${post.type}:${post.item.slug}`);
				if (postBody) {
					const constraint = Matter.Constraint.create({
						bodyA: tagBody,
						bodyB: postBody,
						stiffness: springStiffness * 0.3,  // Very soft
						length: springLength,
						render: {
							strokeStyle: CONFIG.COLORS.constraint,
							lineWidth: 1,
						}
					});
					constraints.push(constraint);
				}
			}
		}

		// Create walls (bottom wall raised to keep blobs above control bar)
		const wallThickness = 50;
		const bottomMargin = isMobile ? 0 : 80;  // Space for control bar on desktop
		const walls = [
			Matter.Bodies.rectangle(width / 2, -wallThickness / 2, width, wallThickness, { isStatic: true, render: { visible: false } }),
			Matter.Bodies.rectangle(width / 2, height - bottomMargin + wallThickness / 2, width, wallThickness, { isStatic: true, render: { visible: false } }),
			Matter.Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height, { isStatic: true, render: { visible: false } }),
			Matter.Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height, { isStatic: true, render: { visible: false } }),
		];

		// Add everything to the world
		Matter.Composite.add(engine.world, [centerBody, ...allBodies, ...walls, ...constraints]);

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
		render.mouse = mouse;

		// Custom rendering for text labels
		Matter.Events.on(render, 'afterRender', () => {
			const ctx = render.context;
			const currentRadius = isMobile ? CONFIG.CIRCLE_RADIUS_MOBILE : CONFIG.CIRCLE_RADIUS_DESKTOP;

			for (const body of allBodies) {
				const pos = body.position;
				const isHovered = hoveredBody === body;

				if (body.blobData) {
					const item = body.blobData.item;
					const isFilterHighlighted = highlightType && body.blobData.type === highlightType;

					// Glow effect for highlighted items
					if (isFilterHighlighted) {
						ctx.save();
						const glowColor = body.blobData.type === 'project'
							? 'rgba(100, 200, 150, 0.6)'
							: 'rgba(107, 159, 255, 0.6)';
						ctx.shadowColor = glowColor;
						ctx.shadowBlur = 15;
						ctx.fillStyle = glowColor;
						ctx.beginPath();
						ctx.arc(pos.x, pos.y, currentRadius + 4, 0, Math.PI * 2);
						ctx.fill();
						ctx.restore();
					}

					// Text label centered on circle
					ctx.save();
					ctx.font = `${isMobile ? '10' : '13'}px system-ui, sans-serif`;
					ctx.textAlign = 'center';
					ctx.textBaseline = 'middle';

					// No truncation - show full title
					const title = item.title;
					const textMetrics = ctx.measureText(title);
					const textHeight = isMobile ? 14 : 18;
					const padding = 6;
					const pillWidth = textMetrics.width + padding * 2;
					const pillHeight = textHeight + padding;
					const pillX = pos.x - pillWidth / 2;
					const pillY = pos.y - pillHeight / 2;

					// Background pill (solid color)
					ctx.fillStyle = body.blobData.type === 'project'
						? CONFIG.COLORS.projects
						: CONFIG.COLORS.musings;
					ctx.beginPath();
					ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 6);
					ctx.fill();

					// Text with drop shadow
					ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
					ctx.shadowBlur = 0;
					ctx.shadowOffsetX = 0;
					ctx.shadowOffsetY = 1;
					ctx.fillStyle = '#fff';
					ctx.fillText(title, pos.x, pos.y);
					ctx.restore();

				} else if (body.tagData) {
					const isFilterHighlighted = highlightType === 'tag';
					const tagRadius = currentRadius * 0.8;

					// Glow effect for highlighted tags
					if (isFilterHighlighted) {
						ctx.save();
						ctx.shadowColor = 'rgba(180, 180, 180, 0.5)';
						ctx.shadowBlur = 12;
						ctx.fillStyle = 'rgba(180, 180, 180, 0.4)';
						ctx.beginPath();
						ctx.arc(pos.x, pos.y, tagRadius + 3, 0, Math.PI * 2);
						ctx.fill();
						ctx.restore();
					}

					// Tag label centered on circle
					ctx.save();
					ctx.font = `${isMobile ? '9' : '11'}px system-ui, sans-serif`;
					ctx.textAlign = 'center';
					ctx.textBaseline = 'middle';

					const tagName = body.tagData.name;
					const textMetrics = ctx.measureText(tagName);
					const textHeight = isMobile ? 12 : 15;
					const padding = 4;
					const pillWidth = textMetrics.width + padding * 2;
					const pillHeight = textHeight + padding;
					const pillX = pos.x - pillWidth / 2;
					const pillY = pos.y - pillHeight / 2;

					// Background pill (solid color)
					ctx.fillStyle = CONFIG.COLORS.tags;
					ctx.beginPath();
					ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 5);
					ctx.fill();

					// Text with drop shadow
					ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
					ctx.shadowBlur = 0;
					ctx.shadowOffsetX = 0;
					ctx.shadowOffsetY = 1;
					ctx.fillStyle = '#fff';
					ctx.fillText(tagName, pos.x, pos.y);
					ctx.restore();
				}
			}
		});

		// Track hovered body
		Matter.Events.on(mouseConstraint, 'mousemove', () => {
			const mousePos = mouse.position;
			hoveredBody = null;
			const currentRadius = isMobile ? CONFIG.CIRCLE_RADIUS_MOBILE : CONFIG.CIRCLE_RADIUS_DESKTOP;

			for (const body of allBodies) {
				const dist = Math.hypot(body.position.x - mousePos.x, body.position.y - mousePos.y);
				const bodyRadius = body.tagData ? currentRadius * 0.8 : currentRadius;

				if (dist < bodyRadius + 5) {
					hoveredBody = body;
					canvas.style.cursor = 'pointer';
					break;
				}
			}

			if (!hoveredBody) {
				canvas.style.cursor = 'default';
			}
		});

		// Track mouse down
		Matter.Events.on(mouseConstraint, 'mousedown', () => {
			mouseDownPos = { x: mouse.position.x, y: mouse.position.y };
		});

		// Handle clicks
		Matter.Events.on(mouseConstraint, 'mouseup', () => {
			if (mouseDownPos) {
				const dist = Math.hypot(
					mouse.position.x - mouseDownPos.x,
					mouse.position.y - mouseDownPos.y
				);

				if (dist < DRAG_THRESHOLD && hoveredBody) {
					if (hoveredBody.blobData) {
						const { type, item } = hoveredBody.blobData;
						onBlobClick({
							type,
							title: item.title,
							description: item.description,
							slug: item.slug,
							position: { x: hoveredBody.position.x, y: hoveredBody.position.y }
						});
					} else if (hoveredBody.tagData) {
						onBlobClick({
							type: 'tag',
							title: `#${hoveredBody.tagData.name}`,
							tagName: hoveredBody.tagData.name,
							description: `${hoveredBody.tagData.uses} items with this tag`,
							position: { x: hoveredBody.position.x, y: hoveredBody.position.y }
						});
					}
				}
			}
			mouseDownPos = null;
		});

		// Physics: brownian motion and tornado
		const bodyPhases = new Map<BlobBody, { phaseX: number; phaseY: number; freqX: number; freqY: number }>();
		for (const body of allBodies) {
			bodyPhases.set(body, {
				phaseX: Math.random() * Math.PI * 2,
				phaseY: Math.random() * Math.PI * 2,
				freqX: 0.3 + Math.random() * 0.4,
				freqY: 0.3 + Math.random() * 0.4,
			});
		}

		Matter.Events.on(engine, 'beforeUpdate', () => {
			time += 0.016;
			const centerX = width / 2;
			const centerY = height / 2;
			const margin = 50;
			const pullStrength = 0.01;

			for (const body of allBodies) {
				if (body.isStatic) continue;

				// Boundary enforcement
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
					const dx = body.position.x - centerX;
					const dy = body.position.y - centerY;
					const dist = Math.sqrt(dx * dx + dy * dy) || 1;
					const angle = Math.atan2(dy, dx);

					const tornadoStrength = 0.002;
					const inwardPull = 0.0005;
					const tangentX = -Math.sin(angle) * tornadoStrength;
					const tangentY = Math.cos(angle) * tornadoStrength;
					const inwardX = -dx / dist * inwardPull;
					const inwardY = -dy / dist * inwardPull;
					const chaos = 0.001;

					Matter.Body.applyForce(body, body.position, {
						x: tangentX + inwardX + (Math.random() - 0.5) * chaos,
						y: tangentY + inwardY + (Math.random() - 0.5) * chaos
					});
				} else {
					const forceX = Math.sin(time * phases.freqX + phases.phaseX) * CONFIG.BROWNIAN_FORCE;
					const forceY = Math.sin(time * phases.freqY + phases.phaseY) * CONFIG.BROWNIAN_FORCE;
					Matter.Body.applyForce(body, body.position, { x: forceX, y: forceY });
				}
			}

			if (tornadoActive && time >= tornadoEndTime) {
				tornadoActive = false;
			}
		});

		runner = Matter.Runner.create();
		Matter.Runner.run(runner, engine);
		Matter.Render.run(render);
	}

	function handleResize() {
		if (!container) return;
		width = window.innerWidth;
		height = window.innerHeight;

		if (render) {
			render.canvas.width = width;
			render.canvas.height = height;
			render.options.width = width;
			render.options.height = height;

			// Update walls
			const walls = Matter.Composite.allBodies(engine.world).filter(b => b.isStatic && !b.isCenter);
			Matter.Composite.remove(engine.world, walls);

			const wallThickness = 50;
			const bottomMargin = isMobile ? 0 : 80;  // Space for control bar on desktop
			const newWalls = [
				Matter.Bodies.rectangle(width / 2, -wallThickness / 2, width, wallThickness, { isStatic: true, render: { visible: false } }),
				Matter.Bodies.rectangle(width / 2, height - bottomMargin + wallThickness / 2, width, wallThickness, { isStatic: true, render: { visible: false } }),
				Matter.Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height, { isStatic: true, render: { visible: false } }),
				Matter.Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height, { isStatic: true, render: { visible: false } }),
			];
			Matter.Composite.add(engine.world, newWalls);

			// Update center body position
			const centerBody = Matter.Composite.allBodies(engine.world).find(b => (b as BlobBody).isCenter);
			if (centerBody) {
				Matter.Body.setPosition(centerBody, { x: width / 2, y: height / 2 });
			}
		}
	}

	function triggerSwirl(durationSeconds = 3) {
		tornadoActive = true;
		tornadoEndTime = time + durationSeconds;
	}

	function triggerShake() {
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

		Matter = await import('matter-js');

		handleResize();
		setupPhysics();
		window.addEventListener('resize', handleResize);

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
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}

	canvas {
		display: block;
		width: 100%;
		height: 100%;
	}
</style>
