import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { type Enemy } from '../entities/Enemy';
import { Scout } from '../entities/Scout';
import { Turret } from '../entities/Turret';
import { Swarmer } from '../entities/Swarmer';
import { type Boss } from '../entities/Boss';
import { OldGregg } from '../entities/bosses/OldGregg';
import { BlackKnight } from '../entities/bosses/BlackKnight';
import { Q } from '../entities/bosses/Q';
import { BorgCube } from '../entities/bosses/BorgCube';
import { TheMoon } from '../entities/bosses/TheMoon';
import { KnightsWhoSayNi } from '../entities/bosses/KnightsWhoSayNi';
import { GLaDOS } from '../entities/bosses/GLaDOS';
import { ParallaxBackground } from '../systems/ParallaxBackground';
import {
	SectorGenerator,
	type SectorData,
	type EnemySpawn,
	type PlanetData,
	type WormholeData,
	type PickupData,
	type EasterEggData,
	type TextBlobData,
	type ItemSpawn
} from '../systems/SectorGenerator';
import { EASTER_EGG_MESSAGES } from '../systems/EasterEggs';
import { getFragment, getFragmentData } from '../systems/TextFragments';
import {
	type InventoryItem,
	type BossKey,
	ITEM_CATALOG,
	getItemForBoss,
	BOSS_KEY_EMOJIS
} from '../systems/Inventory';
import { SECTOR, CATEGORY, SHIP, SENSOR_BEACON, PLANET, WORMHOLE, PICKUPS, BOSS } from '../config';
import { EventBus } from '../EventBus';

export class GameScene extends Phaser.Scene {
	player!: Player;
	starfield!: ParallaxBackground;

	// Sector state
	private sectorX: number = SECTOR.START_X;
	private sectorY: number = SECTOR.START_Y;
	private transitioning = false;
	private sectorGenerator = new SectorGenerator();
	private currentSectorData: SectorData | null = null;

	// Sector content
	private asteroids: Phaser.Physics.Matter.Sprite[] = [];
	private enemies: Enemy[] = [];
	private sensorBeacon: Phaser.Physics.Matter.Sprite | null = null;
	private beaconTween: Phaser.Tweens.Tween | null = null;
	private nebulaOverlay: Phaser.GameObjects.Rectangle | null = null;

	// Planets
	private planetBodies: { sprite: Phaser.Physics.Matter.Sprite; data: PlanetData }[] = [];
	private planetCraterGfx!: Phaser.GameObjects.Graphics;
	private planetCraters: { x: number; y: number; r: number }[] = [];
	private kilroyGraffitiSprite: Phaser.GameObjects.Sprite | null = null;

	// Kilroy black hole
	private kilroyBlackHole: {
		sprite: Phaser.GameObjects.Sprite;
		x: number;
		y: number;
	} | null = null;
	private kilroyTeleportCooldown = 0;

	// Meme debris
	private memeSprites: Phaser.GameObjects.Sprite[] = [];

	// Ambient life
	private patrolShips: {
		sprite: Phaser.GameObjects.Sprite;
		waypoints: { x: number; y: number }[];
		waypointIdx: number;
		speed: number;
	}[] = [];
	private distressBeacons: {
		sprite: Phaser.GameObjects.Sprite;
		text: Phaser.GameObjects.Text;
		triggered: boolean;
		planetX: number;
		planetY: number;
	}[] = [];
	private rogueAsteroidTimer: Phaser.Time.TimerEvent | null = null;

	// Wormhole
	private wormholeSprite: Phaser.Physics.Matter.Sprite | null = null;
	private wormholeTweens: Phaser.Tweens.Tween[] = [];
	private wormholeCooldown = 0;
	private currentWormholeData: WormholeData | null = null;

	// Pickups (mushrooms)
	private pickupSprites: {
		sprite: Phaser.Physics.Matter.Sprite;
		tween: Phaser.Tweens.Tween;
		data: PickupData;
	}[] = [];

	// Easter eggs
	private easterEggObjects: {
		sprite: Phaser.GameObjects.Sprite;
		text: Phaser.GameObjects.Text;
		triggered: boolean;
		data: EasterEggData;
	}[] = [];
	private static readonly EGG_TEXTURES = ['egg-datapad', 'egg-artifact', 'egg-crate', 'egg-signal'];

	// Text blobs (content from musings/projects)
	private textBlobObjects: {
		text: Phaser.GameObjects.Text;
		body: MatterJS.BodyType;
		hp: number;
		content: string;
		fragmentIndex: number;
		discovered: boolean;
	}[] = [];

	// Boss system
	private currentBoss: Boss | null = null;
	private inventory = new Map<string, InventoryItem>();

	// Collectible items (adventure items floating in space)
	private itemSprites: {
		sprite: Phaser.Physics.Matter.Sprite;
		tween: Phaser.Tweens.Tween;
		emitter: Phaser.GameObjects.Particles.ParticleEmitter;
		data: ItemSpawn;
	}[] = [];
	private collectedItems = new Set<string>();
	private bossKeys: BossKey[] = [];

	// Exploration
	private visitedSectors = new Set<string>();
	private scannedSectors = new Set<string>();
	private scannedSectorTypes = new Map<string, string>();

	// Health ring overlay
	private healthRingsGfx!: Phaser.GameObjects.Graphics;

	// Transition effect
	private tunnelGfx: Phaser.GameObjects.Graphics | null = null;
	private tunnelTimer: Phaser.Time.TimerEvent | null = null;

	// Score
	score = 0;

	constructor() {
		super('GameScene');
	}

	init(data?: { score?: number; health?: number }) {
		this.score = data?.score ?? 0;
	}

	create(data?: { score?: number; health?: number }) {
		const startHealth = data?.health ?? SHIP.MAX_HEALTH;

		// Restore sector from URL hash if available
		this.readSectorFromHash();

		this.matter.world.setBounds(0, 0, SECTOR.SIZE, SECTOR.SIZE);

		this.starfield = new ParallaxBackground(this);

		this.player = new Player(this, SECTOR.SIZE / 2, SECTOR.SIZE / 2, startHealth);

		this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.08);
		this.cameras.main.setDeadzone(200, 150);
		this.cameras.main.setBounds(0, 0, SECTOR.SIZE, SECTOR.SIZE);

		// Starting sector is pre-visited and pre-scanned
		const startKey = `${SECTOR.START_X},${SECTOR.START_Y}`;
		this.visitedSectors.add(startKey);
		this.scannedSectors.add(startKey);

		this.healthRingsGfx = this.add.graphics();
		this.healthRingsGfx.setDepth(11);

		this.planetCraterGfx = this.add.graphics();
		this.planetCraterGfx.setDepth(5);

		this.generateSectorContent();
		this.setupCollisions();
		this.createEdgeSensors();

		this.scene.launch('HUDScene', {
			health: startHealth,
			maxHealth: SHIP.MAX_HEALTH,
			shields: SHIP.MAX_SHIELDS,
			maxShields: SHIP.MAX_SHIELDS,
			score: this.score,
			sectorX: this.sectorX,
			sectorY: this.sectorY,
			sectorType: this.currentSectorData?.type ?? 'empty',
			visitedSectors: this.visitedSectors,
			scannedSectors: this.scannedSectors,
			scannedSectorTypes: this.scannedSectorTypes
		});

		// Boss events
		EventBus.on('boss-spawn-enemies', this.onBossSpawnEnemies, this);
		EventBus.on('q-snap', this.onQSnap, this);

