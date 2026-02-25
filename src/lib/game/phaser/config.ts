// ── Collision Categories ──────────────────────────────────────────
export const CATEGORY = {
	PLAYER: 0x0001,
	PLAYER_BULLET: 0x0002,
	ENEMY: 0x0004,
	ENEMY_BULLET: 0x0008,
	ASTEROID: 0x0010,
	PICKUP: 0x0020,
	WALL: 0x0040,
	SENSOR: 0x0080
} as const;

// ── Ship Constants ────────────────────────────────────────────────
export const SHIP = {
	MAX_HEALTH: 25,
	MAX_SHIELDS: 10,
	SHIELD_RECHARGE_RATE: 0.5, // per second
	SHIELD_RECHARGE_DELAY: 5000, // ms after last hit before recharging
	THRUST: 0.003,
	REVERSE_THRUST: 0.0015, // half forward thrust — braking, not full reverse
	TURBO_THRUST: 0.012, // 4x normal — emergency burst
	TURBO_DURATION: 400, // ms
	TURBO_COOLDOWN: 3000, // ms
	ROTATION_SPEED: 0.06,
	FRICTION_AIR: 0.08,
	RESPAWN_DELAY: 2500, // ms
	BODY_RADIUS: 16
} as const;

// ── Weapon Constants ──────────────────────────────────────────────
export const WEAPONS = {
	LASER_COOLDOWN: 180, // ms
	LASER_SPEED: 12,
	LASER_DAMAGE: 1,
	LASER_LIFESPAN: 3000, // ms
	RAPID_FIRE_COOLDOWN: 120,
	RAPID_FIRE_SPREAD: 0.075 // radians
} as const;

// ── Sector Constants ──────────────────────────────────────────────
export const SECTOR = {
	SIZE: 4000, // px per sector
	GRID_SIZE: 8, // 8x8 grid
	START_X: 3, // starting sector coordinates
	START_Y: 3,
	MAX_BODIES: 80,
	TRANSITION_DURATION: 500 // ms fade
} as const;

// ── Asteroid Constants ────────────────────────────────────────────
export const ASTEROIDS = {
	MIN_RADIUS: 20,
	MAX_RADIUS: 50,
	MIN_VERTICES: 6,
	MAX_VERTICES: 10,
	HP_PER_SIZE: 0.1, // hp = radius * this
	DENSITY: {
		sparse: 10,
		normal: 25,
		dense: 45
	}
} as const;

// ── Enemy Constants ───────────────────────────────────────────────
export const ENEMIES = {
	SCOUT: {
		HP: 3,
		SPEED: 4,
		DAMAGE: 1,
		SCORE: 50
	},
	TURRET: {
		HP: 10,
		FIRE_RATE: 600, // ms — fast since they can't move
		BURST_COUNT: 3,
		BURST_DELAY: 120, // ms between shots in a burst
		BURST_COOLDOWN: 2000, // ms between bursts
		DAMAGE: 2,
		SCORE: 150
	},
	SWARMER: {
		HP: 1,
		SPEED: 6,
		DAMAGE: 1,
		PACK_SIZE_MIN: 5,
		PACK_SIZE_MAX: 8,
		SCORE: 10
	},
	DENSITY: {
		safe: 0,
		light: 3,
		medium: 8,
		heavy: 15
	}
} as const;

// ── Enemy Bullet Constants ────────────────────────────────────────
export const ENEMY_BULLET = {
	SPEED_SCOUT: 8,
	SPEED_TURRET: 6,
	LIFESPAN: 3000 // ms
} as const;

// ── Sensor Beacon Constants ──────────────────────────────────────
export const SENSOR_BEACON = {
	SCAN_RADIUS: 1 // reveals current + adjacent sectors
} as const;

// ── Planet Constants ─────────────────────────────────────────────
export const PLANET = {
	MIN_RADIUS: 60,
	MAX_RADIUS: 120,
	GRAVITY_RANGE: 600,
	GRAVITY_STRENGTH: 0.004,
	COLLISION_DAMAGE_PLAYER: 3,
	COLLISION_DAMAGE_ENEMY: 2,
	COLORS: [0x4488cc, 0x44aa66, 0xcc6644, 0xaa8844, 0xccccee, 0x886644, 0x9966aa, 0xaaaa44]
} as const;

// ── Wormhole Constants ──────────────────────────────────────────
export const WORMHOLE = {
	ACTIVATION_DISTANCE: 80,
	COOLDOWN: 2000,
	PAIR_COUNT: 5,
	COLORS: [0xff44ff, 0x44ffff, 0xffff44, 0xff8844, 0x44ff88]
} as const;

// ── Pickup Constants ────────────────────────────────────────────
export const PICKUPS = {
	MUSHROOM_HEAL: 8,
	MUSHROOM_SHIELD: 4,
	SPEED_BOOST_DURATION: 8000,
	SPEED_BOOST_MULTIPLIER: 2,
	DOUBLE_SHOT_DURATION: 10000,
	SHIELD_OVERCHARGE_AMOUNT: 20,
	SHIELD_OVERCHARGE_DURATION: 12000,
	ACTIVATION_DISTANCE: 60
} as const;

// ── Boss Constants ─────────────────────────────────────────────
export const BOSS = {
	ITEM_GIVE_RANGE: 150,
	GIVE_GRACE_PERIOD: 500, // ms — boss stops attacking when item prompt appears
	GIVE_WINDOW: 3000, // ms — how long the give prompt stays open
	BODY_RADIUS: 24,
	INTRO_DURATION: 2000 // ms — dramatic intro overlay
} as const;

// ── Parallax Star Layers ──────────────────────────────────────────
export const STAR_LAYERS = [
	{ count: 120, speed: 0.1, minSize: 1, maxSize: 1, alpha: 0.3 }, // far
	{ count: 80, speed: 0.3, minSize: 1, maxSize: 2, alpha: 0.5 }, // mid
	{ count: 40, speed: 0.6, minSize: 2, maxSize: 3, alpha: 0.8 } // near
] as const;

// ── Phaser enum values (hardcoded to avoid import issues) ─────────
// These match Phaser's internal constants — no runtime import needed
const PHASER_AUTO = 0;
const SCALE_RESIZE = 5; // Phaser.Scale.RESIZE

// ── Build the Phaser GameConfig ───────────────────────────────────
export function createGameConfig(parent: HTMLElement, scenes: any[]) {
	return {
		type: PHASER_AUTO,
		parent,
		backgroundColor: '#000000',
		physics: {
			default: 'matter',
			matter: {
				gravity: { x: 0, y: 0 },
				debug: false
			}
		},
		scale: {
			mode: SCALE_RESIZE
		},
		render: {
			pixelArt: true,
			antialias: false
		},
		input: {
			keyboard: {
				// Capture keys the browser would otherwise consume (scroll, etc.)
				capture: [32, 38, 40, 87, 83] // Space, Up, Down, W, S
			},
			mouse: true,
			gamepad: true
		},
		audio: {
			disableWebAudio: false
		},
		banner: false,
		scene: scenes
	};
}
