// Effects: debris, explosions, black hole physics, big bang, victory, goodbye easter egg

import {
	CONFIG, SHIP_MAX_HEALTH, SHIP_RESPAWN_DELAY, GOODBYE_SEQUENCE,
	type BlobBody, type GameState
} from './types';

type MatterType = typeof import('matter-js');

// ─── Debris Helpers ────────────────────────────────────────────────

export function explodeMissile(
	state: GameState,
	pos: { x: number; y: number },
	vel: { x: number; y: number }
) {
	const count = 4 + Math.floor(Math.random() * 3);
	for (let d = 0; d < count; d++) {
		const angle = (d / count) * Math.PI * 2 + Math.random() * 0.5;
		const speed = 1 + Math.random() * 2.5;
		state.debris.push({
			x: pos.x, y: pos.y,
			vx: vel.x * 0.3 + Math.cos(angle) * speed,
			vy: vel.y * 0.3 + Math.sin(angle) * speed,
			size: 1 + Math.random() * 2,
			color: '#ff6644',
			born: state.time,
			lifespan: 0.3 + Math.random() * 0.4
		});
	}
}

export function spawnPlanetDebris(state: GameState, planet: BlobBody) {
	const pos = planet.position;
	const color = planet.blobData
		? (planet.blobData.type === 'project' ? CONFIG.COLORS.projects : CONFIG.COLORS.musings)
		: CONFIG.COLORS.tags;

	const numDebris = 8 + Math.floor(Math.random() * 6);
	for (let d = 0; d < numDebris; d++) {
		const angle = (d / numDebris) * Math.PI * 2 + Math.random() * 0.5;
		const speed = 2 + Math.random() * 4;
		state.debris.push({
			x: pos.x, y: pos.y,
			vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
			size: 2 + Math.random() * 4, color,
			born: state.time, lifespan: 1.5 * (0.5 + Math.random() * 0.5)
		});
	}
}

export function spawnAsteroidDebris(
	state: GameState,
	pos: { x: number; y: number },
	vel: { x: number; y: number }
) {
	const numDebris = 6 + Math.floor(Math.random() * 5);
	for (let d = 0; d < numDebris; d++) {
		const angle = (d / numDebris) * Math.PI * 2 + Math.random() * 0.5;
		const speed = 1.5 + Math.random() * 3;
		state.debris.push({
			x: pos.x, y: pos.y,
			vx: vel.x * 0.5 + Math.cos(angle) * speed,
			vy: vel.y * 0.5 + Math.sin(angle) * speed,
			size: 2 + Math.random() * 5,
			color: 'rgba(160, 140, 110, 0.8)',
			born: state.time, lifespan: 1.5 * (0.4 + Math.random() * 0.4)
		});
	}
}

// ─── Ship Respawn ──────────────────────────────────────────────────

export function updateShipRespawn(
	Matter: MatterType,
	spaceshipBody: Matter.Body,
	state: GameState
) {
	if (!state.shipDead || state.time < state.shipRespawnTime) return;

	state.shipDead = false;
	state.shipHealth = SHIP_MAX_HEALTH;
	Matter.Body.setPosition(spaceshipBody, { x: state.width / 4, y: state.height / 4 });
	Matter.Body.setVelocity(spaceshipBody, { x: 0, y: 0 });
	Matter.Body.setAngle(spaceshipBody, 0);
}

// ─── Black Hole ────────────────────────────────────────────────────

