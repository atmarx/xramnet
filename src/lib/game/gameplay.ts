// Ship controls, missiles, asteroids, and collision handling

import {
	CONFIG,
	MISSILE_COOLDOWN, MISSILE_COOLDOWN_RAPID, MISSILE_LIFESPAN,
	ASTEROID_INTERVAL, MAX_ASTEROIDS,
	PLANET_MAX_HEALTH, DEBRIS_LIFESPAN, SHIP_MAX_HEALTH, SHIP_RESPAWN_DELAY,
	CENTER_MAX_HEALTH,
	type BlobBody, type GameState, type MissileData, type AsteroidData
} from './types';
import { explodeMissile, spawnPlanetDebris, spawnAsteroidDebris } from './effects';

type MatterType = typeof import('matter-js');

// ─── Ship Controls ─────────────────────────────────────────────────

export function updateShipControls(
	Matter: MatterType,
	spaceshipBody: Matter.Body,
	state: GameState
) {
	if (state.shipDead) return;

	const thrust = 0.003;
	const rotationSpeed = 0.06;

	if (state.keys.left) {
		Matter.Body.setAngularVelocity(spaceshipBody, -rotationSpeed);
	} else if (state.keys.right) {
		Matter.Body.setAngularVelocity(spaceshipBody, rotationSpeed);
	} else {
		Matter.Body.setAngularVelocity(spaceshipBody, spaceshipBody.angularVelocity * 0.9);
	}

	if (state.keys.up) {
		const angle = spaceshipBody.angle;
		const force = {
			x: Math.sin(angle) * thrust,
			y: -Math.cos(angle) * thrust
		};
		Matter.Body.applyForce(spaceshipBody, spaceshipBody.position, force);
	}
}

export function wrapShipPosition(
	Matter: MatterType,
	spaceshipBody: Matter.Body,
	state: GameState
) {
	if (state.shipDead) return;

	const pos = spaceshipBody.position;
	const bottomMargin = state.isMobile ? 0 : 80;

	// Wrap left edge always
	if (pos.x < 0) Matter.Body.setPosition(spaceshipBody, { x: state.width, y: pos.y });
	// Wrap right edge only when NOT escaping (black hole removes right wall)
	else if (pos.x > state.width && !state.blackHoleActive) Matter.Body.setPosition(spaceshipBody, { x: 0, y: pos.y });
	// Wrap vertical
	if (pos.y < 0) Matter.Body.setPosition(spaceshipBody, { x: pos.x, y: state.height - bottomMargin });
	else if (pos.y > state.height - bottomMargin) Matter.Body.setPosition(spaceshipBody, { x: pos.x, y: 0 });
}

// ─── Missiles ──────────────────────────────────────────────────────

export function fireMissiles(
	Matter: MatterType,
	engine: Matter.Engine,
	spaceshipBody: Matter.Body,
	state: GameState
) {
	if (state.shipDead || !state.keys.fire) return;

	const cooldown = state.keys.rapidFire ? MISSILE_COOLDOWN_RAPID : MISSILE_COOLDOWN;
	if (state.time - state.lastMissileTime <= cooldown) return;

	state.lastMissileTime = state.time;
	const pos = spaceshipBody.position;
	const angle = spaceshipBody.angle + (state.keys.rapidFire ? (Math.random() - 0.5) * 0.15 : 0);
	const noseX = pos.x + Math.sin(spaceshipBody.angle) * 28;
	const noseY = pos.y - Math.cos(spaceshipBody.angle) * 28;
	const speed = 12;

	const missile = Matter.Bodies.circle(noseX, noseY, 4, {
		restitution: 0.9,
		frictionAir: 0,
		density: 0.015,
		render: { fillStyle: '#ff6644' }
	});

	Matter.Body.setVelocity(missile, {
		x: Math.sin(angle) * speed + (spaceshipBody.velocity?.x || 0) * 0.3,
		y: -Math.cos(angle) * speed + (spaceshipBody.velocity?.y || 0) * 0.3
	});

	Matter.Composite.add(engine.world, missile);
	state.missiles.push({ body: missile, born: state.time });
}

