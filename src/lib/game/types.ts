// Shared types, interfaces, and constants for the physics playground game

import type Matter from 'matter-js';

// ─── Body Extensions ───────────────────────────────────────────────

export interface BlobBody extends Matter.Body {
	blobData?: {
		type: 'musing' | 'project';
		item: ContentItemRef;
	};
	tagData?: {
		name: string;
		uses: number;
	};
	isCenter?: boolean;
	isTooltip?: boolean;
	tooltipData?: TooltipData;
	health?: number;
	maxHealth?: number;
}

export interface ContentItemRef {
	title: string;
	description?: string;
	slug: string;
	tags: string[];
}

export interface TooltipData {
	type: 'project' | 'musing' | 'tag';
	title: string;
	description?: string;
	slug?: string;
	tagName?: string;
	sourceBody: BlobBody;
}

export interface BlobClickData {
	type: 'project' | 'musing' | 'tag';
	title: string;
	description?: string;
	slug?: string;
	tagName?: string;
	position: { x: number; y: number };
}

// ─── Game Objects ──────────────────────────────────────────────────

export interface Debris {
	x: number;
	y: number;
	vx: number;
	vy: number;
	size: number;
	color: string;
	born: number;
	lifespan: number;
}

export interface FadingConstraint {
	constraint: Matter.Constraint;
	startTime: number;
	duration: number;
}

export interface MissileData {
	body: Matter.Body;
	born: number;
}

export interface AsteroidData {
	body: Matter.Body;
	born: number;
}

export interface Keys {
	left: boolean;
	right: boolean;
	up: boolean;
	fire: boolean;
	rapidFire: boolean;
	asteroidStorm: boolean;
}

// ─── Game State ────────────────────────────────────────────────────

export interface GameState {
	time: number;
	width: number;
	height: number;
	isMobile: boolean;
	isUltrawide: boolean;

	// Ship
	shipHealth: number;
	shipDead: boolean;
	shipRespawnTime: number;
	shipEscaped: boolean;
	keys: Keys;

	// Weapons & hazards
	missiles: MissileData[];
	asteroids: AsteroidData[];
	lastMissileTime: number;
	lastAsteroidTime: number;

	// Effects
	debris: Debris[];
	fadingConstraints: FadingConstraint[];
	tornadoActive: boolean;
	tornadoEndTime: number;

	// Game events
	victoryTriggered: boolean;
	victoryTime: number;
	totalPlanets: number;
	centerHealth: number;
	centerDead: boolean;
	blackHoleActive: boolean;
	blackHoleTime: number;
	blackHoleRadius: number;
	bigBangTriggered: boolean;
	bigBangTime: number;
	score: number;

	// Easter eggs
	goodbyeTextActive: boolean;
	goodbyeTextTime: number;
	typedBuffer: string;

	// Escape glow (right edge, Loom-style blue)
	escapeGlowIntensity: number;
}

// ─── Config ────────────────────────────────────────────────────────

export const CONFIG = {
	CIRCLE_RADIUS_DESKTOP: 28,
	CIRCLE_RADIUS_ULTRAWIDE: 38,
	CIRCLE_RADIUS_MOBILE: 14,
	CENTER_RADIUS_DESKTOP: 130,
	CENTER_RADIUS_MOBILE: 90,
	TAG_MIN_USE_DESKTOP: 1,
	TAG_MIN_USE_MOBILE: 2,
	FRICTION_AIR: 0.08,
	RESTITUTION: 0.3,
	INITIAL_VELOCITY_MAX: 2,
	BROWNIAN_FORCE: 0.00008,
	COLORS: {
		musings: 'rgb(107, 159, 255)',
		projects: 'rgb(100, 200, 150)',
		tags: 'rgb(100, 100, 100)',
		center: 'rgba(26, 26, 46, 0.01)',
		constraint: 'rgba(136, 136, 136, 0.2)',
	}
} as const;

// ─── Game Constants ────────────────────────────────────────────────

export const MISSILE_COOLDOWN = 0.18;
export const MISSILE_COOLDOWN_RAPID = 0.04;
export const MISSILE_LIFESPAN = 8;
export const ASTEROID_INTERVAL = 4;
export const ASTEROID_LIFESPAN = 25;
export const MAX_ASTEROIDS = 8;
export const PLANET_MAX_HEALTH = 8;
export const DEBRIS_LIFESPAN = 1.5;
export const SHIP_MAX_HEALTH = 25;
export const SHIP_RESPAWN_DELAY = 2.5;
export const CENTER_MAX_HEALTH = 50;
export const TOOLTIP_WIDTH = 260;
export const TOOLTIP_HEIGHT = 100;
export const GOODBYE_SEQUENCE = 'goodbye';

// ─── Helpers ───────────────────────────────────────────────────────

export function getCircleRadius(isMobile: boolean, isUltrawide: boolean): number {
	return isMobile ? CONFIG.CIRCLE_RADIUS_MOBILE :
		isUltrawide ? CONFIG.CIRCLE_RADIUS_ULTRAWIDE :
		CONFIG.CIRCLE_RADIUS_DESKTOP;
}

export function getCenterRadius(isMobile: boolean): number {
	return isMobile ? CONFIG.CENTER_RADIUS_MOBILE : CONFIG.CENTER_RADIUS_DESKTOP;
}

export function createDefaultKeys(): Keys {
	return {
		left: false,
		right: false,
		up: false,
		fire: false,
		rapidFire: false,
		asteroidStorm: false
	};
}

export function createDefaultGameState(width: number, height: number, isMobile: boolean): GameState {
	return {
		time: 0,
		width,
		height,
		isMobile,
		isUltrawide: false,
		shipHealth: SHIP_MAX_HEALTH,
		shipDead: false,
		shipRespawnTime: 0,
		shipEscaped: false,
		keys: createDefaultKeys(),
		missiles: [],
		asteroids: [],
		lastMissileTime: 0,
		lastAsteroidTime: 0,
		debris: [],
		fadingConstraints: [],
		tornadoActive: false,
		tornadoEndTime: 0,
		victoryTriggered: false,
		victoryTime: 0,
		totalPlanets: 0,
		centerHealth: CENTER_MAX_HEALTH,
		centerDead: false,
		blackHoleActive: false,
		blackHoleTime: 0,
		blackHoleRadius: 0,
		bigBangTriggered: false,
		bigBangTime: 0,
		score: 0,
		goodbyeTextActive: false,
		goodbyeTextTime: 0,
		typedBuffer: '',
		escapeGlowIntensity: 0,
	};
}