export function updateBlackHole(
	Matter: MatterType,
	engine: Matter.Engine,
	state: GameState,
	allBodies: BlobBody[],
	constraints: Matter.Constraint[],
	spaceshipBody: Matter.Body | null
) {
	if (!state.blackHoleActive) return;

	const bhElapsed = state.time - state.blackHoleTime;
	state.blackHoleRadius = Math.min(80, 5 + bhElapsed * 15);
	const bhStrength = 0.0008 + bhElapsed * 0.0003;
	const centerX = state.width / 2;
	const centerY = state.height / 2;

	// Remove right wall so ship can escape (once, early in black hole)
	if (bhElapsed < 0.1) {
		const rightWall = Matter.Composite.allBodies(engine.world)
			.find(b => b.label === 'wallRight');
		if (rightWall) Matter.Composite.remove(engine.world, rightWall);
	}

	// Escape glow intensity ramps up
	if (!state.shipEscaped) {
		state.escapeGlowIntensity = Math.min(1, state.escapeGlowIntensity + 0.01);
	}

	// Pull all bodies toward center
	const bodiesToConsume: BlobBody[] = [];
	for (const body of allBodies) {
		if (body.isStatic) continue;
		const dx = centerX - body.position.x;
		const dy = centerY - body.position.y;
		const dist = Math.sqrt(dx * dx + dy * dy) || 1;
		if (dist < state.blackHoleRadius) {
			bodiesToConsume.push(body);
		} else {
			const force = bhStrength / Math.max(dist * 0.01, 0.5);
			Matter.Body.applyForce(body, body.position, {
				x: (dx / dist) * force, y: (dy / dist) * force
			});
		}
	}

	// Consume bodies
	for (const body of bodiesToConsume) {
		const pos = body.position;
		const color = body.blobData
			? (body.blobData.type === 'project' ? CONFIG.COLORS.projects : CONFIG.COLORS.musings)
			: CONFIG.COLORS.tags;
		for (let d = 0; d < 3; d++) {
			const angle = Math.random() * Math.PI * 2;
			state.debris.push({
				x: pos.x, y: pos.y,
				vx: Math.cos(angle) * 1, vy: Math.sin(angle) * 1,
				size: 1 + Math.random() * 2, color,
				born: state.time, lifespan: 0.3
			});
		}
		for (const constraint of constraints) {
			if (constraint.bodyA === body || constraint.bodyB === body) {
				state.fadingConstraints.push({ constraint, startTime: state.time, duration: 0.5 });
			}
		}
		const idx = allBodies.indexOf(body);
		if (idx !== -1) allBodies.splice(idx, 1);
		Matter.Composite.remove(engine.world, body);
	}

	// Pull ship toward black hole (don't pull if already escaped)
	if (spaceshipBody && !state.shipDead && !state.shipEscaped) {
		const dx = centerX - spaceshipBody.position.x;
		const dy = centerY - spaceshipBody.position.y;
		const dist = Math.sqrt(dx * dx + dy * dy) || 1;
		const shipPull = bhStrength * 1.5 / Math.max(dist * 0.01, 0.5);
		Matter.Body.applyForce(spaceshipBody, spaceshipBody.position, {
			x: (dx / dist) * shipPull, y: (dy / dist) * shipPull
		});
		if (dist < state.blackHoleRadius * 0.7) {
			state.shipDead = true;
			state.shipRespawnTime = Infinity;
			const sp = spaceshipBody.position;
			for (let d = 0; d < 8; d++) {
				const angle = (d / 8) * Math.PI * 2;
				state.debris.push({
					x: sp.x, y: sp.y,
					vx: Math.cos(angle) * 1, vy: Math.sin(angle) * 1,
					size: 1.5, color: '#ffffff',
					born: state.time, lifespan: 0.4
				});
			}
			Matter.Body.setPosition(spaceshipBody, { x: -9999, y: -9999 });
			Matter.Body.setVelocity(spaceshipBody, { x: 0, y: 0 });
		}
	}

	// Pull asteroids
	for (const ast of state.asteroids) {
		const dx = centerX - ast.body.position.x;
		const dy = centerY - ast.body.position.y;
		const dist = Math.sqrt(dx * dx + dy * dy) || 1;
		const astPull = bhStrength / Math.max(dist * 0.01, 0.5);
		Matter.Body.applyForce(ast.body, ast.body.position, {
			x: (dx / dist) * astPull, y: (dy / dist) * astPull
		});
		if (dist < state.blackHoleRadius) {
			Matter.Composite.remove(engine.world, ast.body);
			state.asteroids.splice(state.asteroids.indexOf(ast), 1);
		}
	}

	// Check escape (ship flew right past screen edge → cutscene handoff)
	if (!state.shipEscaped && spaceshipBody && !state.shipDead) {
		if (spaceshipBody.position.x > state.width + 50) {
			state.shipEscaped = true;
		}
	}

	// Big bang check (only if ship didn't escape — escaped ship means cutscene, not reset)
	const everythingGone = allBodies.length === 0 && (state.shipDead || !spaceshipBody || state.shipEscaped);
	if (everythingGone && bhElapsed > 2 && !state.bigBangTriggered && !state.shipEscaped) {
		state.bigBangTriggered = true;
		state.bigBangTime = state.time;
	}
}