export function cleanupMissiles(
	Matter: MatterType,
	engine: Matter.Engine,
	state: GameState
) {
	for (let i = state.missiles.length - 1; i >= 0; i--) {
		const m = state.missiles[i];
		const pos = m.body.position;
		const offScreen = pos.x < -50 || pos.x > state.width + 50 ||
			pos.y < -50 || pos.y > state.height + 50;
		if (state.time - m.born > MISSILE_LIFESPAN || offScreen) {
			if (!offScreen) explodeMissile(state, pos, m.body.velocity);
			Matter.Composite.remove(engine.world, m.body);
			state.missiles.splice(i, 1);
		}
	}
}

// ─── Asteroids ─────────────────────────────────────────────────────

function createAsteroid(
	Matter: MatterType,
	engine: Matter.Engine,
	state: GameState,
	size: number,
	ax: number, ay: number,
	avx: number, avy: number
) {
	const asteroid = Matter.Bodies.circle(ax, ay, size * 0.5, {
		restitution: 0.4,
		frictionAir: 0,
		density: 0.002,
		render: {
			fillStyle: 'rgba(120, 100, 80, 0.7)',
			strokeStyle: 'rgba(160, 140, 110, 0.5)',
			lineWidth: 1
		}
	} as Matter.IBodyDefinition);

	Matter.Body.setVelocity(asteroid, { x: avx, y: avy });
	Matter.Body.setAngularVelocity(asteroid, (Math.random() - 0.5) * 0.04);
	Matter.Composite.add(engine.world, asteroid);
	state.asteroids.push({ body: asteroid, born: state.time });
}

function randomEdgeSpawn(state: GameState, size: number, driftSpeed: number) {
	const edge = Math.floor(Math.random() * 3);
	let ax: number, ay: number, avx: number, avy: number;

	if (edge === 0) { // top
		ax = Math.random() * state.width; ay = -size;
		avx = (Math.random() - 0.5) * driftSpeed; avy = driftSpeed;
	} else if (edge === 1) { // left
		ax = -size; ay = Math.random() * state.height * 0.7;
		avx = driftSpeed; avy = (Math.random() - 0.5) * driftSpeed;
	} else { // right
		ax = state.width + size; ay = Math.random() * state.height * 0.7;
		avx = -driftSpeed; avy = (Math.random() - 0.5) * driftSpeed;
	}
	return { ax, ay, avx, avy };
}

export function spawnNormalAsteroids(
	Matter: MatterType,
	engine: Matter.Engine,
	state: GameState
) {
	if (state.victoryTriggered || state.blackHoleActive) return;
	if (state.time - state.lastAsteroidTime <= ASTEROID_INTERVAL) return;
	if (state.asteroids.length >= MAX_ASTEROIDS) return;

	state.lastAsteroidTime = state.time;
	const size = 35 + Math.random() * 45;
	const driftSpeed = 0.5 + Math.random() * 1;

	// Use fromVertices for normal asteroids (irregular shapes)
	const edge = Math.floor(Math.random() * 3);
	let ax: number, ay: number, avx: number, avy: number;

	if (edge === 0) {
		ax = Math.random() * state.width; ay = -size;
		avx = (Math.random() - 0.5) * driftSpeed; avy = driftSpeed;
	} else if (edge === 1) {
		ax = -size; ay = Math.random() * state.height * 0.8;
		avx = driftSpeed; avy = (Math.random() - 0.5) * driftSpeed;
	} else {
		ax = state.width + size; ay = Math.random() * state.height * 0.8;
		avx = -driftSpeed; avy = (Math.random() - 0.5) * driftSpeed;
	}

	const numVertices = 6 + Math.floor(Math.random() * 4);
	const asteroidVerts = [];
	for (let v = 0; v < numVertices; v++) {
		const vAngle = (v / numVertices) * Math.PI * 2;
		const r = size * (0.6 + Math.random() * 0.4);
		asteroidVerts.push({ x: Math.cos(vAngle) * r, y: Math.sin(vAngle) * r });
	}

	const asteroid = Matter.Bodies.fromVertices(ax, ay, [asteroidVerts], {
		restitution: 0.4,
		frictionAir: 0,
		density: 0.002,
		render: {
			fillStyle: 'rgba(120, 100, 80, 0.7)',
			strokeStyle: 'rgba(160, 140, 110, 0.5)',
			lineWidth: 1
		}
	});

	if (asteroid) {
		Matter.Body.setVelocity(asteroid, { x: avx, y: avy });
		Matter.Body.setAngularVelocity(asteroid, (Math.random() - 0.5) * 0.02);
		Matter.Composite.add(engine.world, asteroid);
		state.asteroids.push({ body: asteroid, born: state.time });
	}
}