		EventBus.emit('current-scene-ready', this);
	}

	update(time: number, delta: number) {
		if (this.transitioning) return;

		this.player.update(time, delta);
		this.starfield.update(time);

		// Update enemies (iterate backwards for safe removal)
		for (let i = this.enemies.length - 1; i >= 0; i--) {
			const enemy = this.enemies[i];
			if (enemy.dead || !enemy.sprite.active) {
				this.enemies.splice(i, 1);
				continue;
			}
			enemy.update(time, delta, this.player.sprite);
		}

		// Ambient life updates
		this.updatePatrolShips();
		this.checkDistressBeaconProximity();

		// Sensor beacon proximity check
		if (this.sensorBeacon?.active && !this.player.dead) {
			const dist = Phaser.Math.Distance.Between(
				this.player.sprite.x,
				this.player.sprite.y,
				this.sensorBeacon.x,
				this.sensorBeacon.y
			);
			if (dist < 100) {
				this.activateSensor();
			}
		}

		// Gravity wells
		this.applyGravityWells();

		// Wormhole proximity
		this.checkWormholeProximity(time);

		// Pickup proximity
		this.checkPickupProximity();

		// Easter egg proximity
		this.checkEasterEggProximity();

		// Text blob bullet proximity
		this.checkTextBlobBulletHits();

		// Item collection
		this.checkItemProximity();

		// Boss item interaction
		this.checkBossItemInteraction();

		// Kilroy black hole gravity + teleport
		this.checkKilroyBlackHole(time);

		// Draw health rings around entities
		this.drawHealthRings();

		EventBus.emit('hud-update', {
			health: this.player.health,
			maxHealth: this.player.maxHealth,
			shields: this.player.shields,
			maxShields: this.player.maxShields,
			score: this.score,
			sectorX: this.sectorX,
			sectorY: this.sectorY,
			sectorType: this.currentSectorData?.type ?? 'empty',
			visitedSectors: this.visitedSectors,
			scannedSectors: this.scannedSectors,
			scannedSectorTypes: this.scannedSectorTypes,
			boss: this.currentBoss?.isActive()
				? {
						name: this.currentBoss.bossDef.name,
						hp: this.currentBoss.hp,
						maxHp: this.currentBoss.maxHp,
						phase: this.currentBoss.phase
					}
				: null,
			inventory: Array.from(this.inventory.values()),
			bossKeys: this.bossKeys
		});

		this.checkSectorTransition();
	}

	// ── Sector Content ─────────────────────────────────────────────

	private generateSectorContent() {
		const data = this.sectorGenerator.generate(this.sectorX, this.sectorY);
		this.currentSectorData = data;

		const key = `${this.sectorX},${this.sectorY}`;
		this.visitedSectors.add(key);
		this.scannedSectorTypes.set(key, data.type);

		this.updateSectorHash();

		this.spawnAsteroids(data.asteroidCount);
		this.spawnEnemies(data.enemies);
		this.spawnPlanets(data.planets);
		this.spawnPickups(data.pickups);
		this.spawnEasterEggs(data.easterEggs);
		this.spawnTextBlobs(data.textBlobs);

		if (data.hasSensorBeacon) {
			this.spawnSensorBeacon(data.sensorPosition);
		}

		if (data.wormhole) {
			this.spawnWormhole(data.wormhole);
		}

		// Spawn items (adventure items)
		if (data.items.length > 0) {
			this.spawnItems(data.items);
		}

		// Spawn boss
		if (data.boss) {
			this.spawnBoss(data.boss.bossId, data.boss.x, data.boss.y);
		}

		// Meme debris (rare floating sprites)
		this.spawnMemeDebris(data.seed);

		// Ambient life
		this.spawnPatrolShips(data.seed, data.type);
		this.spawnDistressBeacons(data.planets);
		this.startRogueAsteroids(data.seed);

		if (data.type === 'nebula' && data.nebulaColor) {
			const { width, height } = this.cameras.main;
			this.nebulaOverlay = this.add.rectangle(
				width / 2,
				height / 2,
				width,
				height,
				data.nebulaColor,
				0.15
			);
			this.nebulaOverlay.setScrollFactor(0);
			this.nebulaOverlay.setDepth(1);
		}
	}

	private spawnEnemies(spawns: EnemySpawn[]) {
		for (const spawn of spawns) {
			let enemy: Enemy;
			switch (spawn.type) {
				case 'scout':
					enemy = new Scout(this, spawn.x, spawn.y);
					break;
				case 'turret':
					enemy = new Turret(this, spawn.x, spawn.y);
					break;
				case 'swarmer':
					enemy = new Swarmer(this, spawn.x, spawn.y);
					break;
			}
			this.enemies.push(enemy);
		}
	}

	// ── Planets ───────────────────────────────────────────────────

	private spawnPlanets(planets: PlanetData[]) {
		// Deterministically pick one planet for Kilroy graffiti
		const kilroyIdx = planets.length > 0
			? (this.currentSectorData?.seed ?? 0) % planets.length
			: -1;

		for (let i = 0; i < planets.length; i++) {
			const pData = planets[i];
			// Texture is 64x64 with drawn circle radius 28.
			// setScale scales BOTH visual and physics body, so use texture-relative
			// radius to avoid double-scaling the collision body.
			const scale = pData.radius / 28;
			const sprite = this.matter.add.sprite(pData.x, pData.y, 'planet', undefined, {
				shape: { type: 'circle', radius: 28 },
				isStatic: true,
				label: 'planet'
			});
			sprite.setScale(scale);
			sprite.setTint(pData.color);
			sprite.setCollisionCategory(CATEGORY.WALL);
			sprite.setCollidesWith([
				CATEGORY.PLAYER,
				CATEGORY.PLAYER_BULLET,
				CATEGORY.ENEMY,
				CATEGORY.ENEMY_BULLET,
				CATEGORY.ASTEROID
			]);
			sprite.setData('type', 'planet');
			sprite.setDepth(4);

			this.planetBodies.push({ sprite, data: pData });

			// Add Kilroy graffiti to one planet
			if (i === kilroyIdx) {
				const graffitiScale = (pData.radius / 200) * 0.8;
				this.kilroyGraffitiSprite = this.add
					.sprite(pData.x + pData.radius * 0.3, pData.y - pData.radius * 0.2, 'kilroy-text')
					.setScale(graffitiScale)
					.setAlpha(0.6)
					.setDepth(5)
					.setRotation(0.15);
			}
		}
	}

	private applyGravityWells() {
		if (this.planetBodies.length === 0) return;

		// Collect bodies to be affected
		const affected: Phaser.Physics.Matter.Sprite[] = [];
		if (!this.player.dead && this.player.sprite.visible) {
			affected.push(this.player.sprite);
		}
		for (const enemy of this.enemies) {
			if (!enemy.dead && enemy.sprite.active) {
				affected.push(enemy.sprite);
			}
		}
		for (const ast of this.asteroids) {
			if (ast.active) affected.push(ast);
		}

		for (const planet of this.planetBodies) {
			const px = planet.data.x;
			const py = planet.data.y;

			for (const obj of affected) {
				const dx = px - obj.x;
				const dy = py - obj.y;
				const distSq = dx * dx + dy * dy;
				const dist = Math.sqrt(distSq);

				if (dist < PLANET.GRAVITY_RANGE && dist > planet.data.radius * 0.3) {
					const normalizedDist = dist / PLANET.GRAVITY_RANGE;
					const forceMag =
						PLANET.GRAVITY_STRENGTH * (1 - normalizedDist) * (1 - normalizedDist);
					const cappedForce = Math.min(forceMag, 0.005);
					const fx = (dx / dist) * cappedForce;
					const fy = (dy / dist) * cappedForce;
					obj.applyForce(new Phaser.Math.Vector2(fx, fy));
				}
			}
		}
	}

	// ── Wormholes ─────────────────────────────────────────────────

	private spawnWormhole(whData: WormholeData) {
		this.currentWormholeData = whData;
		const color = WORMHOLE.COLORS[whData.pairIndex % WORMHOLE.COLORS.length];

		this.wormholeSprite = this.matter.add.sprite(
			whData.x,
			whData.y,
			'wormhole',
			undefined,
			{
				isStatic: true,
				isSensor: true,
				label: 'wormhole'
			}
		);
		this.wormholeSprite.setTint(color);
		this.wormholeSprite.setData('type', 'wormhole');
		this.wormholeSprite.setDepth(6);
		this.wormholeSprite.setScale(2);

		// Pulsing scale animation
		const pulseTween = this.tweens.add({
			targets: this.wormholeSprite,
			scaleX: 2.5,
			scaleY: 2.5,
			duration: 1200,
			yoyo: true,
			repeat: -1,
			ease: 'Sine.easeInOut'
		});
		this.wormholeTweens.push(pulseTween);

		// Rotation animation
		const rotateTween = this.tweens.add({
			targets: this.wormholeSprite,
			rotation: Math.PI * 2,
			duration: 4000,
			repeat: -1,
			ease: 'Linear'
		});
		this.wormholeTweens.push(rotateTween);

		// Ambient particles around wormhole
		const emitter = this.add.particles(whData.x, whData.y, 'particle', {
			speed: { min: 10, max: 40 },
			scale: { start: 0.5, end: 0 },
			alpha: { start: 0.5, end: 0 },
			lifespan: { min: 800, max: 1500 },
			blendMode: 'ADD',
			tint: [color, 0xffffff],
			frequency: 200,
			quantity: 1
		});
		emitter.setDepth(5);
		// Store emitter reference on sprite for cleanup
		this.wormholeSprite.setData('emitter', emitter);
	}

	private checkWormholeProximity(time: number) {
		if (!this.wormholeSprite?.active || !this.currentWormholeData) return;
		if (this.player.dead || time < this.wormholeCooldown) return;

		const dist = Phaser.Math.Distance.Between(
			this.player.sprite.x,
			this.player.sprite.y,
			this.wormholeSprite.x,
			this.wormholeSprite.y
		);

		if (dist < WORMHOLE.ACTIVATION_DISTANCE) {
			this.enterWormhole(this.currentWormholeData);
		}
	}

	private enterWormhole(whData: WormholeData) {
		const color = WORMHOLE.COLORS[whData.pairIndex % WORMHOLE.COLORS.length];

		// "Engage!" text (STTNG reference)
		const engageText = this.add
			.text(this.player.sprite.x, this.player.sprite.y - 40, 'Engage!', {
				fontSize: '16px',
				color: '#ffcc44',
				fontFamily: 'monospace',
				fontStyle: 'bold'
			})
			.setOrigin(0.5)
			.setDepth(20);

		this.tweens.add({
			targets: engageText,
			y: engageText.y - 30,
			alpha: 0,
			duration: 800,
			onComplete: () => engageText.destroy()
		});

		this.playTransitionEffect(
			color,
			1200,
			() => {
				// Midpoint: swap to destination sector
				this.clearSector();
				this.sectorX = whData.destSectorX;
				this.sectorY = whData.destSectorY;
				this.player.sprite.setPosition(whData.destX, whData.destY);
				this.player.sprite.setVelocity(0, 0);
				this.wormholeCooldown = this.time.now + WORMHOLE.COOLDOWN;
				this.generateSectorContent();
			},
			() => {
				this.transitioning = false;
			}
		);

		this.transitioning = true;
	}

	// ── Pickups ──────────────────────────────────────────────────

	private static readonly PICKUP_TEXTURES: Record<string, string> = {
		mushroom: 'mushroom',
		speed: 'pickup-speed',
		double_shot: 'pickup-doubleshot',
		shield: 'pickup-shield',
		mystery: 'pickup-mystery'
	};

	private static readonly PICKUP_TINTS: Record<string, number | null> = {
		mushroom: null,
		speed: null,
		double_shot: null,
		shield: null,
		mystery: null
	};

	private spawnPickups(pickups: PickupData[]) {
		for (const pData of pickups) {
			const texture = GameScene.PICKUP_TEXTURES[pData.type] ?? 'mushroom';
			const sprite = this.matter.add.sprite(pData.x, pData.y, texture, undefined, {
				isStatic: true,
				isSensor: true,
				label: `pickup-${pData.type}`
			});
			sprite.setCollisionCategory(CATEGORY.PICKUP);
			sprite.setCollidesWith([CATEGORY.PLAYER]);
			sprite.setData('type', `pickup-${pData.type}`);
			sprite.setData('pickupType', pData.type);
			sprite.setDepth(6);

			const tint = GameScene.PICKUP_TINTS[pData.type];
			if (tint) sprite.setTint(tint);

			const tween = this.tweens.add({
				targets: sprite,
				y: pData.y - 6,
				scaleX: 1.1,
				scaleY: 1.1,
				duration: 1000,
				yoyo: true,
				repeat: -1,
				ease: 'Sine.easeInOut'
			});

			this.pickupSprites.push({ sprite, tween, data: pData });
		}
	}

	private checkPickupProximity() {
		if (this.player.dead) return;

		for (let i = this.pickupSprites.length - 1; i >= 0; i--) {
			const pickup = this.pickupSprites[i];
			if (!pickup.sprite.active) {
				this.pickupSprites.splice(i, 1);
				continue;
			}

			const dist = Phaser.Math.Distance.Between(
				this.player.sprite.x,
				this.player.sprite.y,
				pickup.sprite.x,
				pickup.sprite.y
			);

			if (dist < PICKUPS.ACTIVATION_DISTANCE) {
				this.collectPickup(pickup, i);
			}
		}
	}

	private collectPickup(
		pickup: {
			sprite: Phaser.Physics.Matter.Sprite;
			tween: Phaser.Tweens.Tween;
			data: PickupData;
		},
		index: number
	) {
		const x = pickup.sprite.x;
		const y = pickup.sprite.y;
		let pickupType = pickup.data.type;

		// Mystery resolves to a random concrete type
		if (pickupType === 'mystery') {
			const types: Array<'mushroom' | 'speed' | 'double_shot' | 'shield'> = [
				'mushroom',
				'speed',
				'double_shot',
				'shield'
			];
			pickupType = types[Phaser.Math.Between(0, types.length - 1)];
		}

		let label = '';
		let color = '#44ff88';
		let tint: number[] = [0x44ff88, 0x88ffaa, 0xffffff];

		switch (pickupType) {
			case 'mushroom':
				this.player.heal(PICKUPS.MUSHROOM_HEAL, PICKUPS.MUSHROOM_SHIELD);
				label = `+${PICKUPS.MUSHROOM_HEAL} Hull  +${PICKUPS.MUSHROOM_SHIELD} Shield`;
				color = '#44ff88';
				tint = [0x44ff88, 0x88ffaa, 0xffffff];
				break;
			case 'speed':
				this.player.applySpeedBoost();
				label = 'SPEED BOOST';
				color = '#44aaff';
				tint = [0x2266ff, 0x44aaff, 0xffffff];
				break;
			case 'double_shot':
				this.player.applyDoubleShot();
				label = 'DOUBLE SHOT';
				color = '#44ff66';
				tint = [0x22aa44, 0x44ff66, 0xffffff];
				break;
			case 'shield':
				this.player.applyShieldOvercharge();
				label = 'SHIELD OVERCHARGE';
				color = '#44eeff';
				tint = [0x22aacc, 0x44eeff, 0xffffff];
				break;
		}

		// If it was a mystery, prefix with "? "
		if (pickup.data.type === 'mystery') {
			label = '? ' + label;
		}

		// Floating text
		const healText = this.add
			.text(x, y - 20, label, {
				fontSize: '12px',
				color,
				fontFamily: 'monospace',
				fontStyle: 'bold'
			})
			.setOrigin(0.5)
			.setDepth(20);

		this.tweens.add({
			targets: healText,
			y: healText.y - 40,
			alpha: 0,
			duration: 1500,
			onComplete: () => healText.destroy()
		});

		// Collection particles
		const emitter = this.add.particles(x, y, 'particle', {
			speed: { min: 30, max: 80 },
			scale: { start: 1, end: 0 },
			alpha: { start: 0.8, end: 0 },
			lifespan: { min: 300, max: 500 },
			blendMode: 'ADD',
			tint,
			emitting: false
		});
		emitter.explode(8);
		this.time.delayedCall(600, () => emitter.destroy());

		pickup.tween.stop();
		pickup.sprite.destroy();
		this.pickupSprites.splice(index, 1);
	}

	// ── Boss System ──────────────────────────────────────────────

	private spawnBoss(bossId: string, x: number, y: number) {
		// Don't spawn if already defeated
		if (this.collectedItems.has(`boss-defeated-${bossId}`)) return;

		let boss: Boss;
		switch (bossId) {
			case 'old-gregg':
				boss = new OldGregg(this, x, y);
				break;
			case 'black-knight':
				boss = new BlackKnight(this, x, y);
				break;
			case 'q':
				boss = new Q(this, x, y);
				break;
			case 'borg-cube':
				boss = new BorgCube(this, x, y);
				break;
			case 'the-moon':
				boss = new TheMoon(this, x, y);
				break;
			case 'knights-ni':
				boss = new KnightsWhoSayNi(this, x, y);
				break;
			case 'glados':
				boss = new GLaDOS(this, x, y);
				break;
			default:
				return;
		}

		this.currentBoss = boss;
		this.enemies.push(boss);

		// Listen for boss defeat/pacify
		EventBus.once('boss-defeated', (data: { bossId: string; score: number }) => {
			this.score += data.score;
			this.collectedItems.add(`boss-defeated-${data.bossId}`);
			this.currentBoss = null;
			this.spawnBossDrops(x, y);
			this.earnBossKey(data.bossId);
		});

		EventBus.once('boss-pacified', (data: { bossId: string; score: number }) => {
			this.score += data.score;
			this.collectedItems.add(`boss-defeated-${data.bossId}`);
			this.currentBoss = null;
			// Remove the weak item from inventory
			const item = getItemForBoss(data.bossId);
			if (item) this.inventory.delete(item.id);
			// Pacify gives triple drops
			this.spawnBossDrops(x, y);
			this.spawnBossDrops(x + 60, y - 40);
			this.spawnBossDrops(x - 60, y + 40);
			EventBus.emit('inventory-update', Array.from(this.inventory.values()));
			this.earnBossKey(data.bossId);
		});
	}

	private spawnBossDrops(x: number, y: number) {
		const types: Array<PickupData['type']> = ['speed', 'double_shot', 'shield'];
		for (const type of types) {
			const offsetX = x + Phaser.Math.FloatBetween(-100, 100);
			const offsetY = y + Phaser.Math.FloatBetween(-100, 100);
			this.spawnPickups([{ type, x: offsetX, y: offsetY }]);
		}
	}

	private earnBossKey(bossId: string) {
		const keyDef = BOSS_KEY_EMOJIS[bossId];
		if (!keyDef) return;
		if (this.bossKeys.some((k) => k.bossId === bossId)) return;
		const key: BossKey = { bossId, emoji: keyDef.emoji, name: keyDef.name };
		this.bossKeys.push(key);
		EventBus.emit('boss-key-earned', key);
	}

	private checkBossItemInteraction() {
		if (!this.currentBoss || this.player.dead) return;
		if (!this.currentBoss.isActive()) return;

		const dist = Phaser.Math.Distance.Between(
			this.player.sprite.x,
			this.player.sprite.y,
			this.currentBoss.sprite.x,
			this.currentBoss.sprite.y
		);

		if (dist < BOSS.ITEM_GIVE_RANGE) {
			const weakItem = getItemForBoss(this.currentBoss.bossId);
			if (weakItem && this.inventory.has(weakItem.id)) {
				this.currentBoss.startGiveInteraction(weakItem.name);
			}
		} else if (dist > BOSS.ITEM_GIVE_RANGE * 2) {
			// Cancel if player moves too far away
			this.currentBoss.cancelGiveInteraction();
		}
	}

	private onBossSpawnEnemies(data: { type: string; count: number; x: number; y: number }) {
		for (let i = 0; i < data.count; i++) {
			const offsetX = data.x + Phaser.Math.FloatBetween(-80, 80);
			const offsetY = data.y + Phaser.Math.FloatBetween(-80, 80);
			const enemy = new Swarmer(this, offsetX, offsetY);
			this.enemies.push(enemy);
		}
	}

	private onQSnap(data: { duration: number }) {
		if (this.player.dead) return;
		this.player.invertControls(data.duration);
	}

	// ── Adventure Items ──────────────────────────────────────────

	private spawnItems(items: ItemSpawn[]) {
		for (const itemData of items) {
			// Skip already collected items
			if (this.collectedItems.has(itemData.itemId)) continue;

			const catalogItem = ITEM_CATALOG[itemData.itemId];
			if (!catalogItem) continue;

			const sprite = this.matter.add.sprite(
				itemData.x,
				itemData.y,
				catalogItem.texture,
				undefined,
				{
					isStatic: true,
					isSensor: true,
					label: `item-${itemData.itemId}`
				}
			);
			sprite.setCollisionCategory(CATEGORY.PICKUP);
			sprite.setCollidesWith([CATEGORY.PLAYER]);
			sprite.setData('type', 'adventure-item');
			sprite.setData('itemId', itemData.itemId);
			sprite.setDepth(7);
			sprite.setScale(1.5);

			// Golden glow tween
			const tween = this.tweens.add({
				targets: sprite,
				y: itemData.y - 10,
				scaleX: 1.8,
				scaleY: 1.8,
				duration: 1200,
				yoyo: true,
				repeat: -1,
				ease: 'Sine.easeInOut'
			});

			// Star particle effect around item
			const emitter = this.add.particles(itemData.x, itemData.y, 'particle', {
				speed: { min: 5, max: 20 },
				scale: { start: 0.5, end: 0 },
				alpha: { start: 0.6, end: 0 },
				lifespan: { min: 600, max: 1200 },
				blendMode: 'ADD',
				tint: [0xffcc44, 0xffee88, 0xffffff],
				frequency: 300,
				quantity: 1
			});
			emitter.setDepth(6);

			this.itemSprites.push({ sprite, tween, emitter, data: itemData });
		}
	}

	private checkItemProximity() {
		if (this.player.dead) return;

		for (let i = this.itemSprites.length - 1; i >= 0; i--) {
			const item = this.itemSprites[i];
			if (!item.sprite.active) {
				this.itemSprites.splice(i, 1);
				continue;
			}

			const dist = Phaser.Math.Distance.Between(
				this.player.sprite.x,
				this.player.sprite.y,
				item.sprite.x,
				item.sprite.y
			);

			if (dist < 80) {
				this.collectItem(item, i);
			}
		}
	}

	private collectItem(
		item: {
			sprite: Phaser.Physics.Matter.Sprite;
			tween: Phaser.Tweens.Tween;
			emitter: Phaser.GameObjects.Particles.ParticleEmitter;
			data: ItemSpawn;
		},
		index: number
	) {
		const catalogItem = ITEM_CATALOG[item.data.itemId];
		if (!catalogItem) return;

		const x = item.sprite.x;
		const y = item.sprite.y;

		// Add to inventory
		this.inventory.set(catalogItem.id, catalogItem);
		this.collectedItems.add(catalogItem.id);

		// Floating text: item name + description
		const nameText = this.add
			.text(x, y - 20, catalogItem.name, {
				fontSize: '14px',
				color: '#ffcc44',
				fontFamily: 'monospace',
				fontStyle: 'bold'
			})
			.setOrigin(0.5)
			.setDepth(25);

		const descText = this.add
			.text(x, y, catalogItem.description, {
				fontSize: '11px',
				color: '#ffee88',
				fontFamily: 'monospace',
				fontStyle: 'italic'
			})
			.setOrigin(0.5)
			.setDepth(25);

		this.tweens.add({
			targets: [nameText, descText],
			y: '-=50',
			alpha: 0,
			duration: 2500,
			onComplete: () => {
				nameText.destroy();
				descText.destroy();
			}
		});

		// Collection burst particles
		const burst = this.add.particles(x, y, 'particle', {
			speed: { min: 40, max: 120 },
			scale: { start: 1.5, end: 0 },
			alpha: { start: 0.9, end: 0 },
			lifespan: { min: 400, max: 800 },
			blendMode: 'ADD',
			tint: [0xffcc44, 0xffee88, 0xffffff],
			emitting: false
		});
		burst.explode(20);
		this.time.delayedCall(900, () => burst.destroy());

		// Cleanup
		item.tween.stop();
		item.emitter.destroy();
		item.sprite.destroy();
		this.itemSprites.splice(index, 1);

		// Notify HUD
		EventBus.emit('inventory-update', Array.from(this.inventory.values()));
	}

	// ── Easter Eggs ───────────────────────────────────────────────

	private spawnEasterEggs(eggs: EasterEggData[]) {
		for (const eggData of eggs) {
			// Pick a random sprite texture for this egg
			const texKey =
				GameScene.EGG_TEXTURES[eggData.messageIndex % GameScene.EGG_TEXTURES.length];

			const sprite = this.add
				.sprite(eggData.x, eggData.y, texKey)
				.setDepth(5)
				.setAlpha(0.7)
				.setScale(1.2);

			// Gentle float + pulse
			this.tweens.add({
				targets: sprite,
				y: eggData.y - 8,
				scaleX: 1.4,
				scaleY: 1.4,
				alpha: 0.4,
				duration: 2200,
				yoyo: true,
				repeat: -1,
				ease: 'Sine.easeInOut'
			});

			// Slow rotation
			this.tweens.add({
				targets: sprite,
				rotation: Math.PI * 2,
				duration: 8000,
				repeat: -1,
				ease: 'Linear'
			});

			// Hidden text (shown on trigger)
			const text = this.add
				.text(eggData.x, eggData.y - 24, '', {
					fontSize: '16px',
					color: '#5577aa',
					fontFamily: 'monospace',
					align: 'center'
				})
				.setOrigin(0.5)
				.setDepth(15)
				.setAlpha(0);

			this.easterEggObjects.push({ sprite, text, triggered: false, data: eggData });
		}
	}

	private checkEasterEggProximity() {
		if (this.player.dead) return;

		for (const egg of this.easterEggObjects) {
			if (egg.triggered) continue;

			const dist = Phaser.Math.Distance.Between(
				this.player.sprite.x,
				this.player.sprite.y,
				egg.sprite.x,
				egg.sprite.y
			);

			if (dist < 200) {
				this.triggerEasterEgg(egg);
			}
		}
	}

	private triggerEasterEgg(egg: {
		sprite: Phaser.GameObjects.Sprite;
		text: Phaser.GameObjects.Text;
		triggered: boolean;
		data: EasterEggData;
	}) {
		egg.triggered = true;
		const msg = EASTER_EGG_MESSAGES[egg.data.messageIndex % EASTER_EGG_MESSAGES.length];
		const hex = '#' + msg.color.toString(16).padStart(6, '0');

		const x = egg.sprite.x;
		const y = egg.sprite.y;

		// Stop float/pulse tweens on sprite
		this.tweens.killTweensOf(egg.sprite);

		// Flash the sprite
		egg.sprite.setTint(msg.color);
		this.tweens.add({
			targets: egg.sprite,
			alpha: 0.15,
			scaleX: 0.8,
			scaleY: 0.8,
			duration: 1500,
			ease: 'Quad.easeOut'
		});

		// Show the message text
		egg.text.setText(msg.text);
		egg.text.setColor(hex);
		egg.text.setShadow(0, 0, hex, 8, true, true);
		egg.text.setPosition(x, y - 28);

		// Discovery particles burst
		const emitter = this.add.particles(x, y, 'particle', {
			speed: { min: 30, max: 80 },
			scale: { start: 1, end: 0 },
			alpha: { start: 0.8, end: 0 },
			lifespan: { min: 400, max: 800 },
			blendMode: 'ADD',
			tint: [msg.color, 0xffffff],
			emitting: false
		});
		emitter.explode(15);
		this.time.delayedCall(900, () => emitter.destroy());

		// Text fade in, hold, then dim
		this.tweens.add({
			targets: egg.text,
			alpha: 1,
			y: y - 40,
			duration: 400,
			hold: 4000,
			yoyo: true,
			onComplete: () => {
				egg.text.setAlpha(0.25);
				egg.text.setColor('#556677');
				egg.text.setFontSize(11);
				egg.text.setShadow(0, 0, '#335566', 3, true, true);
				egg.text.setPosition(x, y - 28);
			}
		});
	}

	// ── Text Blobs ────────────────────────────────────────────────

	private spawnTextBlobs(blobs: TextBlobData[]) {
		for (const blobData of blobs) {
			const content = getFragment(blobData.fragmentIndex);
			const text = this.add
				.text(blobData.x, blobData.y, content, {
					fontSize: '13px',
					color: '#6688aa',
					fontFamily: 'monospace',
					wordWrap: { width: 200 },
					align: 'center'
				})
				.setOrigin(0.5)
				.setDepth(5)
				.setAlpha(0.7);

			// Add shadow/glow
			text.setShadow(0, 0, '#4488cc', 4, true, true);

			// Create a Matter body for the text
			const w = Math.max(text.width, 40) + 20;
			const h = Math.max(text.height, 20) + 16;
			const body = this.matter.add.rectangle(blobData.x, blobData.y, w, h, {
				frictionAir: 0.005,
				restitution: 0.4,
				label: 'textBlob',
				density: 0.001
			});

			// Set collision filter on the raw body
			body.collisionFilter.category = CATEGORY.ASTEROID;
			body.collisionFilter.mask =
				CATEGORY.PLAYER_BULLET | CATEGORY.WALL | CATEGORY.ASTEROID;

			const hp = Math.max(2, Math.ceil(content.split(' ').length / 2));
			this.textBlobObjects.push({ text, body, hp, content, fragmentIndex: blobData.fragmentIndex, discovered: false });
		}
	}

	private checkTextBlobBulletHits() {
		// Sync text positions to their physics bodies + check discovery proximity
		for (let i = this.textBlobObjects.length - 1; i >= 0; i--) {
			const blob = this.textBlobObjects[i];
			blob.text.setPosition(blob.body.position.x, blob.body.position.y);
			blob.text.setRotation(blob.body.angle);

			// One-time discovery when player is near
			if (!this.player.dead && !blob.discovered) {
				const dist = Phaser.Math.Distance.Between(
					this.player.sprite.x,
					this.player.sprite.y,
					blob.body.position.x,
					blob.body.position.y
				);
				if (dist < 300) {
					this.discoverTextBlob(blob);
				}
			}
		}
	}

	private discoverTextBlob(blob: (typeof this.textBlobObjects)[number]) {
		if (blob.discovered) return;
		blob.discovered = true;

		const fragData = getFragmentData(blob.fragmentIndex);
		if (fragData.slug) {
			EventBus.emit('content-discovered', {
				slug: fragData.slug,
				type: fragData.type,
				title: fragData.title
			});
		}

		// Visual feedback: brighten text
		blob.text.setColor('#aaddff');
		blob.text.setShadow(0, 0, '#66bbff', 8, true, true);

		// Particle burst
		const bx = blob.body.position.x;
		const by = blob.body.position.y;
		const emitter = this.add.particles(bx, by, 'particle', {
			speed: { min: 20, max: 60 },
			scale: { start: 0.8, end: 0 },
			alpha: { start: 0.6, end: 0 },
			lifespan: { min: 400, max: 800 },
			blendMode: 'ADD',
			tint: [0x4488cc, 0x66bbff, 0xffffff],
			emitting: false
		});
		emitter.explode(10);
		this.time.delayedCall(900, () => emitter.destroy());

		// Floating "TRANSMISSION RECEIVED" text
		const txText = this.add
			.text(bx, by - 30, 'TRANSMISSION RECEIVED', {
				fontSize: '8px',
				color: '#66bbff',
				fontFamily: '"Press Start 2P", monospace'
			})
			.setOrigin(0.5)
			.setDepth(25);
		this.tweens.add({
			targets: txText,
			y: by - 70,
			alpha: 0,
			duration: 2000,
			onComplete: () => txText.destroy()
		});
	}

	private bulletHitTextBlob(
		bullet: Phaser.GameObjects.GameObject,
		blobBody: MatterJS.BodyType
	) {
		if (!bullet.active) return;

		const blob = this.textBlobObjects.find((b) => b.body === blobBody);
		if (!blob) return;

		const damage = (bullet as any).getData?.('damage') ?? 1;
		blob.hp -= damage;

		(bullet as Phaser.GameObjects.GameObject).destroy();

		if (blob.hp <= 0) {
			this.destroyTextBlob(blob);
			this.score += 15;
		} else {
			// Hit flash
			blob.text.setColor('#ffffff');
			this.time.delayedCall(80, () => {
				blob.text.setColor('#6688aa');
			});
		}
	}

	private destroyTextBlob(blob: (typeof this.textBlobObjects)[number]) {
		// Discover content if not already discovered (rewards aggressive play too)
		this.discoverTextBlob(blob);

		const x = blob.body.position.x;
		const y = blob.body.position.y;

		// Scatter individual words
		const words = blob.content.split(/\s+/);
		for (const word of words) {
			if (!word.trim()) continue;
			const wordText = this.add
				.text(x, y, word, {
					fontSize: '11px',
					color: '#4488cc',
					fontFamily: 'monospace'
				})
				.setOrigin(0.5)
				.setAlpha(0.8)
				.setDepth(15);

			this.tweens.add({
				targets: wordText,
				x: x + Phaser.Math.FloatBetween(-200, 200),
				y: y + Phaser.Math.FloatBetween(-200, 200),
				alpha: 0,
				rotation: Phaser.Math.FloatBetween(-Math.PI, Math.PI),
				duration: Phaser.Math.Between(1000, 2000),
				onComplete: () => wordText.destroy()
			});
		}

		// Remove from world
		this.matter.world.remove(blob.body);
		blob.text.destroy();
		const idx = this.textBlobObjects.indexOf(blob);
		if (idx >= 0) this.textBlobObjects.splice(idx, 1);
	}

	// ── Sensor Beacon ─────────────────────────────────────────────

	private spawnSensorBeacon(pos: { x: number; y: number }) {
		this.sensorBeacon = this.matter.add.sprite(
			pos.x,
			pos.y,
			'sensor-beacon',
			undefined,
			{
				isStatic: true,
				isSensor: true,
				label: 'sensor-beacon'
			}
		);
		this.sensorBeacon.setCollisionCategory(CATEGORY.SENSOR);
		this.sensorBeacon.setCollidesWith([CATEGORY.PLAYER]);
		this.sensorBeacon.setData('type', 'sensor-beacon');
		this.sensorBeacon.setDepth(6);

		this.beaconTween = this.tweens.add({
			targets: this.sensorBeacon,
			scaleX: 1.3,
			scaleY: 1.3,
			alpha: 0.6,
			duration: 800,
			yoyo: true,
			repeat: -1,
			ease: 'Sine.easeInOut'
		});
	}

	private activateSensor() {
		if (!this.sensorBeacon) return;

		const bx = this.sensorBeacon.x;
		const by = this.sensorBeacon.y;

		// Scan current sector + neighbors (toroidal)
		for (let dx = -SENSOR_BEACON.SCAN_RADIUS; dx <= SENSOR_BEACON.SCAN_RADIUS; dx++) {
			for (let dy = -SENSOR_BEACON.SCAN_RADIUS; dy <= SENSOR_BEACON.SCAN_RADIUS; dy++) {
				const sx = (this.sectorX + dx + SECTOR.GRID_SIZE) % SECTOR.GRID_SIZE;
				const sy = (this.sectorY + dy + SECTOR.GRID_SIZE) % SECTOR.GRID_SIZE;
				const key = `${sx},${sy}`;
				this.scannedSectors.add(key);
				const sData = this.sectorGenerator.generate(sx, sy);
				this.scannedSectorTypes.set(key, sData.type);
			}
		}

		// "SECTOR SCANNED" floating text
		const text = this.add
			.text(bx, by - 30, 'SECTOR SCANNED', {
				fontSize: '14px',
				color: '#44eeff',
				fontFamily: 'monospace'
			})
			.setOrigin(0.5)
			.setDepth(20);

		this.tweens.add({
			targets: text,
			y: text.y - 40,
			alpha: 0,
			duration: 1500,
			onComplete: () => text.destroy()
		});

		// Activation particles (burst)
		const emitter = this.add.particles(bx, by, 'particle', {
			speed: { min: 40, max: 120 },
			scale: { start: 1, end: 0 },
			alpha: { start: 0.8, end: 0 },
			lifespan: { min: 300, max: 600 },
			blendMode: 'ADD',
			tint: [0x00ccff, 0x44eeff, 0x88ffff],
			emitting: false
		});
		emitter.explode(12);
		this.time.delayedCall(700, () => emitter.destroy());

		// Expanding scan ring
		const ring = this.add.circle(bx, by, 10, 0x44eeff, 0.5).setDepth(19);
		this.tweens.add({
			targets: ring,
			scaleX: 15,
			scaleY: 15,
			alpha: 0,
			duration: 800,
			onComplete: () => ring.destroy()
		});

		// Kill the infinite beacon tween before destroying
		if (this.beaconTween) {
			this.beaconTween.stop();
			this.beaconTween = null;
		}
		this.sensorBeacon.destroy();
		this.sensorBeacon = null;
	}

	// ── Asteroids ──────────────────────────────────────────────────

	private spawnAsteroids(count: number) {
		// Deterministically pick which asteroid is the Kilroy asteroid
		const kilroyIdx = count > 2
			? ((this.currentSectorData?.seed ?? 0) * 7) % count
			: -1;
		let spawnedCount = 0;

		for (let i = 0; i < count; i++) {
			const x = Phaser.Math.Between(100, SECTOR.SIZE - 100);
			const y = Phaser.Math.Between(100, SECTOR.SIZE - 100);

			// Don't spawn too close to player
			const dx = x - this.player.sprite.x;
			const dy = y - this.player.sprite.y;
			if (Math.sqrt(dx * dx + dy * dy) < 300) continue;

			const scale = Phaser.Math.FloatBetween(0.8, 2.5);
			// Texture is 32x32 with drawn circle radius 14.
			// Use base radius so setScale handles both visual + physics together.
			const ast = this.matter.add.sprite(x, y, 'asteroid', undefined, {
				shape: { type: 'circle', radius: 14 },
				frictionAir: 0.001,
				restitution: 0.6,
				density: 0.003,
				label: 'asteroid'
			});

			ast.setScale(scale);
			ast.setCollisionCategory(CATEGORY.ASTEROID);
			ast.setCollidesWith([
				CATEGORY.PLAYER,
				CATEGORY.PLAYER_BULLET,
				CATEGORY.ENEMY,
				CATEGORY.ENEMY_BULLET,
				CATEGORY.ASTEROID,
				CATEGORY.WALL
			]);
			ast.setAngularVelocity(Phaser.Math.FloatBetween(-0.03, 0.03));
			ast.setVelocity(
				Phaser.Math.FloatBetween(-1.5, 1.5),
				Phaser.Math.FloatBetween(-1.5, 1.5)
			);
			ast.setData('type', 'asteroid');
			const astHp = Math.ceil(scale * 3);
			ast.setData('hp', astHp);
			ast.setData('maxHp', astHp);
			ast.setDepth(5);

			// Flag one asteroid as Kilroy
			if (spawnedCount === kilroyIdx) {
				ast.setData('kilroy', true);
				ast.setTint(0xbbaa88); // Slightly different tint
			}

			this.asteroids.push(ast);
			spawnedCount++;
		}
	}

	// ── Health Rings ───────────────────────────────────────────────

	private drawHealthRings() {
		const gfx = this.healthRingsGfx;
		gfx.clear();

		// Player rings — only show when not at full
		if (!this.player.dead && this.player.sprite.visible) {
			const px = this.player.sprite.x;
			const py = this.player.sprite.y;

			const hullFrac = this.player.getHealthFraction();
			if (hullFrac < 1) {
				const hullHue = hullFrac * 120;
				const hullColor = Phaser.Display.Color.HSLToColor(hullHue / 360, 0.9, 0.5);
				this.drawRing(gfx, px, py, 24, hullFrac, hullColor.color, 0.45);
			}

			const shieldFrac = this.player.getShieldFraction();
			if (this.player.shields > 0 && shieldFrac < 1) {
				this.drawRing(gfx, px, py, 30, shieldFrac, 0x44eeff, 0.35);
			}
		}

		// Enemy rings — only show when damaged
		for (const enemy of this.enemies) {
			if (enemy.dead || !enemy.sprite.active) continue;
			const frac = enemy.hp / enemy.maxHp;
			if (frac >= 1) continue;
			this.drawRing(gfx, enemy.sprite.x, enemy.sprite.y, 22, frac, 0xff4444, 0.4);
		}

		// Asteroid rings — only show when damaged
		for (const ast of this.asteroids) {
			if (!ast.active) continue;
			const hp = ast.getData('hp') ?? 1;
			const maxHp = ast.getData('maxHp') ?? hp;
			if (hp >= maxHp) continue;
			const frac = hp / maxHp;
			const ringRadius = (ast.scaleX ?? 1) * 18;
			this.drawRing(gfx, ast.x, ast.y, ringRadius, frac, 0xaa8866, 0.4);
		}
	}

	private drawRing(
		gfx: Phaser.GameObjects.Graphics,
		x: number,
		y: number,
		radius: number,
		fraction: number,
		color: number,
		alpha: number
	) {
		gfx.lineStyle(4, 0x333344, 0.12);
		gfx.strokeCircle(x, y, radius);

		if (fraction > 0) {
			const startAngle = -Math.PI / 2;
			const endAngle = startAngle + fraction * Math.PI * 2;
			gfx.lineStyle(4, color, alpha);
			gfx.beginPath();
			gfx.arc(x, y, radius, startAngle, endAngle, false, 0.02);
			gfx.strokePath();
		}
	}

	// ── Collisions ─────────────────────────────────────────────────

	private setupCollisions() {
		this.matter.world.on(
			'collisionstart',
			(event: Phaser.Physics.Matter.Events.CollisionStartEvent) => {
				for (const pair of event.pairs) {
					this.handleCollisionPair(pair.bodyA, pair.bodyB);
				}
			}
		);
	}

	private handleCollisionPair(bodyA: MatterJS.BodyType, bodyB: MatterJS.BodyType) {
		const la = bodyA.label;
		const lb = bodyB.label;
		const goA = bodyA.gameObject as Phaser.Physics.Matter.Sprite | null;
		const goB = bodyB.gameObject as Phaser.Physics.Matter.Sprite | null;

		// Text blob collisions (body has no gameObject — it's a raw rectangle)
		if (la === 'playerBullet' && lb === 'textBlob') {
			if (goA) this.bulletHitTextBlob(goA, bodyB);
			return;
		} else if (lb === 'playerBullet' && la === 'textBlob') {
			if (goB) this.bulletHitTextBlob(goB, bodyA);
			return;
		}

		// Rest of collisions require both gameObjects
		if (!goA || !goB) return;

		// Player bullet → asteroid
		if (la === 'playerBullet' && lb === 'asteroid') {
			this.bulletHitAsteroid(goA, goB);
		} else if (lb === 'playerBullet' && la === 'asteroid') {
			this.bulletHitAsteroid(goB, goA);
		}

		// Player → asteroid
		else if (la === 'player' && lb === 'asteroid') {
			this.playerHitAsteroid(goB);
		} else if (lb === 'player' && la === 'asteroid') {
			this.playerHitAsteroid(goA);
		}

		// Player bullet → enemy
		else if (la === 'playerBullet' && lb.startsWith('enemy-')) {
			this.bulletHitEnemy(goA, goB);
		} else if (lb === 'playerBullet' && la.startsWith('enemy-')) {
			this.bulletHitEnemy(goB, goA);
		}

		// Enemy bullet → player
		else if (la === 'enemyBullet' && lb === 'player') {
			this.enemyBulletHitPlayer(goA);
		} else if (lb === 'enemyBullet' && la === 'player') {
			this.enemyBulletHitPlayer(goB);
		}

		// Player → enemy (contact damage)
		else if (la === 'player' && lb.startsWith('enemy-')) {
			this.playerHitEnemy(goB);
		} else if (lb === 'player' && la.startsWith('enemy-')) {
			this.playerHitEnemy(goA);
		}

		// Enemy → asteroid (environmental)
		else if (la.startsWith('enemy-') && lb === 'asteroid') {
			this.enemyHitAsteroid(goA, goB);
		} else if (lb.startsWith('enemy-') && la === 'asteroid') {
			this.enemyHitAsteroid(goB, goA);
		}

		// Player → planet
		else if (la === 'player' && lb === 'planet') {
			this.playerHitPlanet();
		} else if (lb === 'player' && la === 'planet') {
			this.playerHitPlanet();
		}

		// Enemy → planet
		else if (la.startsWith('enemy-') && lb === 'planet') {
			this.enemyHitPlanet(goA);
		} else if (lb.startsWith('enemy-') && la === 'planet') {
			this.enemyHitPlanet(goB);
		}

		// Asteroid → planet
		else if (la === 'asteroid' && lb === 'planet') {
			this.destroyAsteroid(goA);
		} else if (lb === 'asteroid' && la === 'planet') {
			this.destroyAsteroid(goB);
		}

		// Bullet → planet (destroy bullet + leave crater mark)
		else if ((la === 'playerBullet' || la === 'enemyBullet') && lb === 'planet') {
			this.bulletHitPlanet(goA, goB);
		} else if ((lb === 'playerBullet' || lb === 'enemyBullet') && la === 'planet') {
			this.bulletHitPlanet(goB, goA);
		}
	}

	private bulletHitAsteroid(
		bullet: Phaser.Physics.Matter.Sprite,
		asteroid: Phaser.Physics.Matter.Sprite
	) {
		if (!bullet.active || !asteroid.active) return;

		const damage = bullet.getData('damage') ?? 1;
		const hp = (asteroid.getData('hp') ?? 1) - damage;
		asteroid.setData('hp', hp);
		bullet.destroy();

		if (hp <= 0) {
			this.destroyAsteroid(asteroid);
			this.score += 25;
		} else {
			asteroid.setTint(0xffffff);
			this.time.delayedCall(80, () => {
				if (asteroid.active) asteroid.clearTint();
			});
		}
	}

	private bulletHitEnemy(
		bullet: Phaser.Physics.Matter.Sprite,
		enemySprite: Phaser.Physics.Matter.Sprite
	) {
		if (!bullet.active || !enemySprite.active) return;

		const enemy = enemySprite.getData('entity') as Enemy | undefined;
		if (!enemy || enemy.dead) {
			bullet.destroy();
			return;
		}

		const damage = bullet.getData('damage') ?? 1;
		const killed = enemy.takeDamage(damage);
		bullet.destroy();

		if (killed) {
			this.score += enemy.scoreValue;
			enemy.destroy();
		}
	}

	private enemyBulletHitPlayer(bullet: Phaser.Physics.Matter.Sprite) {
		if (!bullet.active || this.player.dead) return;
		const damage = bullet.getData('damage') ?? 1;
		this.player.takeDamage(damage);
		bullet.destroy();
	}

	private playerHitEnemy(enemySprite: Phaser.Physics.Matter.Sprite) {
		if (!enemySprite.active || this.player.dead) return;

		const enemy = enemySprite.getData('entity') as Enemy | undefined;
		if (!enemy || enemy.dead) return;

		this.player.takeDamage(1);
		const killed = enemy.takeDamage(1);
		if (killed) {
			this.score += enemy.scoreValue;
			enemy.destroy();
		}
	}

	private enemyHitAsteroid(
		enemySprite: Phaser.Physics.Matter.Sprite,
		asteroid: Phaser.Physics.Matter.Sprite
	) {
		if (!enemySprite.active || !asteroid.active) return;

		const enemy = enemySprite.getData('entity') as Enemy | undefined;
		if (!enemy || enemy.dead) return;

		const killed = enemy.takeDamage(1);
		if (killed) {
			this.score += enemy.scoreValue;
			enemy.destroy();
		}

		const hp = (asteroid.getData('hp') ?? 1) - 1;
		asteroid.setData('hp', hp);
		if (hp <= 0) {
			this.destroyAsteroid(asteroid);
		}
	}

	private playerHitPlanet() {
		if (this.player.dead) return;
		this.player.takeDamage(PLANET.COLLISION_DAMAGE_PLAYER);
	}

	private enemyHitPlanet(enemySprite: Phaser.Physics.Matter.Sprite) {
		if (!enemySprite.active) return;
		const enemy = enemySprite.getData('entity') as Enemy | undefined;
		if (!enemy || enemy.dead) return;

		const killed = enemy.takeDamage(PLANET.COLLISION_DAMAGE_ENEMY);
		if (killed) {
			this.score += enemy.scoreValue;
			enemy.destroy();
		}
	}

	private destroyAsteroid(asteroid: Phaser.Physics.Matter.Sprite) {
		if (!asteroid.active) return;

		const x = asteroid.x;
		const y = asteroid.y;
		const isKilroy = asteroid.getData('kilroy') === true;

		const emitter = this.add.particles(x, y, 'particle', {
			speed: { min: 30, max: 120 },
			scale: { start: 1.2, end: 0 },
			alpha: { start: 0.9, end: 0 },
			lifespan: { min: 300, max: 600 },
			blendMode: 'ADD',
			tint: [0x887766, 0xaa9977, 0x665544],
			quantity: Phaser.Math.Between(6, 12)
		});
		this.time.delayedCall(700, () => emitter.destroy());

		const idx = this.asteroids.indexOf(asteroid);
		if (idx >= 0) this.asteroids.splice(idx, 1);
		asteroid.destroy();

		// Kilroy asteroid spawns the black hole
		if (isKilroy && !this.kilroyBlackHole) {
			this.spawnKilroyBlackHole(x, y);
		}
	}

	private playerHitAsteroid(asteroid: Phaser.Physics.Matter.Sprite) {
		if (!asteroid.active || this.player.dead) return;
		this.player.takeDamage(1);
		this.destroyAsteroid(asteroid);
	}

	// ── Planet Visual Damage ─────────────────────────────────────

	private bulletHitPlanet(
		bullet: Phaser.Physics.Matter.Sprite,
		planet: Phaser.Physics.Matter.Sprite
	) {
		if (!bullet.active) return;

		// Add a crater at the bullet impact point
		const bx = bullet.x;
		const by = bullet.y;
		const craterR = Phaser.Math.FloatBetween(3, 8);
		this.planetCraters.push({ x: bx, y: by, r: craterR });

		// Draw the craters
		this.redrawPlanetCraters();

		// Small impact particles
		const emitter = this.add.particles(bx, by, 'particle', {
			speed: { min: 10, max: 40 },
			scale: { start: 0.5, end: 0 },
			alpha: { start: 0.6, end: 0 },
			lifespan: 300,
			blendMode: 'ADD',
			tint: [0x664422, 0x886644],
			emitting: false
		});
		emitter.explode(3);
		this.time.delayedCall(400, () => emitter.destroy());

		bullet.destroy();
	}

	private redrawPlanetCraters() {
		const gfx = this.planetCraterGfx;
		gfx.clear();
		for (const crater of this.planetCraters) {
			// Dark crater
			gfx.fillStyle(0x111111, 0.4);
			gfx.fillCircle(crater.x, crater.y, crater.r);
			// Rim highlight
			gfx.lineStyle(1, 0x443322, 0.3);
			gfx.strokeCircle(crater.x, crater.y, crater.r);
		}
	}

	// ── Kilroy Black Hole ────────────────────────────────────────

	private spawnKilroyBlackHole(x: number, y: number) {
		// Dramatic spawn
		this.cameras.main.shake(500, 0.01);

		// Particles imploding
		const implosion = this.add.particles(x, y, 'particle', {
			speed: { min: 80, max: 200 },
			scale: { start: 2, end: 0 },
			alpha: { start: 1, end: 0 },
			lifespan: 800,
			blendMode: 'ADD',
			tint: [0x442200, 0xff8844, 0xffffff],
			emitting: false
		});
		implosion.explode(25);
		this.time.delayedCall(900, () => implosion.destroy());

		// "KILROY WAS HERE" floating text
		const text = this.add
			.text(x, y - 60, 'KILROY WAS HERE', {
				fontSize: '18px',
				color: '#ff8844',
				fontFamily: 'monospace',
				fontStyle: 'bold'
			})
			.setOrigin(0.5)
			.setDepth(25);

		this.tweens.add({
			targets: text,
			y: text.y - 40,
			alpha: 0,
			duration: 3000,
			onComplete: () => text.destroy()
		});

		// Spawn the Kilroy sprite (peeking over wall)
		const sprite = this.add
			.sprite(x, y, 'kilroy')
			.setScale(0.08)
			.setDepth(8)
			.setAlpha(0);

		// Dramatic fade-in
		this.tweens.add({
			targets: sprite,
			alpha: 1,
			scaleX: 0.12,
			scaleY: 0.12,
			duration: 1500,
			ease: 'Back.easeOut'
		});

		// Slow rotation
		this.tweens.add({
			targets: sprite,
			rotation: Math.PI * 2,
			duration: 12000,
			repeat: -1,
			ease: 'Linear'
		});

		// Accretion disk particle effect
		const disk = this.add.particles(x, y, 'particle', {
			speed: { min: 15, max: 50 },
			scale: { start: 0.8, end: 0 },
			alpha: { start: 0.5, end: 0 },
			lifespan: { min: 1000, max: 2000 },
			blendMode: 'ADD',
			tint: [0xff4400, 0xff8844, 0xffcc88],
			frequency: 60,
			quantity: 1
		});
		disk.setDepth(7);
		sprite.setData('diskEmitter', disk);

		this.kilroyBlackHole = { sprite, x, y };
	}

	private checkKilroyBlackHole(time: number) {
		if (!this.kilroyBlackHole || this.player.dead) return;

		const kx = this.kilroyBlackHole.x;
		const ky = this.kilroyBlackHole.y;
		const px = this.player.sprite.x;
		const py = this.player.sprite.y;
		const dx = kx - px;
		const dy = ky - py;
		const dist = Math.sqrt(dx * dx + dy * dy);

		// Very strong gravity — much stronger than planets
		if (dist < 600 && dist > 20) {
			const normalizedDist = dist / 600;
			const forceMag = 0.015 * (1 - normalizedDist) * (1 - normalizedDist);
			const cappedForce = Math.min(forceMag, 0.04);
			const fx = (dx / dist) * cappedForce;
			const fy = (dy / dist) * cappedForce;
			this.player.sprite.applyForce(new Phaser.Math.Vector2(fx, fy));
		}

		// Also pull enemies and asteroids
		for (const enemy of this.enemies) {
			if (enemy.dead || !enemy.sprite.active) continue;
			const edx = kx - enemy.sprite.x;
			const edy = ky - enemy.sprite.y;
			const eDist = Math.sqrt(edx * edx + edy * edy);
			if (eDist < 400 && eDist > 20) {
				const force = 0.008 * (1 - eDist / 400);
				enemy.sprite.applyForce(
					new Phaser.Math.Vector2((edx / eDist) * force, (edy / eDist) * force)
				);
			}
		}

		// Teleport on contact
		if (dist < 40 && time > this.kilroyTeleportCooldown) {
			this.kilroyTeleport();
		}
	}

	private kilroyTeleport() {
		// Teleport player to a random sector!
		const destX = Phaser.Math.Between(0, SECTOR.GRID_SIZE - 1);
		const destY = Phaser.Math.Between(0, SECTOR.GRID_SIZE - 1);

		this.playTransitionEffect(
			0xff4400,
			1500,
			() => {
				this.clearSector();
				this.sectorX = destX;
				this.sectorY = destY;
				this.player.sprite.setPosition(SECTOR.SIZE / 2, SECTOR.SIZE / 2);
				this.player.sprite.setVelocity(0, 0);
				this.kilroyTeleportCooldown = this.time.now + 3000;
				this.generateSectorContent();
			},
			() => {
				this.transitioning = false;
			}
		);
		this.transitioning = true;
	}

	// ── Meme Debris ──────────────────────────────────────────────

	private static readonly MEME_TEXTURES = [
		'meme-doge',
		'meme-nyan',
		'meme-harambe',
		'meme-blb',
		'meme-success',
		'meme-toothfairy',
		'meme-operator'
	];

	private spawnMemeDebris(seed: number) {
		// ~20% chance per sector, deterministic
		const rng = ((seed * 2654435761) >>> 0) / 4294967296;
		if (rng > 0.2) return;

		const memeIdx = seed % GameScene.MEME_TEXTURES.length;
		const texture = GameScene.MEME_TEXTURES[memeIdx];
		const margin = 500;
		const range = SECTOR.SIZE - margin * 2;
		const rng2 = ((seed * 1597334677) >>> 0) / 4294967296;
		const rng3 = ((seed * 789456123) >>> 0) / 4294967296;
		const x = margin + rng2 * range;
		const y = margin + rng3 * range;

		const sprite = this.add
			.sprite(x, y, texture)
			.setScale(0.15)
			.setAlpha(0.3)
			.setDepth(2)
			.setRotation(rng * Math.PI * 2);

		// Gentle drift
		this.tweens.add({
			targets: sprite,
			x: x + Phaser.Math.FloatBetween(-50, 50),
			y: y + Phaser.Math.FloatBetween(-50, 50),
			rotation: sprite.rotation + Math.PI * 0.5,
			alpha: 0.15,
			duration: 20000,
			yoyo: true,
			repeat: -1,
			ease: 'Sine.easeInOut'
		});

		this.memeSprites.push(sprite);
	}

	// ── Ambient Life: Patrol Ships ──────────────────────────────────

	private spawnPatrolShips(seed: number, sectorType: string) {
		// Patrol ships appear in patrol and empty sectors
		if (sectorType !== 'patrol' && sectorType !== 'empty') return;

		const rng = ((seed * 3141592653) >>> 0) / 4294967296;
		const count = sectorType === 'patrol' ? 2 + Math.floor(rng * 2) : (rng < 0.4 ? 1 : 0);
		if (count === 0) return;

		for (let i = 0; i < count; i++) {
			const rngI = ((seed * (i + 1) * 2718281828) >>> 0) / 4294967296;
			const rngJ = ((seed * (i + 1) * 1618033988) >>> 0) / 4294967296;

			// Generate 3-4 waypoints in the sector
			const wpCount = 3 + Math.floor(rngI * 2);
			const waypoints: { x: number; y: number }[] = [];
			for (let w = 0; w < wpCount; w++) {
				const wRng1 = ((seed * (w + 7) * (i + 3) * 987654321) >>> 0) / 4294967296;
				const wRng2 = ((seed * (w + 11) * (i + 5) * 123456789) >>> 0) / 4294967296;
				waypoints.push({
					x: 400 + wRng1 * (SECTOR.SIZE - 800),
					y: 400 + wRng2 * (SECTOR.SIZE - 800)
				});
			}

			const startX = waypoints[0].x;
			const startY = waypoints[0].y;

			const sprite = this.add
				.sprite(startX, startY, 'patrol-ship')
				.setScale(1.2)
				.setAlpha(0.8)
				.setDepth(5);

			// Engine glow trail
			const emitter = this.add.particles(0, 0, 'particle', {
				speed: { min: 10, max: 30 },
				scale: { start: 0.5, end: 0 },
				alpha: { start: 0.4, end: 0 },
				lifespan: { min: 300, max: 600 },
				blendMode: 'ADD',
				tint: [0x44aa88, 0x66ccaa],
				frequency: 80,
				follow: sprite
			});
			emitter.setDepth(4);
			sprite.setData('emitter', emitter);

			this.patrolShips.push({
				sprite,
				waypoints,
				waypointIdx: 0,
				speed: 1.0 + rngJ * 0.8
			});
		}
	}

	private updatePatrolShips() {
		for (const patrol of this.patrolShips) {
			if (!patrol.sprite.active) continue;

			const wp = patrol.waypoints[patrol.waypointIdx];
			const dx = wp.x - patrol.sprite.x;
			const dy = wp.y - patrol.sprite.y;
			const dist = Math.sqrt(dx * dx + dy * dy);

			// Rotate to face direction of travel
			const angle = Math.atan2(dy, dx);
			patrol.sprite.setRotation(angle);

			if (dist < 30) {
				// Reached waypoint, go to next
				patrol.waypointIdx = (patrol.waypointIdx + 1) % patrol.waypoints.length;
			} else {
				// Move toward waypoint
				patrol.sprite.x += (dx / dist) * patrol.speed;
				patrol.sprite.y += (dy / dist) * patrol.speed;
			}
		}
	}

	// ── Ambient Life: Distress Beacons ─────────────────────────────

	private static readonly DISTRESS_MESSAGES = [
		'SOS... life support failing...',
		'Mayday! Engines offline...',
		'Signal lost... coordinates corrupt...',
		'Emergency beacon activated...',
		'Hull breach... crew evacuated...',
		'Unknown entity detected nearby...',
		'Power core unstable... stay clear...',
		'Automated distress... no crew aboard...'
	];

	private spawnDistressBeacons(planets: PlanetData[]) {
		// ~30% of planets emit a distress signal
		for (const planet of planets) {
			const rng = ((planet.x * 31 + planet.y * 17) >>> 0) % 100;
			if (rng > 30) continue;

			// Position beacon in orbit around the planet
			const orbitAngle = (rng / 30) * Math.PI * 2;
			const orbitDist = planet.radius + 60;
			const bx = planet.x + Math.cos(orbitAngle) * orbitDist;
			const by = planet.y + Math.sin(orbitAngle) * orbitDist;

			const sprite = this.add
				.sprite(bx, by, 'distress-beacon')
				.setScale(1.0)
				.setAlpha(0.9)
				.setDepth(6);

			// Pulsing animation
			this.tweens.add({
				targets: sprite,
				scale: 1.4,
				alpha: 0.4,
				duration: 800,
				yoyo: true,
				repeat: -1,
				ease: 'Sine.easeInOut'
			});

			// Hidden text (shown on proximity)
			const msgIdx = rng % GameScene.DISTRESS_MESSAGES.length;
			const text = this.add
				.text(bx, by - 20, GameScene.DISTRESS_MESSAGES[msgIdx], {
					fontSize: '9px',
					color: '#ff6666',
					fontFamily: 'monospace',
					align: 'center'
				})
				.setOrigin(0.5, 1)
				.setAlpha(0)
				.setDepth(7);

			this.distressBeacons.push({
				sprite,
				text,
				triggered: false,
				planetX: planet.x,
				planetY: planet.y
			});
		}
	}

	private checkDistressBeaconProximity() {
		if (this.player.dead) return;

		for (const beacon of this.distressBeacons) {
			if (beacon.triggered || !beacon.sprite.active) continue;

			const dist = Phaser.Math.Distance.Between(
				this.player.sprite.x,
				this.player.sprite.y,
				beacon.sprite.x,
				beacon.sprite.y
			);

			if (dist < 150) {
				beacon.triggered = true;
				// Fade in the distress text
				this.tweens.add({
					targets: beacon.text,
					alpha: 1,
					duration: 500,
					hold: 4000,
					yoyo: true,
					onComplete: () => {
						beacon.triggered = false; // Can re-trigger
					}
				});
			}
		}
	}

	// ── Ambient Life: Rogue Asteroids ──────────────────────────────

	private startRogueAsteroids(seed: number) {
		// Periodically launch fast-moving asteroids across the sector
		const rng = ((seed * 4294967291) >>> 0) / 4294967296;
		const interval = 5000 + rng * 8000; // 5-13 seconds between rogues

		this.rogueAsteroidTimer = this.time.addEvent({
			delay: interval,
			callback: () => this.launchRogueAsteroid(),
			loop: true
		});
	}

	private launchRogueAsteroid() {
		if (this.transitioning) return;

		// Pick a random edge to spawn from
		const edge = Phaser.Math.Between(0, 3); // 0=top, 1=right, 2=bottom, 3=left
		let x: number, y: number, vx: number, vy: number;
		const speed = Phaser.Math.FloatBetween(3, 7);

		switch (edge) {
			case 0: // from top
				x = Phaser.Math.Between(200, SECTOR.SIZE - 200);
				y = -50;
				vx = Phaser.Math.FloatBetween(-1, 1);
				vy = speed;
				break;
			case 1: // from right
				x = SECTOR.SIZE + 50;
				y = Phaser.Math.Between(200, SECTOR.SIZE - 200);
				vx = -speed;
				vy = Phaser.Math.FloatBetween(-1, 1);
				break;
			case 2: // from bottom
				x = Phaser.Math.Between(200, SECTOR.SIZE - 200);
				y = SECTOR.SIZE + 50;
				vx = Phaser.Math.FloatBetween(-1, 1);
				vy = -speed;
				break;
			default: // from left
				x = -50;
				y = Phaser.Math.Between(200, SECTOR.SIZE - 200);
				vx = speed;
				vy = Phaser.Math.FloatBetween(-1, 1);
				break;
		}

		const scale = Phaser.Math.FloatBetween(1.0, 3.0);
		const ast = this.matter.add.sprite(x, y, 'asteroid', undefined, {
			shape: { type: 'circle', radius: 14 },
			frictionAir: 0,
			restitution: 0.3,
			density: 0.005,
			label: 'asteroid'
		});

		ast.setScale(scale);
		ast.setCollisionCategory(CATEGORY.ASTEROID);
		ast.setCollidesWith([
			CATEGORY.PLAYER,
			CATEGORY.PLAYER_BULLET,
			CATEGORY.ENEMY,
			CATEGORY.ASTEROID,
			CATEGORY.WALL
		]);
		ast.setVelocity(vx, vy);
		ast.setAngularVelocity(Phaser.Math.FloatBetween(-0.05, 0.05));
		ast.setData('type', 'asteroid');
		const astHp = Math.ceil(scale * 3);
		ast.setData('hp', astHp);
		ast.setData('maxHp', astHp);
		ast.setDepth(5);
		// Slightly different tint so rogues look distinct
		ast.setTint(0x998877);

		this.asteroids.push(ast);

		// Auto-destroy after crossing the sector
		this.time.delayedCall(15000, () => {
			if (ast.active) {
				ast.destroy();
				const idx = this.asteroids.indexOf(ast);
				if (idx !== -1) this.asteroids.splice(idx, 1);
			}
		});
	}

	// ── Transition Effect (Tunnel/Swirl) ──────────────────────────

	private playTransitionEffect(
		color: number,
		duration: number,
		onMidpoint: () => void,
		onComplete: () => void
	) {
		const cam = this.cameras.main;
		const cx = cam.width / 2;
		const cy = cam.height / 2;

		this.tunnelGfx = this.add.graphics().setScrollFactor(0).setDepth(100);

		// Star streak particles
		const particles = this.add
			.particles(cx, cy, 'particle', {
				speed: { min: 300, max: 800 },
				scale: { start: 0.3, end: 1.5 },
				alpha: { start: 0.9, end: 0 },
				lifespan: duration * 0.5,
				blendMode: 'ADD',
				tint: [color, 0xffffff, color],
				emitting: false
			})
			.setScrollFactor(0)
			.setDepth(101);
		particles.explode(40);

		let midpointCalled = false;
		let elapsed = 0;
		const gfx = this.tunnelGfx;

		this.tunnelTimer = this.time.addEvent({
			delay: 16,
			loop: true,
			callback: () => {
				elapsed += 16;
				const progress = Math.min(elapsed / duration, 1);

				gfx.clear();

				// Background darkening (peaks at midpoint)
				const bgAlpha = Math.sin(progress * Math.PI) * 0.85;
				gfx.fillStyle(0x000011, bgAlpha);
				gfx.fillRect(0, 0, cam.width, cam.height);

				// Tunnel rings
				const ringCount = 15;
				for (let i = 0; i < ringCount; i++) {
					const t = ((progress * 4 + i / ringCount) % 1);
					const radius = t * Math.max(cam.width, cam.height) * 0.6;
					const alpha = (1 - t) * 0.5 * Math.sin(progress * Math.PI);
					const twist = t * Math.PI * 4 + elapsed * 0.004;

					if (alpha < 0.02) continue;

					const lineWidth = Math.max(1, (1 - t) * 3);
					gfx.lineStyle(lineWidth, color, alpha);
					gfx.beginPath();

					const steps = 36;
					for (let s = 0; s <= steps; s++) {
						const a = (s / steps) * Math.PI * 2;
						const wobble = 1 + 0.15 * Math.sin(a * 3 + twist);
						const px = cx + Math.cos(a) * radius * wobble;
						const py = cy + Math.sin(a) * radius * wobble * 0.85;
						if (s === 0) gfx.moveTo(px, py);
						else gfx.lineTo(px, py);
					}
					gfx.closePath();
					gfx.strokePath();
				}

				// Center bright point
				const centerSize = 15 * (1 - Math.abs(progress - 0.5) * 2);
				if (centerSize > 1) {
					gfx.fillStyle(color, Math.sin(progress * Math.PI) * 0.5);
					gfx.fillCircle(cx, cy, centerSize);
					gfx.fillStyle(0xffffff, Math.sin(progress * Math.PI) * 0.3);
					gfx.fillCircle(cx, cy, centerSize * 0.5);
				}

				// Midpoint
				if (progress >= 0.5 && !midpointCalled) {
					midpointCalled = true;
					onMidpoint();
				}

				// Complete
				if (progress >= 1) {
					this.tunnelTimer?.destroy();
					this.tunnelTimer = null;
					gfx.destroy();
					this.tunnelGfx = null;
					particles.destroy();
					onComplete();
				}
			}
		});
	}

	// ── URL Hash Persistence ──────────────────────────────────────

	private readSectorFromHash() {
		try {
			const hash = window.location.hash.replace('#', '');
			const match = hash.match(/^s=(\d+),(\d+)$/);
			if (match) {
				const x = parseInt(match[1], 10);
				const y = parseInt(match[2], 10);
				if (x >= 0 && x < SECTOR.GRID_SIZE && y >= 0 && y < SECTOR.GRID_SIZE) {
					this.sectorX = x;
					this.sectorY = y;
				}
			}
		} catch {
			// Ignore hash parse failures
		}
	}

	private updateSectorHash() {
		try {
			window.history.replaceState(null, '', `#s=${this.sectorX},${this.sectorY}`);
		} catch {
			// Ignore if history API unavailable
		}
	}

	// ── Sector Edges & Transitions ─────────────────────────────────

	private createEdgeSensors() {
		const s = SECTOR.SIZE;
		const thickness = 60;

		const edges = [
			{ x: s / 2, y: -thickness / 2, w: s, h: thickness, label: 'edge-top' },
			{ x: s / 2, y: s + thickness / 2, w: s, h: thickness, label: 'edge-bottom' },
			{ x: -thickness / 2, y: s / 2, w: thickness, h: s, label: 'edge-left' },
			{ x: s + thickness / 2, y: s / 2, w: thickness, h: s, label: 'edge-right' }
		];

		for (const e of edges) {
			this.matter.add.rectangle(e.x, e.y, e.w, e.h, {
				isStatic: true,
				isSensor: true,
				label: e.label
			});
		}
	}

	private checkSectorTransition() {
		if (this.transitioning || this.player.dead) return;

		const px = this.player.sprite.x;
		const py = this.player.sprite.y;
		let dir: string | null = null;
		let newX = this.sectorX;
		let newY = this.sectorY;

		if (py < -20) {
			dir = 'top';
			newY--;
		} else if (py > SECTOR.SIZE + 20) {
			dir = 'bottom';
			newY++;
		} else if (px < -20) {
			dir = 'left';
			newX--;
		} else if (px > SECTOR.SIZE + 20) {
			dir = 'right';
			newX++;
		}

		if (dir) {
			const wrappedX = (newX + SECTOR.GRID_SIZE) % SECTOR.GRID_SIZE;
			const wrappedY = (newY + SECTOR.GRID_SIZE) % SECTOR.GRID_SIZE;
			const isWrap = wrappedX !== newX || wrappedY !== newY;
			this.transitionToSector(wrappedX, wrappedY, dir, isWrap);
		}
	}

	private transitionToSector(
		newX: number,
		newY: number,
		fromDir: string,
		isWrap = false,
		entryPosition?: { x: number; y: number }
	) {
		this.transitioning = true;

		const duration = isWrap ? 1000 : 800;
		const color = isWrap ? 0x4488ff : 0x6688aa;

		this.playTransitionEffect(
			color,
			duration,
			() => {
				// Midpoint: swap sector
				this.clearSector();
				this.sectorX = newX;
				this.sectorY = newY;

				if (entryPosition) {
					this.player.sprite.setPosition(entryPosition.x, entryPosition.y);
				} else {
					const margin = 100;
					let px: number, py: number;
					switch (fromDir) {
						case 'top':
							px = this.player.sprite.x;
							py = SECTOR.SIZE - margin;
							break;
						case 'bottom':
							px = this.player.sprite.x;
							py = margin;
							break;
						case 'left':
							px = SECTOR.SIZE - margin;
							py = this.player.sprite.y;
							break;
						case 'right':
							px = margin;
							py = this.player.sprite.y;
							break;
						default:
							px = SECTOR.SIZE / 2;
							py = SECTOR.SIZE / 2;
					}
					this.player.sprite.setPosition(px, py);
				}

				this.player.sprite.setVelocity(0, 0);
				this.generateSectorContent();
			},
			() => {
				this.transitioning = false;
			}
		);
	}

	private clearSector() {
		// Asteroids
		for (const ast of this.asteroids) {
			if (ast.active) ast.destroy();
		}
		this.asteroids = [];

		// Enemies
		for (const enemy of this.enemies) {
			if (enemy.sprite.active) enemy.sprite.destroy();
		}
		this.enemies = [];

		// Sensor beacon + its tween
		if (this.beaconTween) {
			this.beaconTween.stop();
			this.beaconTween = null;
		}
		if (this.sensorBeacon?.active) {
			this.sensorBeacon.destroy();
		}
		this.sensorBeacon = null;

		// Nebula overlay
		if (this.nebulaOverlay) {
			this.nebulaOverlay.destroy();
			this.nebulaOverlay = null;
		}

		// Planets
		for (const p of this.planetBodies) {
			if (p.sprite.active) p.sprite.destroy();
		}
		this.planetBodies = [];

		// Wormhole
		for (const tw of this.wormholeTweens) {
			tw.stop();
		}
		this.wormholeTweens = [];
		if (this.wormholeSprite?.active) {
			const emitter = this.wormholeSprite.getData('emitter') as
				| Phaser.GameObjects.Particles.ParticleEmitter
				| undefined;
			if (emitter) emitter.destroy();
			this.wormholeSprite.destroy();
		}
		this.wormholeSprite = null;
		this.currentWormholeData = null;

		// Pickups
		for (const pickup of this.pickupSprites) {
			pickup.tween.stop();
			if (pickup.sprite.active) pickup.sprite.destroy();
		}
		this.pickupSprites = [];

		// Easter eggs
		for (const egg of this.easterEggObjects) {
			this.tweens.killTweensOf(egg.sprite);
			this.tweens.killTweensOf(egg.text);
			egg.sprite.destroy();
			egg.text.destroy();
		}
		this.easterEggObjects = [];

		// Boss
		if (this.currentBoss) {
			EventBus.off('boss-defeated');
			EventBus.off('boss-pacified');
			this.currentBoss = null;
		}
		EventBus.emit('boss-intro', null); // Clear any boss overlay

		// Adventure items
		for (const item of this.itemSprites) {
			item.tween.stop();
			item.emitter.destroy();
			if (item.sprite.active) item.sprite.destroy();
		}
		this.itemSprites = [];

		// Kilroy black hole
		if (this.kilroyBlackHole) {
			this.tweens.killTweensOf(this.kilroyBlackHole.sprite);
			const emitter = this.kilroyBlackHole.sprite.getData('diskEmitter') as
				| Phaser.GameObjects.Particles.ParticleEmitter
				| undefined;
			if (emitter) emitter.destroy();
			if (this.kilroyBlackHole.sprite.active) this.kilroyBlackHole.sprite.destroy();
			this.kilroyBlackHole = null;
		}

		// Kilroy graffiti
		if (this.kilroyGraffitiSprite) {
			if (this.kilroyGraffitiSprite.active) this.kilroyGraffitiSprite.destroy();
			this.kilroyGraffitiSprite = null;
		}

		// Planet craters
		this.planetCraters = [];
		if (this.planetCraterGfx) {
			this.planetCraterGfx.clear();
		}

		// Meme sprites
		for (const meme of this.memeSprites) {
			this.tweens.killTweensOf(meme);
			if (meme.active) meme.destroy();
		}
		this.memeSprites = [];

		// Patrol ships
		for (const patrol of this.patrolShips) {
			const emitter = patrol.sprite.getData('emitter') as
				| Phaser.GameObjects.Particles.ParticleEmitter
				| undefined;
			if (emitter) emitter.destroy();
			this.tweens.killTweensOf(patrol.sprite);
			if (patrol.sprite.active) patrol.sprite.destroy();
		}
		this.patrolShips = [];

		// Distress beacons
		for (const beacon of this.distressBeacons) {
			this.tweens.killTweensOf(beacon.sprite);
			this.tweens.killTweensOf(beacon.text);
			if (beacon.sprite.active) beacon.sprite.destroy();
			beacon.text.destroy();
		}
		this.distressBeacons = [];

		// Rogue asteroid timer
		if (this.rogueAsteroidTimer) {
			this.rogueAsteroidTimer.destroy();
			this.rogueAsteroidTimer = null;
		}

		// Text blobs
		for (const blob of this.textBlobObjects) {
			this.matter.world.remove(blob.body);
			blob.text.destroy();
		}
		this.textBlobObjects = [];

		// Destroy all bullets (player + enemy)
		const allBodies = this.matter.world.getAllBodies();
		for (const body of allBodies) {
			if (
				(body.label === 'playerBullet' || body.label === 'enemyBullet') &&
				body.gameObject
			) {
				(body.gameObject as Phaser.GameObjects.GameObject).destroy();
			}
		}
	}

	shutdown() {
		EventBus.off('boss-spawn-enemies', this.onBossSpawnEnemies, this);
		EventBus.off('q-snap', this.onQSnap, this);
		this.player?.destroy();
		this.starfield?.destroy();
		this.clearSector();
	}
}