// ─── Big Bang ──────────────────────────────────────────────────────

/** Returns true if big bang fired and simulation should re-init */
export function checkBigBang(state: GameState): boolean {
	if (!state.bigBangTriggered) return false;
	if (state.time - state.bigBangTime <= 2) return false;

	const centerX = state.width / 2;
	const centerY = state.height / 2;
	const colors = ['#ff4444', '#44ff44', '#4488ff', '#ffaa00', '#ff44ff', '#44ffff', '#ffffff',
		CONFIG.COLORS.projects, CONFIG.COLORS.musings];

	for (let d = 0; d < 60; d++) {
		const angle = (d / 60) * Math.PI * 2 + Math.random() * 0.2;
		const speed = 3 + Math.random() * 8;
		state.debris.push({
			x: centerX, y: centerY,
			vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
			size: 2 + Math.random() * 5,
			color: colors[Math.floor(Math.random() * colors.length)],
			born: state.time, lifespan: 2 + Math.random() * 2
		});
	}

	state.blackHoleActive = false;
	state.bigBangTriggered = false;
	state.centerDead = false;
	state.victoryTriggered = false;
	return true; // Signal: caller should re-init simulation
}

// ─── Rescue Stuck Bodies ───────────────────────────────────────────

export function rescueStuckBodies(
	Matter: MatterType,
	allBodies: BlobBody[],
	state: GameState
) {
	const controlBarTop = state.height - (state.isMobile ? 0 : 80);
	for (const body of allBodies) {
		if (body.isStatic) continue;
		const pos = body.position;
		if (pos.x < 0 || pos.x > state.width || pos.y < 0 || pos.y > controlBarTop) {
			const safeX = state.width * 0.3 + Math.random() * state.width * 0.4;
			const safeY = state.height * 0.2 + Math.random() * state.height * 0.4;
			Matter.Body.setPosition(body, { x: safeX, y: safeY });
			Matter.Body.setVelocity(body, { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 });
		}
	}
}

// ─── Goodbye Easter Egg ────────────────────────────────────────────

export function handleGoodbyeKeystroke(state: GameState, key: string): boolean {
	if (key.length !== 1 || !/[a-z]/i.test(key)) return false;

	state.typedBuffer += key.toLowerCase();
	if (state.typedBuffer.length > GOODBYE_SEQUENCE.length) {
		state.typedBuffer = state.typedBuffer.slice(-GOODBYE_SEQUENCE.length);
	}

	return state.typedBuffer === GOODBYE_SEQUENCE;
}

export function triggerGoodbye(
	Matter: MatterType,
	engine: Matter.Engine,
	state: GameState,
	onCenterDestroyed: (dead: boolean) => void
) {
	if (state.centerDead || state.blackHoleActive) return;

	state.centerDead = true;
	state.centerHealth = 0;
	state.blackHoleActive = true;
	state.blackHoleTime = state.time;
	state.blackHoleRadius = 5;
	state.goodbyeTextActive = true;
	state.goodbyeTextTime = state.time;
	state.typedBuffer = '';
	onCenterDestroyed(true);

	const centerBody = Matter.Composite.allBodies(engine.world)
		.find(b => (b as BlobBody).isCenter);
	if (centerBody) {
		Matter.Composite.remove(engine.world, centerBody);
	}

	// Burst of debris
	for (let d = 0; d < 20; d++) {
		const angle = (d / 20) * Math.PI * 2;
		const speed = 3 + Math.random() * 5;
		state.debris.push({
			x: state.width / 2, y: state.height / 2,
			vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
			size: 2 + Math.random() * 4, color: '#ffffff',
			born: state.time, lifespan: 1.5 + Math.random()
		});
	}
}
