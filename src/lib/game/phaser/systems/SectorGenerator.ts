import { SECTOR, ASTEROIDS, ENEMIES, PLANET, WORMHOLE } from '../config';
import { EASTER_EGG_MESSAGES } from './EasterEggs';
import { getFragmentCount } from './TextFragments';
import { getAllBosses, getAllItems } from './Inventory';

export type SectorType = 'empty' | 'asteroid_field' | 'patrol' | 'hostile' | 'nebula' | 'boss';

export interface EnemySpawn {
	type: 'scout' | 'turret' | 'swarmer';
	x: number;
	y: number;
}

export interface PlanetData {
	x: number;
	y: number;
	radius: number;
	color: number;
}

export interface WormholeData {
	x: number;
	y: number;
	destSectorX: number;
	destSectorY: number;
	destX: number;
	destY: number;
	pairIndex: number;
}

export type PickupType = 'mushroom' | 'speed' | 'double_shot' | 'shield' | 'mystery';

export interface PickupData {
	type: PickupType;
	x: number;
	y: number;
}

export interface EasterEggData {
	x: number;
	y: number;
	messageIndex: number;
}

export interface TextBlobData {
	x: number;
	y: number;
	fragmentIndex: number;
}

export interface BossSpawn {
	bossId: string;
	x: number;
	y: number;
}

export interface ItemSpawn {
	itemId: string;
	x: number;
	y: number;
}

export interface SectorData {
	type: SectorType;
	asteroidCount: number;
	enemies: EnemySpawn[];
	hasSensorBeacon: boolean;
	sensorPosition: { x: number; y: number };
	seed: number;
	nebulaColor?: number;
	planets: PlanetData[];
	wormhole?: WormholeData;
	pickups: PickupData[];
	easterEggs: EasterEggData[];
	textBlobs: TextBlobData[];
	boss?: BossSpawn;
	items: ItemSpawn[];
}

export class SectorGenerator {
	private sectorCache = new Map<string, SectorData>();
	private wormholeNetwork = new Map<string, WormholeData>();
	private bossSectors = new Map<string, BossSpawn>();
	private itemSectors = new Map<string, ItemSpawn[]>();
	/** Set of sector keys reserved for bosses/wormholes (not eligible for other special content) */
	private reservedSectors = new Set<string>();

	constructor() {
		this.reservedSectors.add(`${SECTOR.START_X},${SECTOR.START_Y}`);
		this.generateWormholeNetwork();
		this.generateBossNetwork();
		this.generateItemNetwork();
	}

	private hash(x: number, y: number): number {
		let h = x * 374761393 + y * 668265263;
		h = (h ^ (h >> 13)) * 1274126177;
		h = h ^ (h >> 16);
		return Math.abs(h);
	}

