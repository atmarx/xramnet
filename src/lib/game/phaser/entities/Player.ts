import Phaser from 'phaser';
import { SHIP, WEAPONS, CATEGORY, PICKUPS } from '../config';

export class Player {
	scene: Phaser.Scene;
	sprite: Phaser.Physics.Matter.Sprite;
	health: number;
	maxHealth: number;
	shields: number;
	maxShields: number;
	dead: boolean;
	respawnTimer: Phaser.Time.TimerEvent | null = null;

	// Input
	cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
	wasd!: Record<string, Phaser.Input.Keyboard.Key>;
	fireKey!: Phaser.Input.Keyboard.Key;
	rapidFireKey!: Phaser.Input.Keyboard.Key;

	// Weapons
	private lastFireTime = 0;

	// Shield recharge
	private lastDamageTime = 0;

	// Buffs
	speedBoostEnd = 0;
	doubleShotEnd = 0;
	private savedMaxShields = 0;
	shieldOverchargeEnd = 0;
	private controlsInverted = false;
	private invertEnd = 0;

	// Turbo boost
	private turboKey!: Phaser.Input.Keyboard.Key;
	private turboEnd = 0;
	private turboCooldownEnd = 0;

	// Thruster particles
	private thrusterEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

	constructor(scene: Phaser.Scene, x: number, y: number, health: number = SHIP.MAX_HEALTH) {
		this.scene = scene;
		this.health = health;
		this.maxHealth = SHIP.MAX_HEALTH;
		this.shields = SHIP.MAX_SHIELDS;
		this.maxShields = SHIP.MAX_SHIELDS;
		this.dead = false;

		// Create Matter.js sprite
		this.sprite = scene.matter.add.sprite(x, y, 'ship', undefined, {
			shape: { type: 'circle', radius: SHIP.BODY_RADIUS },
			frictionAir: SHIP.FRICTION_AIR,
			restitution: 0.3,
			density: 0.002,
			label: 'player'
		});

		this.sprite.setFixedRotation();
		this.sprite.setCollisionCategory(CATEGORY.PLAYER);
		this.sprite.setCollidesWith([
			CATEGORY.ENEMY,
			CATEGORY.ENEMY_BULLET,
			CATEGORY.ASTEROID,
			CATEGORY.PICKUP,
			CATEGORY.WALL
		]);
		this.sprite.setData('entity', this);
		this.sprite.setDepth(10);

		this.setupInput();
		this.setupThruster();
	}

	private setupInput() {
		const kb = this.scene.input.keyboard!;
		this.cursors = kb.createCursorKeys();
		this.wasd = kb.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>;
		this.fireKey = kb.addKey('SPACE');
		this.rapidFireKey = kb.addKey('E');
		this.turboKey = kb.addKey('T');
	}

	private setupThruster() {
		this.thrusterEmitter = this.scene.add.particles(0, 0, 'particle', {
			speed: { min: 30, max: 80 },
			angle: { min: -15, max: 15 },
			scale: { start: 1, end: 0 },
			alpha: { start: 0.8, end: 0 },
			lifespan: { min: 200, max: 400 },
			blendMode: 'ADD',
			tint: [0x4488ff, 0x6688ff, 0x2266cc],
			frequency: -1,
			emitting: false
		});
		this.thrusterEmitter.setDepth(9);
	}

	update(time: number, _delta: number) {
		if (this.dead) return;

		this.handleRotation();
		this.handleThrust();
		this.handleFiring(time);
		this.updateThrusterPosition();
		this.rechargeShields(time, _delta);
		this.updateBuffs(time);
	}

	private handleRotation() {
		let left = this.cursors.left?.isDown || this.wasd.A?.isDown;
		let right = this.cursors.right?.isDown || this.wasd.D?.isDown;

		if (this.controlsInverted) {
			[left, right] = [right, left];
		}

		if (left) {
			this.sprite.rotation -= SHIP.ROTATION_SPEED;
		} else if (right) {
			this.sprite.rotation += SHIP.ROTATION_SPEED;
		}
	}

