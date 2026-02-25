<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { loadAllContent } from '$lib/content/loader';
	import type { ContentItem } from '$lib/content/types';

	// Game modules
	import {
		CONFIG, PLANET_MAX_HEALTH, SHIP_MAX_HEALTH, CENTER_MAX_HEALTH,
		TOOLTIP_WIDTH, TOOLTIP_HEIGHT,
		createDefaultGameState,
		type BlobBody, type BlobClickData
	} from '$lib/game/types';
	import { renderWorldSpace, renderScreenSpace, updateFadingConstraints } from '$lib/game/renderer';
	import {
		updateShipControls, wrapShipPosition, fireMissiles, cleanupMissiles,
		spawnNormalAsteroids, spawnVictoryAsteroids, spawnStormAsteroids, cleanupAsteroids,
		handleCollisions
	} from '$lib/game/gameplay';
	import {
		updateShipRespawn, updateBlackHole, checkBigBang,
		rescueStuckBodies, handleGoodbyeKeystroke, triggerGoodbye
	} from '$lib/game/effects';

	// Re-export BlobClickData for parent
	export type { BlobClickData };

	// Props
	let {
		highlightType = null,
		springLength = 200,
		springStiffness = 0.001,
		driveFrequency = 0,
		driveExcitement = 0,
		reducedMotion = false,
		isMobile = false,
		onSwirlReady = (_fn: () => void) => {},
		onShakeReady = (_fn: () => void) => {},
		onBlobClick = (_data: BlobClickData | null) => {},
		onCenterDestroyed = (_dead: boolean) => {},
		onResetReady = (_fn: () => void) => {},
		onScoreChange = (_score: number) => {},
		onShipEscaped = (_data: { score: number; shipHealth: number }) => {}
	}: {
		highlightType: 'musing' | 'project' | 'tag' | null;
		springLength?: number;
		springStiffness?: number;
		driveFrequency?: number;
		driveExcitement?: number;
		reducedMotion?: boolean;
		isMobile?: boolean;
		onSwirlReady?: (fn: () => void) => void;
		onShakeReady?: (fn: () => void) => void;
		onBlobClick?: (data: BlobClickData | null) => void;
		onCenterDestroyed?: (dead: boolean) => void;
		onResetReady?: (fn: () => void) => void;
		onScoreChange?: (score: number) => void;
		onShipEscaped?: (data: { score: number; shipHealth: number }) => void;
	} = $props();

	// Matter.js (loaded dynamically)
	type MatterType = typeof import('matter-js');
	let Matter: MatterType;

	// DOM refs
	let canvas: HTMLCanvasElement;
	let container: HTMLDivElement;

	// Matter.js instances
	let engine: Matter.Engine;
	let render: Matter.Render;
	let runner: Matter.Runner;
	let mouse: Matter.Mouse;
	let mouseConstraint: Matter.MouseConstraint;

	// Game state (shared mutable bag passed to modules)
	let gs: GameState = createDefaultGameState(800, 600, false);

	// Component-local state (not shared with modules)
	let allBodies: BlobBody[] = [];
	let constraints: Matter.Constraint[] = [];
	let spaceshipBody: Matter.Body | null = null;
	let hoveredBody: BlobBody | null = null;
	let mouseDownPos: { x: number; y: number } | null = null;
	let tooltipBody: BlobBody | null = null;
	let tooltipConstraint: Matter.Constraint | null = null;
	let isUltrawide = $state(false);
	const DRAG_THRESHOLD = 5;

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
		const length = springLength;
		const stiffness = springStiffness;
		if (constraints.length > 0 && Matter) {
			for (const constraint of constraints) {
				constraint.length = length;
				constraint.stiffness = stiffness * 0.3;
			}
		}
	});

	// ─── Physics Setup ─────────────────────────────────────────────

	function setupPhysics() {
		const currentTagMinUse = isMobile ? CONFIG.TAG_MIN_USE_MOBILE : CONFIG.TAG_MIN_USE_DESKTOP;
		const currentCircleRadius = isMobile ? CONFIG.CIRCLE_RADIUS_MOBILE : CONFIG.CIRCLE_RADIUS_DESKTOP;
		const currentCenterRadius = isMobile ? CONFIG.CENTER_RADIUS_MOBILE : CONFIG.CENTER_RADIUS_DESKTOP;
		const filteredTags = Array.from(tagUsage.entries())
			.filter(([_, data]) => data.count >= currentTagMinUse);

		engine = Matter.Engine.create();
		engine.gravity.y = 0;

		render = Matter.Render.create({
			element: container, canvas, engine,
			options: { width: gs.width, height: gs.height, wireframes: false, background: 'transparent' }
		});

		allBodies = [];
		const postBodies = new Map<string, BlobBody>();
		const tagBodies = new Map<string, BlobBody>();
		constraints = [];

		// Center body
		const centerBody = Matter.Bodies.circle(gs.width / 2, gs.height / 2, currentCenterRadius, {
			isStatic: true, render: { fillStyle: CONFIG.COLORS.center }
		}) as BlobBody;
		centerBody.isCenter = true;

		// Random position helper
		const margin = 60;
		const centerExclusion = currentCenterRadius + 80;
		function randomPosition() {
			let x, y, dist, attempts = 0;
			do {
				x = margin + Math.random() * (gs.width - margin * 2);
				y = margin + Math.random() * (gs.height - margin * 2 - (isMobile ? 0 : 80));
				const dx = x - gs.width / 2;
				const dy = y - gs.height / 2;
				dist = Math.sqrt(dx * dx + dy * dy);
				attempts++;
			} while (dist < centerExclusion && attempts < 50);
			return { x, y };
		}

		// Tag bodies
		for (const [tagName, data] of filteredTags) {
			const { x, y } = randomPosition();
			const body = Matter.Bodies.circle(x, y, currentCircleRadius * 0.8, {
				restitution: CONFIG.RESTITUTION, frictionAir: CONFIG.FRICTION_AIR,
				render: { fillStyle: CONFIG.COLORS.tags }
			}) as BlobBody;
			body.tagData = { name: tagName, uses: data.count };
			body.health = PLANET_MAX_HEALTH;
			body.maxHealth = PLANET_MAX_HEALTH;
			Matter.Body.setVelocity(body, {
				x: (Math.random() - 0.5) * CONFIG.INITIAL_VELOCITY_MAX * 2,
				y: (Math.random() - 0.5) * CONFIG.INITIAL_VELOCITY_MAX * 2
			});
			allBodies.push(body);
			tagBodies.set(tagName, body);
		}

		// Post bodies
		for (const post of allPosts) {
			const { x, y } = randomPosition();
			const body = Matter.Bodies.circle(x, y, currentCircleRadius, {
				restitution: CONFIG.RESTITUTION, frictionAir: CONFIG.FRICTION_AIR,
				render: { fillStyle: CONFIG.COLORS[post.type === 'musing' ? 'musings' : 'projects'] }
			}) as BlobBody;
			body.blobData = { type: post.type, item: post.item };
			body.health = PLANET_MAX_HEALTH;
			body.maxHealth = PLANET_MAX_HEALTH;
			Matter.Body.setVelocity(body, {
				x: (Math.random() - 0.5) * CONFIG.INITIAL_VELOCITY_MAX * 2,
				y: (Math.random() - 0.5) * CONFIG.INITIAL_VELOCITY_MAX * 2
			});
			allBodies.push(body);
			postBodies.set(`${post.type}:${post.item.slug}`, body);
		}

		// Spring constraints
		for (const [tagName, data] of filteredTags) {
			const tagBody = tagBodies.get(tagName)!;
			for (const post of data.posts) {
				const postBody = postBodies.get(`${post.type}:${post.item.slug}`);
				if (postBody) {
					const constraint = Matter.Constraint.create({
						bodyA: tagBody, bodyB: postBody,
						stiffness: springStiffness * 0.3, length: springLength,
						render: { strokeStyle: CONFIG.COLORS.constraint, lineWidth: 1 }
					});
					constraints.push(constraint);
				}
			}
		}

		// Walls (labeled for selective removal)
		const wallThickness = 50;
		const bottomMargin = isMobile ? 0 : 80;
		const walls = [
			Matter.Bodies.rectangle(gs.width / 2, -wallThickness / 2, gs.width, wallThickness,
				{ isStatic: true, label: 'wallTop', render: { visible: false } }),
			Matter.Bodies.rectangle(gs.width / 2, gs.height - bottomMargin + wallThickness / 2, gs.width, wallThickness,
				{ isStatic: true, label: 'wallBottom', render: { visible: false } }),
			Matter.Bodies.rectangle(-wallThickness / 2, gs.height / 2, wallThickness, gs.height,
				{ isStatic: true, label: 'wallLeft', render: { visible: false } }),
			Matter.Bodies.rectangle(gs.width + wallThickness / 2, gs.height / 2, wallThickness, gs.height,
				{ isStatic: true, label: 'wallRight', render: { visible: false } }),
		];

		// Spaceship
		const shipSize = 22;
		const shipVertices = [
			{ x: 0, y: -shipSize * 1.2 }, { x: -shipSize * 0.7, y: shipSize },
			{ x: 0, y: shipSize * 0.6 }, { x: shipSize * 0.7, y: shipSize }
		];
		spaceshipBody = Matter.Bodies.fromVertices(gs.width / 4, gs.height / 4, [shipVertices], {
			restitution: 0.6, frictionAir: 0.02, density: 0.004,
			render: { fillStyle: 'rgba(255, 255, 255, 0.9)', strokeStyle: '#ffffff', lineWidth: 2 }
		});

		// Reset game state
		gs.missiles = [];
		gs.asteroids = [];
		gs.victoryTriggered = false;
		gs.totalPlanets = allBodies.length;
		gs.shipHealth = SHIP_MAX_HEALTH;
		gs.shipDead = false;
		gs.shipEscaped = false;
		gs.centerHealth = CENTER_MAX_HEALTH;
		gs.centerDead = false;
		gs.blackHoleActive = false;
		gs.bigBangTriggered = false;
		gs.escapeGlowIntensity = 0;
		gs.goodbyeTextActive = false;
		gs.typedBuffer = '';

		Matter.Composite.add(engine.world, [centerBody, ...allBodies, ...walls, ...constraints, spaceshipBody]);

		// Mouse interaction
		mouse = Matter.Mouse.create(canvas);
		mouseConstraint = Matter.MouseConstraint.create(engine, {
			mouse, constraint: { stiffness: 0.2, render: { visible: false } }
		});
		Matter.Composite.add(engine.world, mouseConstraint);
		render.mouse = mouse;

		// ─── Rendering (delegates to renderer.ts) ──────────────────
		Matter.Events.on(render, 'afterRender', () => {
			const ctx = render.context;
			renderWorldSpace(ctx, gs, allBodies, spaceshipBody, tooltipBody, hoveredBody, highlightType);
			updateFadingConstraints(gs, constraints, Matter, engine);
			renderScreenSpace(ctx, gs);
		});

		// ─── Mouse Interaction ─────────────────────────────────────
		Matter.Events.on(mouseConstraint, 'mousemove', () => {
			if (gs.shipEscaped) {
				hoveredBody = null;
				canvas.style.cursor = 'default';
				return;
			}
			const mousePos = mouse.position;
			hoveredBody = null;
			const currentRadius = isMobile ? CONFIG.CIRCLE_RADIUS_MOBILE : CONFIG.CIRCLE_RADIUS_DESKTOP;

			if (tooltipBody) {
				const dx = Math.abs(mousePos.x - tooltipBody.position.x);
				const dy = Math.abs(mousePos.y - tooltipBody.position.y);
				if (dx < TOOLTIP_WIDTH / 2 && dy < TOOLTIP_HEIGHT / 2) {
					hoveredBody = tooltipBody;
					canvas.style.cursor = 'pointer';
				}
			}
			if (!hoveredBody) {
				for (const body of allBodies) {
					const dist = Math.hypot(body.position.x - mousePos.x, body.position.y - mousePos.y);
					const bodyRadius = body.tagData ? currentRadius * 0.8 : currentRadius;
					if (dist < bodyRadius + 5) {
						hoveredBody = body;
						canvas.style.cursor = 'pointer';
						break;
					}
				}
			}
			if (!hoveredBody) canvas.style.cursor = 'default';
		});

		Matter.Events.on(mouseConstraint, 'mousedown', () => {
			mouseDownPos = { x: mouse.position.x, y: mouse.position.y };
		});

		Matter.Events.on(mouseConstraint, 'mouseup', () => {
			if (mouseDownPos) {
				const dist = Math.hypot(mouse.position.x - mouseDownPos.x, mouse.position.y - mouseDownPos.y);
				if (dist < DRAG_THRESHOLD) {
					if (tooltipBody && hoveredBody === tooltipBody && tooltipBody.tooltipData) {
						const td = tooltipBody.tooltipData;
						if (td.type === 'tag' && td.tagName) {
							onBlobClick({ type: 'tag', title: td.title, tagName: td.tagName, position: { x: 0, y: 0 } });
						} else if (td.slug) {
							onBlobClick({ type: td.type as 'project' | 'musing', title: td.title, slug: td.slug, position: { x: 0, y: 0 } });
						}
						dismissTooltip();
					} else if (hoveredBody) {
						if (isMobile) {
							if (hoveredBody.blobData) {
								const { type, item } = hoveredBody.blobData;
								onBlobClick({ type, title: item.title, description: item.description, slug: item.slug,
									position: { x: hoveredBody.position.x, y: hoveredBody.position.y } });
							} else if (hoveredBody.tagData) {
								onBlobClick({ type: 'tag', title: `#${hoveredBody.tagData.name}`, tagName: hoveredBody.tagData.name,
									description: `${hoveredBody.tagData.uses} items with this tag`,
									position: { x: hoveredBody.position.x, y: hoveredBody.position.y } });
							}
						} else {
							if (hoveredBody.blobData) {
								const { type, item } = hoveredBody.blobData;
								createTooltip(hoveredBody, { type, title: item.title, description: item.description, slug: item.slug });
							} else if (hoveredBody.tagData) {
								createTooltip(hoveredBody, { type: 'tag', title: `#${hoveredBody.tagData.name}`,
									tagName: hoveredBody.tagData.name, description: `${hoveredBody.tagData.uses} items with this tag` });
							}
						}
					} else {
						dismissTooltip();
						onBlobClick(null);
					}
				}
			}
			mouseDownPos = null;
		});

		// ─── Physics Update Loop (delegates to modules) ────────────
		const bodyPhases = new Map<BlobBody, { phaseX: number; phaseY: number; freqX: number; freqY: number }>();
		for (const body of allBodies) {
			bodyPhases.set(body, {
				phaseX: Math.random() * Math.PI * 2, phaseY: Math.random() * Math.PI * 2,
				freqX: 0.3 + Math.random() * 0.4, freqY: 0.3 + Math.random() * 0.4
			});
		}

		Matter.Events.on(engine, 'beforeUpdate', () => {
			gs.time += 0.016;
			gs.isMobile = isMobile;
			gs.isUltrawide = isUltrawide;

			// Ship respawn
			if (spaceshipBody) updateShipRespawn(Matter, spaceshipBody, gs);

			// Black hole physics (delegates pull, consumption, escape detection)
			updateBlackHole(Matter, engine, gs, allBodies, constraints, spaceshipBody);

			// Big bang check (only fires if ship didn't escape)
			if (checkBigBang(gs)) {
				onCenterDestroyed(false);
				initSimulation();
				return;
			}

			// Ship escaped → hand off to cutscene/game
			if (gs.shipEscaped && !gs.bigBangTriggered) {
				onShipEscaped({ score: gs.score, shipHealth: gs.shipHealth });
				gs.shipEscaped = false; // only fire once
			}

			// Ship controls & missiles
			if (spaceshipBody) {
				updateShipControls(Matter, spaceshipBody, gs);
				wrapShipPosition(Matter, spaceshipBody, gs);
				fireMissiles(Matter, engine, spaceshipBody, gs);
			}

			// Asteroid spawning
			spawnVictoryAsteroids(Matter, engine, gs);
			spawnStormAsteroids(Matter, engine, gs);
			spawnNormalAsteroids(Matter, engine, gs);

			// Cleanup
			cleanupMissiles(Matter, engine, gs);
			cleanupAsteroids(Matter, engine, gs);

			// Radial driving force
			let driveRadial = 0;
			if (driveExcitement > 0 && driveFrequency > 0) {
				const freq = (driveFrequency / 100) * 6 * Math.PI * 2;
				const amplitude = Math.pow(10, (driveExcitement / 100) * 3 - 3) * 0.05;
				driveRadial = Math.sin(gs.time * freq) * amplitude;
			}

			const centerX = gs.width / 2;
			const centerY = gs.height / 2;
			const bMargin = 50;
			const pullStrength = 0.01;

			// Body physics (brownian motion, boundary enforcement, tornado, radial drive)
			for (const body of allBodies) {
				if (body.isStatic) continue;
				const pos = body.position;
				const controlBarTop = gs.height - (isMobile ? 0 : 80);
				let pullX = 0, pullY = 0;

				if (pos.x < -bMargin) pullX = pullStrength;
				if (pos.x > gs.width + bMargin) pullX = -pullStrength;
				if (pos.y < -bMargin) pullY = pullStrength;
				if (pos.y > controlBarTop) {
					const depth = pos.y - controlBarTop;
					pullY = -pullStrength * 5 - depth * 0.001;
					if (depth > 100) {
						Matter.Body.setPosition(body, { x: pos.x, y: controlBarTop - 50 });
						Matter.Body.setVelocity(body, { x: body.velocity.x, y: -3 });
					}
				} else if (pos.y > gs.height + bMargin) {
					pullY = -pullStrength;
				}
				if (pullX !== 0 || pullY !== 0) {
					Matter.Body.applyForce(body, pos, { x: pullX, y: pullY });
				}

				// Lazy phase initialization for bodies created after re-init
				if (!bodyPhases.has(body)) {
					bodyPhases.set(body, {
						phaseX: Math.random() * Math.PI * 2, phaseY: Math.random() * Math.PI * 2,
						freqX: 0.3 + Math.random() * 0.4, freqY: 0.3 + Math.random() * 0.4
					});
				}
				const phases = bodyPhases.get(body)!;

				if (gs.tornadoActive && gs.time < gs.tornadoEndTime) {
					const dx = body.position.x - centerX;
					const dy = body.position.y - centerY;
					const dist = Math.sqrt(dx * dx + dy * dy) || 1;
					const angle = Math.atan2(dy, dx);
					const tangentX = -Math.sin(angle) * 0.002;
					const tangentY = Math.cos(angle) * 0.002;
					const inwardX = -dx / dist * 0.0005;
					const inwardY = -dy / dist * 0.0005;
					Matter.Body.applyForce(body, body.position, {
						x: tangentX + inwardX + (Math.random() - 0.5) * 0.001,
						y: tangentY + inwardY + (Math.random() - 0.5) * 0.001
					});
				} else if (!reducedMotion) {
					const forceX = Math.sin(gs.time * phases.freqX + phases.phaseX) * CONFIG.BROWNIAN_FORCE;
					const forceY = Math.sin(gs.time * phases.freqY + phases.phaseY) * CONFIG.BROWNIAN_FORCE;
					let driveX = 0, driveY = 0;
					if (driveRadial !== 0) {
						const dx = body.position.x - centerX;
						const dy = body.position.y - centerY;
						const dist = Math.sqrt(dx * dx + dy * dy) || 1;
						driveX = (dx / dist) * driveRadial;
						driveY = (dy / dist) * driveRadial;
					}
					Matter.Body.applyForce(body, body.position, { x: forceX + driveX, y: forceY + driveY });
				}
			}

			if (gs.tornadoActive && gs.time >= gs.tornadoEndTime) gs.tornadoActive = false;
		});

		// ─── Collision Handling (delegates to gameplay.ts) ──────────
		Matter.Events.on(engine, 'collisionStart', (event) => {
			handleCollisions(event, Matter, engine, gs, allBodies, constraints, spaceshipBody, {
				onScoreChange, onCenterDestroyed, dismissTooltip, tooltipBody
			});
		});

		runner = Matter.Runner.create();
		Matter.Runner.run(runner, engine);
		Matter.Render.run(render);
	}

	// ─── Component Functions ───────────────────────────────────────

	function handleResize() {
		if (!container) return;
		gs.width = window.innerWidth;
		gs.height = window.innerHeight;
		isUltrawide = gs.width >= 2500;

		if (render) {
			render.canvas.width = gs.width;
			render.canvas.height = gs.height;
			render.options.width = gs.width;
			render.options.height = gs.height;

			const walls = Matter.Composite.allBodies(engine.world)
				.filter(b => b.isStatic && typeof b.label === 'string' && b.label.startsWith('wall'));
			Matter.Composite.remove(engine.world, walls);

			const wallThickness = 50;
			const bottomMargin = isMobile ? 0 : 80;
			const newWalls = [
				Matter.Bodies.rectangle(gs.width / 2, -wallThickness / 2, gs.width, wallThickness,
					{ isStatic: true, label: 'wallTop', render: { visible: false } }),
				Matter.Bodies.rectangle(gs.width / 2, gs.height - bottomMargin + wallThickness / 2, gs.width, wallThickness,
					{ isStatic: true, label: 'wallBottom', render: { visible: false } }),
				Matter.Bodies.rectangle(-wallThickness / 2, gs.height / 2, wallThickness, gs.height,
					{ isStatic: true, label: 'wallLeft', render: { visible: false } }),
				Matter.Bodies.rectangle(gs.width + wallThickness / 2, gs.height / 2, wallThickness, gs.height,
					{ isStatic: true, label: 'wallRight', render: { visible: false } }),
			];
			Matter.Composite.add(engine.world, newWalls);

			const centerBody = Matter.Composite.allBodies(engine.world).find(b => (b as BlobBody).isCenter);
			if (centerBody) Matter.Body.setPosition(centerBody, { x: gs.width / 2, y: gs.height / 2 });
		}
	}

	function initSimulation() {
		if (runner) Matter.Runner.stop(runner);
		if (render) { Matter.Render.stop(render); Matter.Events.off(render); }
		if (engine) { Matter.Events.off(engine); Matter.Engine.clear(engine); }
		if (mouseConstraint) Matter.Events.off(mouseConstraint);

		gs.missiles = [];
		gs.asteroids = [];
		gs.debris = [];
		gs.fadingConstraints = [];
		tooltipBody = null;
		tooltipConstraint = null;
		hoveredBody = null;

		setupPhysics();
	}

	function dismissTooltip() {
		if (tooltipBody && engine) {
			if (tooltipConstraint) {
				Matter.Composite.remove(engine.world, tooltipConstraint);
				tooltipConstraint = null;
			}
			Matter.Composite.remove(engine.world, tooltipBody);
			tooltipBody = null;
		}
	}

	function createTooltip(sourceBody: BlobBody, data: { type: 'project' | 'musing' | 'tag'; title: string; description?: string; slug?: string; tagName?: string }) {
		dismissTooltip();
		const padding = 50;
		let tx = sourceBody.position.x + 60;
		let ty = sourceBody.position.y;
		if (tx + TOOLTIP_WIDTH / 2 > gs.width - padding) {
			tx = sourceBody.position.x - 60 - TOOLTIP_WIDTH / 2;
		}
		ty = Math.max(TOOLTIP_HEIGHT / 2 + padding, Math.min(gs.height - TOOLTIP_HEIGHT / 2 - padding, ty));

		tooltipBody = Matter.Bodies.rectangle(tx, ty, TOOLTIP_WIDTH, TOOLTIP_HEIGHT, {
			density: 0.05, frictionAir: 0.15, restitution: 0.2,
			inertia: Infinity, inverseInertia: 0,
			render: { fillStyle: 'rgba(20, 20, 40, 0.95)', strokeStyle: 'rgba(255, 255, 255, 0.15)', lineWidth: 1 }
		}) as BlobBody;
		tooltipBody.isTooltip = true;
		tooltipBody.tooltipData = { ...data, sourceBody };

		tooltipConstraint = Matter.Constraint.create({
			bodyA: sourceBody, bodyB: tooltipBody,
			length: 80, stiffness: 0.01, damping: 0.1,
			render: { strokeStyle: 'rgba(255, 255, 255, 0.3)', lineWidth: 1.5 }
		});
		Matter.Composite.add(engine.world, [tooltipBody, tooltipConstraint]);
	}

	// ─── Lifecycle ─────────────────────────────────────────────────

	onMount(async () => {
		if (!browser) return;
		Matter = await import('matter-js');

		handleResize();
		setupPhysics();
		window.addEventListener('resize', handleResize);

		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === 'ArrowLeft') gs.keys.left = true;
			if (e.key === 'ArrowRight') gs.keys.right = true;
			if (e.key === 'ArrowUp') { gs.keys.up = true; e.preventDefault(); }
			if (e.key === ' ') { gs.keys.fire = true; e.preventDefault(); }
			if (e.key === 'e' || e.key === 'E') gs.keys.rapidFire = true;
			if (e.key === 'a' || e.key === 'A') gs.keys.asteroidStorm = true;

			// "goodbye" easter egg
			if (handleGoodbyeKeystroke(gs, e.key)) {
				triggerGoodbye(Matter, engine, gs, onCenterDestroyed);
			}
		}

		function handleKeyUp(e: KeyboardEvent) {
			if (e.key === 'ArrowLeft') gs.keys.left = false;
			if (e.key === 'ArrowRight') gs.keys.right = false;
			if (e.key === 'ArrowUp') gs.keys.up = false;
			if (e.key === ' ') gs.keys.fire = false;
			if (e.key === 'e' || e.key === 'E') gs.keys.rapidFire = false;
			if (e.key === 'a' || e.key === 'A') gs.keys.asteroidStorm = false;
		}

		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);

		onSwirlReady(() => {
			rescueStuckBodies(Matter, allBodies, gs);
			gs.tornadoActive = true;
			gs.tornadoEndTime = gs.time + 3;
		});
		onShakeReady(() => {
			rescueStuckBodies(Matter, allBodies, gs);
			for (const body of allBodies) {
				if (body.isStatic) continue;
				Matter.Body.setVelocity(body, {
					x: (Math.random() - 0.5) * 16,
					y: (Math.random() - 0.5) * 16
				});
			}
		});
		onResetReady(() => {
			gs.blackHoleActive = false;
			gs.bigBangTriggered = false;
			gs.centerDead = false;
			gs.victoryTriggered = false;
			gs.shipEscaped = false;
			gs.escapeGlowIntensity = 0;
			onCenterDestroyed(false);
			initSimulation();
		});

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
		};
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