	private seededRandom(seed: number): () => number {
		return () => {
			seed |= 0;
			seed = (seed + 0x6d2b79f5) | 0;
			let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	/** Toroidal distance from center (3,3) on an 8x8 grid */
	private distanceFromCenter(x: number, y: number): number {
		const dx = Math.min(
			Math.abs(x - SECTOR.START_X),
			SECTOR.GRID_SIZE - Math.abs(x - SECTOR.START_X)
		);
		const dy = Math.min(
			Math.abs(y - SECTOR.START_Y),
			SECTOR.GRID_SIZE - Math.abs(y - SECTOR.START_Y)
		);
		return Math.sqrt(dx * dx + dy * dy);
	}

	private generateWormholeNetwork() {
		const rng = this.seededRandom(42);
		const usedSectors = new Set<string>();
		usedSectors.add(`${SECTOR.START_X},${SECTOR.START_Y}`);

		for (let i = 0; i < WORMHOLE.PAIR_COUNT; i++) {
			let s1x: number, s1y: number, s1Key: string;
			let s2x: number, s2y: number, s2Key: string;

			let attempts = 0;
			do {
				s1x = (rng() * SECTOR.GRID_SIZE) | 0;
				s1y = (rng() * SECTOR.GRID_SIZE) | 0;
				s1Key = `${s1x},${s1y}`;
				attempts++;
			} while (usedSectors.has(s1Key) && attempts < 100);
			if (attempts >= 100) break;
			usedSectors.add(s1Key);

			attempts = 0;
			do {
				s2x = (rng() * SECTOR.GRID_SIZE) | 0;
				s2y = (rng() * SECTOR.GRID_SIZE) | 0;
				s2Key = `${s2x},${s2y}`;
				attempts++;
			} while (usedSectors.has(s2Key) && attempts < 100);
			if (attempts >= 100) break;
			usedSectors.add(s2Key);

			const margin = 500;
			const range = SECTOR.SIZE - margin * 2;
			const pos1x = margin + rng() * range;
			const pos1y = margin + rng() * range;
			const pos2x = margin + rng() * range;
			const pos2y = margin + rng() * range;

			this.wormholeNetwork.set(s1Key, {
				x: pos1x,
				y: pos1y,
				destSectorX: s2x!,
				destSectorY: s2y!,
				destX: pos2x,
				destY: pos2y,
				pairIndex: i
			});

			this.wormholeNetwork.set(s2Key, {
				x: pos2x,
				y: pos2y,
				destSectorX: s1x,
				destSectorY: s1y,
				destX: pos1x,
				destY: pos1y,
				pairIndex: i
			});
		}
	}

	private generateBossNetwork() {
		const rng = this.seededRandom(137);
		const bosses = getAllBosses();

		for (const boss of bosses) {
			let bx: number, by: number, key: string;
			let attempts = 0;
			do {
				bx = (rng() * SECTOR.GRID_SIZE) | 0;
				by = (rng() * SECTOR.GRID_SIZE) | 0;
				key = `${bx},${by}`;
				attempts++;
			} while (
				(this.reservedSectors.has(key) ||
					this.distanceFromCenter(bx, by) < 2) &&
				attempts < 200
			);
			if (attempts >= 200) continue;

			this.reservedSectors.add(key);

			const margin = 800;
			const range = SECTOR.SIZE - margin * 2;
			this.bossSectors.set(key, {
				bossId: boss.id,
				x: margin + rng() * range,
				y: margin + rng() * range
			});
		}
	}

	private generateItemNetwork() {
		const rng = this.seededRandom(271);
		const items = getAllItems();

		for (const item of items) {
			let ix: number, iy: number, key: string;
			let attempts = 0;
			do {
				ix = (rng() * SECTOR.GRID_SIZE) | 0;
				iy = (rng() * SECTOR.GRID_SIZE) | 0;
				key = `${ix},${iy}`;
				attempts++;
				// Items can share sectors with bosses, but not boss sectors of their OWN boss
				const bossInSector = this.bossSectors.get(key);
				if (bossInSector && bossInSector.bossId === item.bossId) continue;
			} while (
				(key === `${SECTOR.START_X},${SECTOR.START_Y}` && items.indexOf(item) > 0) &&
				attempts < 200
			);
			if (attempts >= 200) continue;

			const margin = 500;
			const range = SECTOR.SIZE - margin * 2;
			const existing = this.itemSectors.get(key) ?? [];
			existing.push({
				itemId: item.id,
				x: margin + rng() * range,
				y: margin + rng() * range
			});
			this.itemSectors.set(key, existing);
		}
	}

	generate(sectorX: number, sectorY: number): SectorData {
		const key = `${sectorX},${sectorY}`;
		const cached = this.sectorCache.get(key);
		if (cached) return cached;

		const seed = this.hash(sectorX, sectorY);
		const rng = this.seededRandom(seed);

		// Items for this sector (shared across all sector types)
		const sectorItems = this.itemSectors.get(key) ?? [];

		// Starting sector is always safe with a beacon
		if (sectorX === SECTOR.START_X && sectorY === SECTOR.START_Y) {
			const data: SectorData = {
				type: 'empty',
				asteroidCount: 3,
				enemies: [],
				hasSensorBeacon: true,
				sensorPosition: { x: SECTOR.SIZE / 2 + 200, y: SECTOR.SIZE / 2 - 150 },
				seed,
				planets: [
					{
						x: SECTOR.SIZE / 2 + 600,
						y: SECTOR.SIZE / 2 - 400,
						radius: 90,
						color: 0x4488cc
					}
				],
				pickups: [{ type: 'mushroom', x: SECTOR.SIZE / 2 - 200, y: SECTOR.SIZE / 2 + 100 }],
				easterEggs: [{ x: SECTOR.SIZE / 2 - 500, y: SECTOR.SIZE / 2 - 300, messageIndex: 0 }],
				textBlobs: [
					{ x: SECTOR.SIZE / 2 + 400, y: SECTOR.SIZE / 2 + 200, fragmentIndex: 0 }
				],
				items: sectorItems
			};
			this.sectorCache.set(key, data);
			return data;
		}

		// Boss sectors override the sector type
		const bossSpawn = this.bossSectors.get(key);
		if (bossSpawn) {
			const data = this.buildBossSectorData(seed, rng, key, bossSpawn, sectorItems);
			this.sectorCache.set(key, data);
			return data;
		}

		const dist = this.distanceFromCenter(sectorX, sectorY);
		const type = this.pickSectorType(dist, rng);
		const data = this.buildSectorData(type, seed, rng, key, sectorItems);
		this.sectorCache.set(key, data);
		return data;
	}

	private pickSectorType(dist: number, rng: () => number): SectorType {
		const roll = rng();

		if (dist < 1.5) {
			if (roll < 0.4) return 'empty';
			if (roll < 0.7) return 'asteroid_field';
			if (roll < 0.9) return 'patrol';
			return 'nebula';
		} else if (dist < 3) {
			if (roll < 0.15) return 'empty';
			if (roll < 0.35) return 'asteroid_field';
			if (roll < 0.6) return 'patrol';
			if (roll < 0.85) return 'hostile';
			return 'nebula';
		} else {
			if (roll < 0.05) return 'empty';
			if (roll < 0.2) return 'asteroid_field';
			if (roll < 0.4) return 'patrol';
			if (roll < 0.8) return 'hostile';
			return 'nebula';
		}
	}

	private buildBossSectorData(
		seed: number,
		rng: () => number,
		sectorKey: string,
		bossSpawn: BossSpawn,
		items: ItemSpawn[]
	): SectorData {
		const margin = 300;
		const range = SECTOR.SIZE - margin * 2;
		const randPos = () => margin + rng() * range;

		return {
			type: 'boss',
			asteroidCount: ASTEROIDS.DENSITY.sparse,
			enemies: [],
			hasSensorBeacon: true,
			sensorPosition: { x: randPos(), y: randPos() },
			seed,
			planets: this.generatePlanets('empty', rng, randPos),
			pickups: [
				{ type: 'mushroom', x: randPos(), y: randPos() },
				{ type: 'shield', x: randPos(), y: randPos() }
			],
			easterEggs: [],
			textBlobs: [],
			wormhole: this.wormholeNetwork.get(sectorKey),
			boss: bossSpawn,
			items
		};
	}

	private buildSectorData(
		type: SectorType,
		seed: number,
		rng: () => number,
		sectorKey: string,
		items: ItemSpawn[]
	): SectorData {
		const margin = 300;
		const range = SECTOR.SIZE - margin * 2;
		const randPos = () => margin + rng() * range;

		const planets = this.generatePlanets(type, rng, randPos);
		const pickups = this.generatePickups(type, rng, randPos);
		const easterEggs = this.generateEasterEggs(rng, randPos);
		const textBlobs = this.generateTextBlobs(rng, randPos);
		const wormhole = this.wormholeNetwork.get(sectorKey);

		switch (type) {
			case 'empty': {
				return {
					type,
					asteroidCount: (rng() * 6) | 0,
					enemies: [],
					hasSensorBeacon: rng() < 0.7,
					sensorPosition: { x: randPos(), y: randPos() },
					seed,
					planets,
					pickups,
					easterEggs,
					textBlobs,
					wormhole,
					items
				};
			}

			case 'asteroid_field': {
				return {
					type,
					asteroidCount: ASTEROIDS.DENSITY.dense - 5 + ((rng() * 10) | 0),
					enemies: [],
					hasSensorBeacon: rng() < 0.5,
					sensorPosition: { x: randPos(), y: randPos() },
					seed,
					planets,
					pickups,
					easterEggs,
					textBlobs,
					wormhole,
					items
				};
			}

			case 'patrol': {
				const count = 3 + ((rng() * 3) | 0);
				const enemies: EnemySpawn[] = [];
				for (let i = 0; i < count; i++) {
					enemies.push({ type: 'scout', x: randPos(), y: randPos() });
				}
				return {
					type,
					asteroidCount: ASTEROIDS.DENSITY.sparse,
					enemies,
					hasSensorBeacon: rng() < 0.4,
					sensorPosition: { x: randPos(), y: randPos() },
					seed,
					planets,
					pickups,
					easterEggs,
					textBlobs,
					wormhole,
					items
				};
			}

			case 'hostile': {
				const enemies: EnemySpawn[] = [];
				const scoutCount = 2 + ((rng() * 2) | 0);
				for (let i = 0; i < scoutCount; i++) {
					enemies.push({ type: 'scout', x: randPos(), y: randPos() });
				}
				const turretCount = 1 + ((rng() * 2) | 0);
				for (let i = 0; i < turretCount; i++) {
					enemies.push({ type: 'turret', x: randPos(), y: randPos() });
				}
				const packSize =
					ENEMIES.SWARMER.PACK_SIZE_MIN +
					((rng() * (ENEMIES.SWARMER.PACK_SIZE_MAX - ENEMIES.SWARMER.PACK_SIZE_MIN)) | 0);
				const packCenterX = randPos();
				const packCenterY = randPos();
				for (let i = 0; i < packSize; i++) {
					enemies.push({
						type: 'swarmer',
						x: packCenterX + (rng() - 0.5) * 100,
						y: packCenterY + (rng() - 0.5) * 100
					});
				}
				return {
					type,
					asteroidCount: ASTEROIDS.DENSITY.normal,
					enemies,
					hasSensorBeacon: rng() < 0.3,
					sensorPosition: { x: randPos(), y: randPos() },
					seed,
					planets,
					pickups,
					easterEggs,
					textBlobs,
					wormhole,
					items
				};
			}

			case 'nebula': {
				return {
					type,
					asteroidCount: ASTEROIDS.DENSITY.sparse + ((rng() * 5) | 0),
					enemies: [],
					hasSensorBeacon: rng() < 0.6,
					sensorPosition: { x: randPos(), y: randPos() },
					seed,
					nebulaColor: 0x220044,
					planets,
					pickups,
					easterEggs,
					textBlobs,
					wormhole,
					items
				};
			}

			default: {
				// Fallback for boss type (shouldn't reach here)
				return {
					type: 'empty',
					asteroidCount: 0,
					enemies: [],
					hasSensorBeacon: false,
					sensorPosition: { x: 0, y: 0 },
					seed,
					planets: [],
					pickups: [],
					easterEggs: [],
					textBlobs: [],
					items
				};
			}
		}
	}

	private generatePlanets(
		type: SectorType,
		rng: () => number,
		randPos: () => number
	): PlanetData[] {
		const planets: PlanetData[] = [];
		let chance: number;
		let maxCount: number;

		switch (type) {
			case 'empty':
			case 'boss':
				chance = 0.6;
				maxCount = 2;
				break;
			case 'asteroid_field':
				chance = 0.4;
				maxCount = 1;
				break;
			case 'patrol':
				chance = 0.7;
				maxCount = 2;
				break;
			case 'hostile':
				chance = 0.8;
				maxCount = 3;
				break;
			case 'nebula':
				chance = 0.5;
				maxCount = 2;
				break;
		}

		if (rng() < chance) {
			const count = 1 + (rng() < 0.4 && maxCount > 1 ? (rng() < 0.5 && maxCount > 2 ? 2 : 1) : 0);
			const colors = PLANET.COLORS;
			for (let i = 0; i < count; i++) {
				const radius = PLANET.MIN_RADIUS + rng() * (PLANET.MAX_RADIUS - PLANET.MIN_RADIUS);
				const colorIdx = (rng() * colors.length) | 0;
				planets.push({
					x: randPos(),
					y: randPos(),
					radius,
					color: colors[colorIdx]
				});
			}
		}

		return planets;
	}

	private pickPickupType(rng: () => number): PickupType {
		const roll = rng();
		// 40% mushroom, 15% speed, 15% double_shot, 15% shield, 15% mystery
		if (roll < 0.4) return 'mushroom';
		if (roll < 0.55) return 'speed';
		if (roll < 0.7) return 'double_shot';
		if (roll < 0.85) return 'shield';
		return 'mystery';
	}

	private generatePickups(
		type: SectorType,
		rng: () => number,
		randPos: () => number
	): PickupData[] {
		const pickups: PickupData[] = [];
		let chance: number;
		let maxCount: number;

		switch (type) {
			case 'empty':
				chance = 0.6;
				maxCount = 2;
				break;
			case 'asteroid_field':
				chance = 0.3;
				maxCount = 1;
				break;
			case 'patrol':
				chance = 0.4;
				maxCount = 1;
				break;
			case 'hostile':
				chance = 0.7;
				maxCount = 3;
				break;
			case 'nebula':
				chance = 0.4;
				maxCount = 1;
				break;
			case 'boss':
				chance = 0.8;
				maxCount = 2;
				break;
		}

		if (rng() < chance) {
			const count = 1 + ((rng() * maxCount) | 0);
			for (let i = 0; i < count; i++) {
				pickups.push({ type: this.pickPickupType(rng), x: randPos(), y: randPos() });
			}
		}

		return pickups;
	}

	private generateEasterEggs(rng: () => number, randPos: () => number): EasterEggData[] {
		const eggs: EasterEggData[] = [];
		if (rng() < 0.45) {
			const count = rng() < 0.3 ? 2 : 1;
			for (let i = 0; i < count; i++) {
				const msgIdx = (rng() * EASTER_EGG_MESSAGES.length) | 0;
				eggs.push({ x: randPos(), y: randPos(), messageIndex: msgIdx });
			}
		}
		return eggs;
	}

	private generateTextBlobs(rng: () => number, randPos: () => number): TextBlobData[] {
		const blobs: TextBlobData[] = [];
		const fragCount = getFragmentCount();
		if (fragCount > 0 && rng() < 0.5) {
			const count = 1 + ((rng() * 3) | 0);
			for (let i = 0; i < count; i++) {
				blobs.push({
					x: randPos(),
					y: randPos(),
					fragmentIndex: (rng() * fragCount) | 0
				});
			}
		}
		return blobs;
	}
}