	private handleThrust() {
		const up = this.cursors.up?.isDown || this.wasd.W?.isDown;
		const down = this.cursors.down?.isDown || this.wasd.S?.isDown;
		const now = this.scene.time.now;
		const isTurboing = now < this.turboEnd;

		// Turbo activation (T key)
		if (Phaser.Input.Keyboard.JustDown(this.turboKey) && now > this.turboCooldownEnd) {
			this.turboEnd = now + SHIP.TURBO_DURATION;
			this.turboCooldownEnd = now + SHIP.TURBO_COOLDOWN;
		}

		if (isTurboing) {
			// Turbo: strong burst in facing direction
			const angle = this.sprite.rotation;
			const fx = Math.cos(angle) * SHIP.TURBO_THRUST;
			const fy = Math.sin(angle) * SHIP.TURBO_THRUST;
			this.sprite.applyForce(new Phaser.Math.Vector2(fx, fy));
			this.emitThrustParticles();
			this.emitThrustParticles(); // double particles for visual oomph
		} else if (up) {
			const angle = this.sprite.rotation;
			const thrust = this.isSpeedBoosted()
				? SHIP.THRUST * PICKUPS.SPEED_BOOST_MULTIPLIER
				: SHIP.THRUST;
			const fx = Math.cos(angle) * thrust;
			const fy = Math.sin(angle) * thrust;
			this.sprite.applyForce(new Phaser.Math.Vector2(fx, fy));
			this.emitThrustParticles();
		} else if (down) {
			// Reverse thrusters — push opposite to facing direction
			const angle = this.sprite.rotation + Math.PI;
			const thrust = this.isSpeedBoosted()
				? SHIP.REVERSE_THRUST * PICKUPS.SPEED_BOOST_MULTIPLIER
				: SHIP.REVERSE_THRUST;
			const fx = Math.cos(angle) * thrust;
			const fy = Math.sin(angle) * thrust;
			this.sprite.applyForce(new Phaser.Math.Vector2(fx, fy));
		}
	}

	isTurboReady(): boolean {
		return this.scene.time.now > this.turboCooldownEnd;
	}

	getTurboCooldownFrac(): number {
		const now = this.scene.time.now;
		if (now >= this.turboCooldownEnd) return 1;
		const elapsed = SHIP.TURBO_COOLDOWN - (this.turboCooldownEnd - now);
		return elapsed / SHIP.TURBO_COOLDOWN;
	}

	private emitThrustParticles() {
		if (!this.thrusterEmitter) return;
		const angle = this.sprite.rotation + Math.PI;
		const ox = Math.cos(angle) * 18;
		const oy = Math.sin(angle) * 18;

		this.thrusterEmitter.emitParticleAt(
			this.sprite.x + ox,
			this.sprite.y + oy,
			Phaser.Math.Between(1, 3)
		);
	}

	private updateThrusterPosition() {
		// Particles are world-positioned, no need to update emitter position
	}

	private handleFiring(time: number) {
		const rapidFire = this.rapidFireKey?.isDown;
		const fire = this.fireKey?.isDown;

		if (!fire && !rapidFire) return;

		const cooldown = rapidFire ? WEAPONS.RAPID_FIRE_COOLDOWN : WEAPONS.LASER_COOLDOWN;
		if (time - this.lastFireTime < cooldown) return;

		this.lastFireTime = time;
		this.fireLaser(rapidFire);
	}

	private fireLaser(rapidFire: boolean) {
		const baseAngle = this.sprite.rotation;
		const spread = rapidFire
			? Phaser.Math.FloatBetween(-WEAPONS.RAPID_FIRE_SPREAD, WEAPONS.RAPID_FIRE_SPREAD)
			: 0;

		const shots = this.hasDoubleShot() ? 2 : 1;
		const offsets = shots === 2 ? [-4, 4] : [0];

		for (let i = 0; i < shots; i++) {
			const angle = baseAngle + spread;
			// Perpendicular offset for double shot
			const perpAngle = baseAngle + Math.PI / 2;
			const noseX =
				this.sprite.x +
				Math.cos(baseAngle) * 20 +
				Math.cos(perpAngle) * offsets[i];
			const noseY =
				this.sprite.y +
				Math.sin(baseAngle) * 20 +
				Math.sin(perpAngle) * offsets[i];

			const bullet = this.scene.matter.add.sprite(noseX, noseY, 'laser', undefined, {
				isSensor: true,
				label: 'playerBullet'
			});

			bullet.setCollisionCategory(CATEGORY.PLAYER_BULLET);
			bullet.setCollidesWith([CATEGORY.ENEMY, CATEGORY.ASTEROID, CATEGORY.WALL]);
			bullet.setRotation(angle);
			bullet.setVelocity(
				Math.cos(angle) * WEAPONS.LASER_SPEED,
				Math.sin(angle) * WEAPONS.LASER_SPEED
			);
			bullet.setFrictionAir(0);
			bullet.setData('damage', WEAPONS.LASER_DAMAGE);
			bullet.setData('type', 'playerBullet');
			bullet.setDepth(8);

			this.scene.time.delayedCall(WEAPONS.LASER_LIFESPAN, () => {
				if (bullet.active) bullet.destroy();
			});
		}
	}