export function spawnVictoryAsteroids(
	Matter: MatterType,
	engine: Matter.Engine,
	state: GameState
) {
	if (!state.victoryTriggered || state.blackHoleActive) return;

	const elapsed = state.time - state.victoryTime;

	// Firework bursts for the first 6 seconds
	if (elapsed < 6 && Math.random() < 0.2) {
		const fx = Math.random() * state.width;
		const fy = Math.random() * state.height * 0.6;
		const colors = ['#ff4444', '#44ff44', '#4488ff', '#ffaa00', '#ff44ff', '#44ffff', '#ffffff'];
		const burstColor = colors[Math.floor(Math.random() * colors.length)];
		const numSparks = 15 + Math.floor(Math.random() * 15);
		for (let s = 0; s < numSparks; s++) {
			const angle = (s / numSparks) * Math.PI * 2 + Math.random() * 0.3;
			const speed = 2 + Math.random() * 5;
			state.debris.push({
				x: fx, y: fy,
				vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 1,
				size: 1.5 + Math.random() * 3, color: burstColor,
				born: state.time, lifespan: 1.0 + Math.random() * 1.5
			});
		}
	}

	// Meteor shower
	if (elapsed > 0.3) {
		const spawnCount = Math.random() < 0.7 ? (1 + Math.floor(Math.random() * 2)) : 0;
		for (let sp = 0; sp < spawnCount && state.asteroids.length < 40; sp++) {
			const size = 20 + Math.random() * 50;
			const driftSpeed = 2 + Math.random() * 4;
			const { ax, ay, avx, avy } = randomEdgeSpawn(state, size, driftSpeed);
			createAsteroid(Matter, engine, state, size, ax, ay, avx, avy);
		}
	}
}

export function spawnStormAsteroids(
	Matter: MatterType,
	engine: Matter.Engine,
	state: GameState
) {
	if (!state.keys.asteroidStorm || state.victoryTriggered || state.blackHoleActive) return;

	const stormCount = Math.random() < 0.7 ? (1 + Math.floor(Math.random() * 2)) : 0;
	for (let sp = 0; sp < stormCount && state.asteroids.length < 40; sp++) {
		const size = 20 + Math.random() * 50;
		const driftSpeed = 2 + Math.random() * 4;
		const { ax, ay, avx, avy } = randomEdgeSpawn(state, size, driftSpeed);
		createAsteroid(Matter, engine, state, size, ax, ay, avx, avy);
	}
}

export function cleanupAsteroids(
	Matter: MatterType,
	engine: Matter.Engine,
	state: GameState
) {
	const offMargin = 200;
	for (let i = state.asteroids.length - 1; i >= 0; i--) {
		const ap = state.asteroids[i].body.position;
		if (ap.x < -offMargin || ap.x > state.width + offMargin ||
			ap.y < -offMargin || ap.y > state.height + offMargin) {
			Matter.Composite.remove(engine.world, state.asteroids[i].body);
			state.asteroids.splice(i, 1);
		}
	}
}

// ─── Collision Handling ────────────────────────────────────────────

