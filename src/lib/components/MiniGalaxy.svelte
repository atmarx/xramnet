<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { getRelatedContent } from '$lib/content/relations';
	import type { ContentItem } from '$lib/content/types';
	import type { ContentType } from '$lib/content/config';

	// Props
	let {
		currentItem,
		currentType,
		width = 300,
		height = 400,
		onNodeClick = (_data: NodeClickData | null) => {}
	}: {
		currentItem: ContentItem;
		currentType: ContentType;
		width?: number;
		height?: number;
		onNodeClick?: (data: NodeClickData | null) => void;
	} = $props();

	export interface NodeClickData {
		type: 'musing' | 'project' | 'tag' | 'center';
		item?: ContentItem;
		title: string;
		description?: string;
		slug?: string;
		tagName?: string;
		contentType?: ContentType;
		position: { x: number; y: number };
	}

	// Matter.js types
	type MatterType = typeof import('matter-js');
	let Matter: MatterType;

	// Config - scaled down for mini version
	const CONFIG = {
		CENTER_RADIUS: 30,
		TAG_RADIUS: 20,
		CONTENT_RADIUS: 24,
		FRICTION_AIR: 0.12,      // Higher damping = calmer
		RESTITUTION: 0.2,
		INITIAL_VELOCITY_MAX: 1,
		BROWNIAN_FORCE: 0.00004, // Gentler drift
		SPRING_LENGTH: 120,
		SPRING_STIFFNESS: 0.00015,
		COLORS: {
			musings: 'rgb(107, 159, 255)',
			projects: 'rgb(100, 200, 150)',
			tags: 'rgb(100, 100, 100)',
			center: 'rgb(180, 140, 255)',  // Distinct purple for center
			constraint: 'rgba(136, 136, 136, 0.15)',
		}
	};

	interface GalaxyBody extends Matter.Body {
		nodeData?: {
			type: 'center' | 'tag' | 'related';
			item?: ContentItem;
			contentType?: ContentType;
			tagName?: string;
			sharedTags?: string[];
		};
	}

	let canvas: HTMLCanvasElement;
	let container: HTMLDivElement;
	let engine: Matter.Engine;
	let render: Matter.Render;
	let runner: Matter.Runner;
	let mouse: Matter.Mouse;
	let mouseConstraint: Matter.MouseConstraint;
	let hoveredBody: GalaxyBody | null = null;
	let mouseDownPos: { x: number; y: number } | null = null;
	let allBodies: GalaxyBody[] = [];
	let time = 0;
	const DRAG_THRESHOLD = 5;

	// Get related content (derived to properly track currentItem)
	const relatedContent = $derived(getRelatedContent(currentItem));

	function setupPhysics() {
		const centerX = width / 2;
		const centerY = height / 2;

		engine = Matter.Engine.create();
		engine.gravity.y = 0;

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
		const constraints: Matter.Constraint[] = [];

		// Center body - the current content (static, center)
		const centerBody = Matter.Bodies.circle(centerX, centerY, CONFIG.CENTER_RADIUS, {
			isStatic: true,
			render: { fillStyle: CONFIG.COLORS.center }
		}) as GalaxyBody;
		centerBody.nodeData = {
			type: 'center',
			item: currentItem,
			contentType: currentType
		};
		allBodies.push(centerBody);

		// Tag bodies - orbit close to center
		const tagBodies = new Map<string, GalaxyBody>();
		const tagCount = currentItem.tags.length;

		currentItem.tags.forEach((tag, i) => {
			const angle = (i / tagCount) * Math.PI * 2 + Math.random() * 0.3;
			const radius = 70 + Math.random() * 30;
			const x = centerX + Math.cos(angle) * radius;
			const y = centerY + Math.sin(angle) * radius;

			const body = Matter.Bodies.circle(x, y, CONFIG.TAG_RADIUS, {
				restitution: CONFIG.RESTITUTION,
				frictionAir: CONFIG.FRICTION_AIR,
				render: { fillStyle: CONFIG.COLORS.tags }
			}) as GalaxyBody;

			body.nodeData = {
				type: 'tag',
				tagName: tag.toLowerCase()
			};

			// Gentle initial velocity for orbital motion
			const tangentAngle = angle + Math.PI / 2;
			Matter.Body.setVelocity(body, {
				x: Math.cos(tangentAngle) * 0.5,
				y: Math.sin(tangentAngle) * 0.5
			});

			allBodies.push(body);
			tagBodies.set(tag.toLowerCase(), body);

			// Spring to center
			constraints.push(Matter.Constraint.create({
				bodyA: centerBody,
				bodyB: body,
				stiffness: CONFIG.SPRING_STIFFNESS,
				length: CONFIG.SPRING_LENGTH * 0.8,
				render: { strokeStyle: CONFIG.COLORS.constraint, lineWidth: 1 }
			}));
		});

		// Related content bodies - orbit further out
		const maxRelated = 8; // Limit to avoid clutter
		const relatedToShow = relatedContent.slice(0, maxRelated);

		relatedToShow.forEach((related, i) => {
			const angle = (i / relatedToShow.length) * Math.PI * 2 + Math.random() * 0.5;
			const radius = 130 + Math.random() * 40;
			const x = centerX + Math.cos(angle) * radius;
			const y = centerY + Math.sin(angle) * radius;

			const colorKey = related.type === 'musing' ? 'musings' : 'projects';
			const body = Matter.Bodies.circle(x, y, CONFIG.CONTENT_RADIUS, {
				restitution: CONFIG.RESTITUTION,
				frictionAir: CONFIG.FRICTION_AIR,
				render: { fillStyle: CONFIG.COLORS[colorKey] }
			}) as GalaxyBody;

			body.nodeData = {
				type: 'related',
				item: related.item,
				contentType: related.type,
				sharedTags: related.sharedTags
			};

			// Gentle orbital velocity
			const tangentAngle = angle + Math.PI / 2;
			Matter.Body.setVelocity(body, {
				x: Math.cos(tangentAngle) * 0.3,
				y: Math.sin(tangentAngle) * 0.3
			});

			allBodies.push(body);

			// Connect to shared tags
			for (const tag of related.sharedTags) {
				const tagBody = tagBodies.get(tag.toLowerCase());
				if (tagBody) {
					constraints.push(Matter.Constraint.create({
						bodyA: tagBody,
						bodyB: body,
						stiffness: CONFIG.SPRING_STIFFNESS * 0.5,
						length: CONFIG.SPRING_LENGTH,
						render: { strokeStyle: CONFIG.COLORS.constraint, lineWidth: 1 }
					}));
				}
			}
		});

		// Invisible walls
		const wallThickness = 50;
		const walls = [
			Matter.Bodies.rectangle(width / 2, -wallThickness / 2, width, wallThickness, { isStatic: true, render: { visible: false } }),
			Matter.Bodies.rectangle(width / 2, height + wallThickness / 2, width, wallThickness, { isStatic: true, render: { visible: false } }),
			Matter.Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height, { isStatic: true, render: { visible: false } }),
			Matter.Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height, { isStatic: true, render: { visible: false } }),
		];

		Matter.Composite.add(engine.world, [...allBodies, ...walls, ...constraints]);

		// Mouse interaction
		mouse = Matter.Mouse.create(canvas);
		mouseConstraint = Matter.MouseConstraint.create(engine, {
			mouse: mouse,
			constraint: { stiffness: 0.2, render: { visible: false } }
		});
		Matter.Composite.add(engine.world, mouseConstraint);
		render.mouse = mouse;

		// Custom rendering for labels
		Matter.Events.on(render, 'afterRender', () => {
			const ctx = render.context;

			for (const body of allBodies) {
				const pos = body.position;
				const data = body.nodeData;
				if (!data) continue;

				ctx.save();
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';

				if (data.type === 'center') {
					// Center node - show abbreviated title
					ctx.font = 'bold 13px system-ui, sans-serif';
					const title = truncate(currentItem.title, 20);
					drawPill(ctx, pos.x, pos.y, title, CONFIG.COLORS.center);
				} else if (data.type === 'tag') {
					// Tag node
					ctx.font = '12px system-ui, sans-serif';
					drawPill(ctx, pos.x, pos.y, data.tagName!, CONFIG.COLORS.tags);
				} else if (data.type === 'related' && data.item) {
					// Related content node
					ctx.font = '12px system-ui, sans-serif';
					const colorKey = data.contentType === 'musing' ? 'musings' : 'projects';
					const title = truncate(data.item.title, 18);
					drawPill(ctx, pos.x, pos.y, title, CONFIG.COLORS[colorKey]);
				}

				ctx.restore();
			}
		});

		// Hover detection
		Matter.Events.on(mouseConstraint, 'mousemove', () => {
			const mousePos = mouse.position;
			hoveredBody = null;

			for (const body of allBodies) {
				const dist = Math.hypot(body.position.x - mousePos.x, body.position.y - mousePos.y);
				const radius = getBodyRadius(body);

				if (dist < radius + 5) {
					hoveredBody = body;
					canvas.style.cursor = 'pointer';
					break;
				}
			}

			if (!hoveredBody) {
				canvas.style.cursor = 'default';
			}
		});

		// Click handling
		Matter.Events.on(mouseConstraint, 'mousedown', () => {
			mouseDownPos = { x: mouse.position.x, y: mouse.position.y };
		});

		Matter.Events.on(mouseConstraint, 'mouseup', () => {
			if (mouseDownPos && hoveredBody) {
				const dist = Math.hypot(
					mouse.position.x - mouseDownPos.x,
					mouse.position.y - mouseDownPos.y
				);

				if (dist < DRAG_THRESHOLD) {
					const data = hoveredBody.nodeData;
					if (data) {
						if (data.type === 'center') {
							onNodeClick({
								type: 'center',
								item: currentItem,
								title: currentItem.title,
								description: currentItem.description,
								slug: currentItem.slug,
								contentType: currentType,
								position: { x: hoveredBody.position.x, y: hoveredBody.position.y }
							});
						} else if (data.type === 'tag') {
							onNodeClick({
								type: 'tag',
								title: `#${data.tagName}`,
								tagName: data.tagName,
								position: { x: hoveredBody.position.x, y: hoveredBody.position.y }
							});
						} else if (data.type === 'related' && data.item) {
							onNodeClick({
								type: data.contentType === 'musing' ? 'musing' : 'project',
								item: data.item,
								title: data.item.title,
								description: data.item.description,
								slug: data.item.slug,
								contentType: data.contentType,
								position: { x: hoveredBody.position.x, y: hoveredBody.position.y }
							});
						}
					}
				}
			}
			mouseDownPos = null;
		});

		// Brownian motion with gentle orbital tendency
		const bodyPhases = new Map<GalaxyBody, { phase: number; freq: number }>();
		for (const body of allBodies) {
			bodyPhases.set(body, {
				phase: Math.random() * Math.PI * 2,
				freq: 0.2 + Math.random() * 0.3,
			});
		}

		Matter.Events.on(engine, 'beforeUpdate', () => {
			time += 0.016;
			const centerX = width / 2;
			const centerY = height / 2;

			for (const body of allBodies) {
				if (body.isStatic) continue;

				const phases = bodyPhases.get(body)!;
				const pos = body.position;

				// Gentle orbital force
				const dx = pos.x - centerX;
				const dy = pos.y - centerY;
				const angle = Math.atan2(dy, dx);
				const orbitForce = 0.00002;

				// Tangential + slight inward
				const tangentX = -Math.sin(angle) * orbitForce;
				const tangentY = Math.cos(angle) * orbitForce;

				// Add brownian drift
				const brownianX = Math.sin(time * phases.freq + phases.phase) * CONFIG.BROWNIAN_FORCE;
				const brownianY = Math.cos(time * phases.freq + phases.phase + 1) * CONFIG.BROWNIAN_FORCE;

				Matter.Body.applyForce(body, pos, {
					x: tangentX + brownianX,
					y: tangentY + brownianY
				});
			}
		});

		runner = Matter.Runner.create();
		Matter.Runner.run(runner, engine);
		Matter.Render.run(render);
	}

	function getBodyRadius(body: GalaxyBody): number {
		const data = body.nodeData;
		if (!data) return CONFIG.TAG_RADIUS;
		if (data.type === 'center') return CONFIG.CENTER_RADIUS;
		if (data.type === 'tag') return CONFIG.TAG_RADIUS;
		return CONFIG.CONTENT_RADIUS;
	}

	function truncate(str: string, maxLen: number): string {
		if (str.length <= maxLen) return str;
		return str.slice(0, maxLen - 1) + '…';
	}

	function drawPill(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		text: string,
		color: string
	) {
		const metrics = ctx.measureText(text);
		const padding = 6;
		const pillWidth = metrics.width + padding * 2;
		const pillHeight = 20;

		// Background
		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.roundRect(x - pillWidth / 2, y - pillHeight / 2, pillWidth, pillHeight, 4);
		ctx.fill();

		// Text
		ctx.fillStyle = '#fff';
		ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
		ctx.shadowOffsetY = 1;
		ctx.fillText(text, x, y);
	}

	onMount(async () => {
		if (!browser) return;
		Matter = await import('matter-js');
		setupPhysics();
	});

	onDestroy(() => {
		if (!browser || !Matter) return;
		if (runner) Matter.Runner.stop(runner);
		if (render) Matter.Render.stop(render);
		if (engine) Matter.Engine.clear(engine);
	});
</script>

<div class="mini-galaxy" bind:this={container} style="width: {width}px; height: {height}px;">
	<canvas bind:this={canvas} {width} {height}></canvas>
</div>

<style>
	.mini-galaxy {
		position: relative;
		border-radius: 8px;
		overflow: hidden;
	}

	canvas {
		display: block;
	}
</style>