	private rechargeShields(time: number, delta: number) {
		if (this.shields >= this.maxShields) return;
		if (time - this.lastDamageTime < SHIP.SHIELD_RECHARGE_DELAY) return;

		this.shields = Math.min(
			this.maxShields,
			this.shields + SHIP.SHIELD_RECHARGE_RATE * (delta / 1000)
		);
	}

	takeDamage(amount: number) {
		if (this.dead) return;

		this.lastDamageTime = this.scene.time.now;

		// Shields absorb damage first
		if (this.shields > 0) {
			const absorbed = Math.min(this.shields, amount);
			this.shields -= absorbed;
			amount -= absorbed;

			// Shield hit flash (cyan)
			if (absorbed > 0) {
				this.sprite.setTint(0x44eeff);
				this.scene.time.delayedCall(60, () => {
					if (this.sprite.active) this.sprite.clearTint();
				});
			}
		}

		// Remaining damage goes to hull
		if (amount > 0) {
			this.health = Math.max(0, this.health - amount);
			this.scene.cameras.main.shake(150, 0.005);
		}

		if (this.health <= 0) {
			this.die();
		}
	}

	private die() {
		this.dead = true;

		const emitter = this.scene.add.particles(this.sprite.x, this.sprite.y, 'particle', {
			speed: { min: 50, max: 200 },
			scale: { start: 1.5, end: 0 },
			alpha: { start: 1, end: 0 },
			lifespan: { min: 500, max: 1000 },
			blendMode: 'ADD',
			tint: [0xffffff, 0x8888ff, 0xff4444],
			emitting: false
		});
		emitter.explode(20);
		this.scene.time.delayedCall(1000, () => emitter.destroy());

		this.scene.cameras.main.flash(300, 255, 100, 100);

		this.sprite.setVisible(false);
		this.sprite.setPosition(-9999, -9999);
		this.sprite.setVelocity(0, 0);
		this.sprite.setStatic(true);

		this.respawnTimer = this.scene.time.delayedCall(SHIP.RESPAWN_DELAY, () => {
			this.respawn();
		});
	}

	private respawn() {
		const cam = this.scene.cameras.main;
		const x = cam.scrollX + cam.width / 2;
		const y = cam.scrollY + cam.height / 2;

		this.health = Math.ceil(this.maxHealth * 0.5);
		this.shields = Math.ceil(this.maxShields * 0.3);
		this.dead = false;
		this.sprite.setStatic(false);
		this.sprite.setPosition(x, y);
		this.sprite.setVelocity(0, 0);
		this.sprite.setVisible(true);
		this.sprite.setRotation(0);
	}

	heal(hullAmount: number, shieldAmount: number) {
		this.health = Math.min(this.maxHealth, this.health + hullAmount);
		this.shields = Math.min(this.maxShields, this.shields + shieldAmount);
	}

	getHealthFraction(): number {
		return this.health / this.maxHealth;
	}

	getShieldFraction(): number {
		return this.shields / this.maxShields;
	}

	// ── Buff System ──────────────────────────────────────────────

	isSpeedBoosted(): boolean {
		return this.scene.time.now < this.speedBoostEnd;
	}

	hasDoubleShot(): boolean {
		return this.scene.time.now < this.doubleShotEnd;
	}

	isShieldOvercharged(): boolean {
		return this.scene.time.now < this.shieldOverchargeEnd;
	}

	applySpeedBoost() {
		this.speedBoostEnd = this.scene.time.now + PICKUPS.SPEED_BOOST_DURATION;
	}

	applyDoubleShot() {
		this.doubleShotEnd = this.scene.time.now + PICKUPS.DOUBLE_SHOT_DURATION;
	}

	applyShieldOvercharge() {
		if (!this.isShieldOvercharged()) {
			this.savedMaxShields = this.maxShields;
		}
		this.maxShields = PICKUPS.SHIELD_OVERCHARGE_AMOUNT;
		this.shields = this.maxShields;
		this.shieldOverchargeEnd = this.scene.time.now + PICKUPS.SHIELD_OVERCHARGE_DURATION;
	}

	invertControls(duration: number) {
		this.controlsInverted = true;
		this.invertEnd = this.scene.time.now + duration;
	}

	private updateBuffs(time: number) {
		// Shield overcharge expiry — restore normal max shields
		if (this.savedMaxShields > 0 && time >= this.shieldOverchargeEnd) {
			this.maxShields = this.savedMaxShields;
			this.shields = Math.min(this.shields, this.maxShields);
			this.savedMaxShields = 0;
		}

		// Control inversion expiry
		if (this.controlsInverted && time >= this.invertEnd) {
			this.controlsInverted = false;
		}
	}

	destroy() {
		this.thrusterEmitter?.destroy();
		this.respawnTimer?.remove();
		this.sprite.destroy();
	}
}