export function handleCollisions(
	event: Matter.IEventCollision<Matter.Engine>,
	Matter: MatterType,
	engine: Matter.Engine,
	state: GameState,
	allBodies: BlobBody[],
	constraints: Matter.Constraint[],
	spaceshipBody: Matter.Body | null,
	callbacks: {
		onScoreChange: (score: number) => void;
		onCenterDestroyed: (dead: boolean) => void;
		dismissTooltip: () => void;
		tooltipBody: BlobBody | null;
	}
) {
	for (const pair of event.pairs) {
		// Missile vs planet
		handleMissilePlanetCollision(pair, Matter, engine, state, allBodies, constraints, callbacks);
		// Missile vs asteroid
		handleMissileAsteroidCollision(pair, Matter, engine, state);
		// Ship vs asteroid
		handleShipAsteroidCollision(pair, Matter, engine, state, spaceshipBody);
		// Center box collisions
		handleCenterCollisions(pair, Matter, engine, state, callbacks);
	}
}

function handleMissilePlanetCollision(
	pair: Matter.IPair,
	Matter: MatterType,
	engine: Matter.Engine,
	state: GameState,
	allBodies: BlobBody[],
	constraints: Matter.Constraint[],
	callbacks: {
		onScoreChange: (score: number) => void;
		dismissTooltip: () => void;
		tooltipBody: BlobBody | null;
	}
) {
	let missile: MissileData | undefined;
	let planet: BlobBody | undefined;

	const missileA = state.missiles.find(m => m.body === pair.bodyA);
	const missileB = state.missiles.find(m => m.body === pair.bodyB);

	if (missileA && (pair.bodyB as BlobBody).health !== undefined) {
		missile = missileA; planet = pair.bodyB as BlobBody;
	} else if (missileB && (pair.bodyA as BlobBody).health !== undefined) {
		missile = missileB; planet = pair.bodyA as BlobBody;
	}

	if (!missile || !planet || planet.health === undefined || planet.health <= 0) return;

	planet.health--;
	explodeMissile(state, missile.body.position, missile.body.velocity);
	Matter.Composite.remove(engine.world, missile.body);
	state.missiles.splice(state.missiles.indexOf(missile), 1);

	if (planet.health <= 0) {
		spawnPlanetDebris(state, planet);

		// Fade connected constraints
		for (const constraint of constraints) {
			if (constraint.bodyA === planet || constraint.bodyB === planet) {
				state.fadingConstraints.push({ constraint, startTime: state.time, duration: 1.0 });
			}
		}

		const idx = allBodies.indexOf(planet);
		if (idx !== -1) allBodies.splice(idx, 1);
		Matter.Composite.remove(engine.world, planet);
		state.score += 100;
		callbacks.onScoreChange(state.score);

		if (callbacks.tooltipBody?.tooltipData?.sourceBody === planet) {
			callbacks.dismissTooltip();
		}

		if (allBodies.length === 0 && !state.victoryTriggered) {
			state.victoryTriggered = true;
			state.victoryTime = state.time;
		}
	}
}

function handleMissileAsteroidCollision(
	pair: Matter.IPair,
	Matter: MatterType,
	engine: Matter.Engine,
	state: GameState
) {
	let hitMissile: MissileData | undefined;
	let hitAsteroid: AsteroidData | undefined;

	const mA = state.missiles.find(m => m.body === pair.bodyA);
	const mB = state.missiles.find(m => m.body === pair.bodyB);
	const aA = state.asteroids.find(a => a.body === pair.bodyA);
	const aB = state.asteroids.find(a => a.body === pair.bodyB);

	if (mA && aB) { hitMissile = mA; hitAsteroid = aB; }
	else if (mB && aA) { hitMissile = mB; hitAsteroid = aA; }

	if (!hitMissile || !hitAsteroid) return;

	explodeMissile(state, hitMissile.body.position, hitMissile.body.velocity);
	Matter.Composite.remove(engine.world, hitMissile.body);
	state.missiles.splice(state.missiles.indexOf(hitMissile), 1);

	spawnAsteroidDebris(state, hitAsteroid.body.position, hitAsteroid.body.velocity);
	Matter.Composite.remove(engine.world, hitAsteroid.body);
	state.asteroids.splice(state.asteroids.indexOf(hitAsteroid), 1);
	state.score += 25;
}

