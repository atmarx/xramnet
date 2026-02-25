import Phaser from 'phaser';
import { Boss } from '../Boss';
import { ENEMY_BULLET, CATEGORY } from '../../config';
import { EventBus } from '../../EventBus';

/**
 * GLaDOS — Portal
 * Phase 1: Ring of 4 turret sprites orbit GLaDOS, each fires independently
 * Phase 2: + Neurotoxin clouds (green damage zones)
 * Phase 3: + Spawns test subject swarmers + turrets fire faster
 * Pacify with Companion Cube: "I'm not even angry. I'm being SO sincere right now."
 */
export class GLaDOS extends Boss {
	private turretSprites: Phaser.GameObjects.Sprite[] = [];
	private turretAngles: number[] = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
	private orbitRadius = 120;
	private orbitSpeed = 0.001;
	private lastTurretFireTime = 0;
	private lastToxinTime = 0;
	private lastSpawnTime = 0;
	private toxinClouds: Phaser.GameObjects.Arc[] = [];

	constructor(scene: Phaser.Scene, x: number, y: number) {
		super(scene, x, y, { bossId: 'glados' });
		this.sprite.setScale(1.5);
		this.sprite.setStatic(true);

		// Create orbiting turret sprites
		for (let i = 0; i < 4; i++) {
			const angle = this.turretAngles[i];
			const tx = x + Math.cos(angle) * this.orbitRadius;
			const ty = y + Math.sin(angle) * this.orbitRadius;
			const turret = scene.add
				.sprite(tx, ty, 'turret')
				.setDepth(7)
				.setScale(0.8)
				.setTint(0xff8844);
			this.turretSprites.push(turret);
		}
	}

	protected updateBoss(time: number, delta: number, playerSprite: Phaser.Physics.Matter.Sprite) {
		// Rotate turret ring
		this.orbitSpeed = 0.001 + this.phase * 0.0003;

		for (let i = 0; i < 4; i++) {
			this.turretAngles[i] += this.orbitSpeed * delta;
			const angle = this.turretAngles[i];
			const tx = this.sprite.x + Math.cos(angle) * this.orbitRadius;
			const ty = this.sprite.y + Math.sin(angle) * this.orbitRadius;
			this.turretSprites[i].setPosition(tx, ty);

			// Face the player
			const aimAngle = Phaser.Math.Angle.Between(tx, ty, playerSprite.x, playerSprite.y);
			this.turretSprites[i].setRotation(aimAngle);
		}

		// Turrets fire
		const fireInterval = this.phase >= 3 ? 800 : 1500;
		if (time - this.lastTurretFireTime > fireInterval) {
			this.lastTurretFireTime = time;
			this.fireTurrets(playerSprite);
		}

		// Phase 2+: Neurotoxin clouds
		if (this.phase >= 2 && time - this.lastToxinTime > 8000) {
			this.lastToxinTime = time;
			this.spawnToxinCloud();
		}

		// Phase 3: Spawn test subjects
		if (this.phase >= 3 && time - this.lastSpawnTime > 12000) {
			this.lastSpawnTime = time;
			EventBus.emit('boss-spawn-enemies', {
				type: 'swarmer',
				count: 2,
				x: this.sprite.x,
				y: this.sprite.y
			});
		}

		// Toxin cloud damage check
		this.updateToxinClouds(playerSprite);

		// GLaDOS rotates slowly
		this.sprite.rotation += 0.002;
	}

	private fireTurrets(playerSprite: Phaser.Physics.Matter.Sprite) {
		for (const turret of this.turretSprites) {
			if (!turret.active) continue;
			const angle = Phaser.Math.Angle.Between(
				turret.x,
				turret.y,
				playerSprite.x,
				playerSprite.y
			);

			// Fire from turret position (not from GLaDOS)
			const noseX = turret.x + Math.cos(angle) * 16;
			const noseY = turret.y + Math.sin(angle) * 16;

			const bullet = this.scene.matter.add.sprite(noseX, noseY, 'enemy-bullet', undefined, {
				isSensor: true,
				label: 'enemyBullet'
			});
			bullet.setCollisionCategory(CATEGORY.ENEMY_BULLET);
			bullet.setCollidesWith([CATEGORY.PLAYER, CATEGORY.ASTEROID, CATEGORY.WALL]);
			bullet.setRotation(angle);
			bullet.setVelocity(
				Math.cos(angle) * ENEMY_BULLET.SPEED_TURRET,
				Math.sin(angle) * ENEMY_BULLET.SPEED_TURRET
			);
			bullet.setFrictionAir(0);
			bullet.setData('damage', 1);
			bullet.setData('type', 'enemyBullet');
			bullet.setDepth(7);

			this.scene.time.delayedCall(3000, () => {
				if (bullet.active) bullet.destroy();
			});
		}
	}

	private spawnToxinCloud() {
		const angle = Math.random() * Math.PI * 2;
		const dist = 100 + Math.random() * 250;
		const cx = this.sprite.x + Math.cos(angle) * dist;
		const cy = this.sprite.y + Math.sin(angle) * dist;

		const cloud = this.scene.add.circle(cx, cy, 60, 0x44ff44, 0.2).setDepth(3);

		this.scene.tweens.add({
			targets: cloud,
			alpha: 0.1,
			scaleX: 1.3,
			scaleY: 1.3,
			duration: 2000,
			yoyo: true,
			repeat: -1,
			ease: 'Sine.easeInOut'
		});

		this.toxinClouds.push(cloud);

		this.scene.time.delayedCall(10000, () => {
			const idx = this.toxinClouds.indexOf(cloud);
			if (idx >= 0) {
				this.scene.tweens.killTweensOf(cloud);
				cloud.destroy();
				this.toxinClouds.splice(idx, 1);
			}
		});
	}

	private updateToxinClouds(playerSprite: Phaser.Physics.Matter.Sprite) {
		for (const cloud of this.toxinClouds) {
			if (!cloud.active) continue;

			const dist = Phaser.Math.Distance.Between(
				playerSprite.x,
				playerSprite.y,
				cloud.x,
				cloud.y
			);

			const radius = cloud.radius * (cloud.scaleX || 1);
			if (dist < radius) {
				const player = playerSprite.getData('entity');
				if (player && !player.dead) {
					const lastDmg = (cloud as any)._lastDmg ?? 0;
					const now = this.scene.time.now;
					if (now - lastDmg > 600) {
						(cloud as any)._lastDmg = now;
						player.takeDamage(1);
					}
				}
			}
		}
	}

	protected onPacified() {
		// Turrets power down
		for (const turret of this.turretSprites) {
			this.scene.tweens.add({
				targets: turret,
				alpha: 0,
				scaleX: 0.3,
				scaleY: 0.3,
				duration: 1000,
				onComplete: () => turret.destroy()
			});
		}
		this.turretSprites = [];

		// Clean up toxin clouds
		for (const cloud of this.toxinClouds) {
			this.scene.tweens.killTweensOf(cloud);
			cloud.destroy();
		}
		this.toxinClouds = [];

		super.onPacified();
	}

	destroy() {
		for (const turret of this.turretSprites) {
			if (turret.active) turret.destroy();
		}
		this.turretSprites = [];

		for (const cloud of this.toxinClouds) {
			this.scene.tweens.killTweensOf(cloud);
			if (cloud.active) cloud.destroy();
		}
		this.toxinClouds = [];

		super.destroy();
	}
}