function handleShipAsteroidCollision(
	pair: Matter.IPair,
	Matter: MatterType,
	engine: Matter.Engine,
	state: GameState,
	spaceshipBody: Matter.Body | null
) {
	if (!spaceshipBody || state.shipDead) return;

	const asteroidHit = (pair.bodyA === spaceshipBody)
		? state.asteroids.find(a => a.body === pair.bodyB)
		: (pair.bodyB === spaceshipBody)
			? state.asteroids.find(a => a.body === pair.bodyA)
			: undefined;

	if (!asteroidHit) return;

	state.shipHealth--;
	Matter.Composite.remove(engine.world, asteroidHit.body);
	state.asteroids.splice(state.asteroids.indexOf(asteroidHit), 1);

	// Rocky debris
	const ap = asteroidHit.body.position;
	for (let d = 0; d < 5; d++) {
		const angle = Math.random() * Math.PI * 2;
		state.debris.push({
			x: ap.x, y: ap.y,
			vx: Math.cos(angle) * 2, vy: Math.sin(angle) * 2,
			size: 2 + Math.random() * 3, color: 'rgba(160, 140, 110, 0.8)',
			born: state.time, lifespan: 0.5 + Math.random() * 0.5
		});
	}

	if (state.shipHealth <= 0) {
		state.shipDead = true;
		state.shipRespawnTime = state.time + SHIP_RESPAWN_DELAY;
		const sp = spaceshipBody.position;
		for (let d = 0; d < 10; d++) {
			const angle = (d / 10) * Math.PI * 2 + Math.random() * 0.3;
			const speed = 2 + Math.random() * 4;
			state.debris.push({
				x: sp.x, y: sp.y,
				vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
				size: 1.5 + Math.random() * 3, color: '#ffffff',
				born: state.time, lifespan: 1.0 + Math.random() * 0.5
			});
		}
		Matter.Body.setPosition(spaceshipBody, { x: -9999, y: -9999 });
		Matter.Body.setVelocity(spaceshipBody, { x: 0, y: 0 });
	}
}

function handleCenterCollisions(
	pair: Matter.IPair,
	Matter: MatterType,
	engine: Matter.Engine,
	state: GameState,
	callbacks: { onCenterDestroyed: (dead: boolean) => void }
) {
	if (state.centerDead) return;

	const centerBody = Matter.Composite.allBodies(engine.world)
		.find(b => (b as BlobBody).isCenter) as BlobBody | undefined;
	if (!centerBody) return;

	const isCenterA = (pair.bodyA as BlobBody).isCenter;
	const isCenterB = (pair.bodyB as BlobBody).isCenter;
	const other = isCenterA ? pair.bodyB : isCenterB ? pair.bodyA : null;
	if (!other || (!isCenterA && !isCenterB)) return;

	const hitByMissile = state.missiles.find(m => m.body === other);
	const hitByAsteroid = state.asteroids.find(a => a.body === other);

	if (hitByMissile) {
		state.centerHealth--;
		explodeMissile(state, hitByMissile.body.position, hitByMissile.body.velocity);
		Matter.Composite.remove(engine.world, hitByMissile.body);
		state.missiles.splice(state.missiles.indexOf(hitByMissile), 1);
	}
	if (hitByAsteroid) {
		state.centerHealth -= 2;
		Matter.Composite.remove(engine.world, hitByAsteroid.body);
		state.asteroids.splice(state.asteroids.indexOf(hitByAsteroid), 1);
		const ap2 = other.position;
		for (let d = 0; d < 5; d++) {
			const angle = Math.random() * Math.PI * 2;
			state.debris.push({
				x: ap2.x, y: ap2.y,
				vx: Math.cos(angle) * 2, vy: Math.sin(angle) * 2,
				size: 2 + Math.random() * 3, color: 'rgba(160, 140, 110, 0.8)',
				born: state.time, lifespan: 0.5 + Math.random() * 0.5
			});
		}
	}

	if (state.centerHealth <= 0 && !state.centerDead) {
		state.centerDead = true;
		state.blackHoleActive = true;
		state.blackHoleTime = state.time;
		state.blackHoleRadius = 5;
		callbacks.onCenterDestroyed(true);
		Matter.Composite.remove(engine.world, centerBody);
	}
}
