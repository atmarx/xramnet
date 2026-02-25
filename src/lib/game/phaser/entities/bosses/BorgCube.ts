import Phaser from 'phaser';
import { Boss } from '../Boss';
import { ENEMY_BULLET } from '../../config';
import { EventBus } from '../../EventBus';

/**
 * Borg Cube — Star Trek
 * Phase 1: Tractor beam (pulls player toward cube)
 * Phase 2: + Spawns 3 swarmer drones every 10s
 * Phase 3: + Adaptation (brief invulnerability if hit 3x from same angle)
 * Pacify with Deflector Dish: "Frequency shift detected... resistance is... possible."
 */
export class BorgCube extends Boss {
	private lastBeamTime = 0;
	private lastDroneTime = 0;
	private lastFireTime = 0;
	private hitAngles: number[] = [];
	private adaptedAngle: number | null = null;
	private adaptedUntil = 0;

	constructor(scene: Phaser.Scene, x: number, y: number) {
		super(scene, x, y, { bossId: 'borg-cube' });
		this.sprite.setScale(1.5);
		this.sprite.setStatic(true);
	}

	protected updateBoss(time: number, _delta: number, playerSprite: Phaser.Physics.Matter.Sprite) {
		const angleToPlayer = Phaser.Math.Angle.Between(
			this.sprite.x,
			this.sprite.y,
			playerSprite.x,
			playerSprite.y
		);
		const dist = Phaser.Math.Distance.Between(
			this.sprite.x,
			this.sprite.y,
			playerSprite.x,
			playerSprite.y
		);

		// Slow rotation (cube rotates menacingly)
		this.sprite.rotation += 0.005;

		// Phase 1+: Tractor beam — pull player toward cube
		if (dist < 600 && dist > 80) {
			const pullForce = 0.001 * this.phase;
			const dx = this.sprite.x - playerSprite.x;
			const dy = this.sprite.y - playerSprite.y;
			const len = Math.sqrt(dx * dx + dy * dy);
			playerSprite.applyForce(
				new Phaser.Math.Vector2((dx / len) * pullForce, (dy / len) * pullForce)
			);
		}

		// Fire projectiles
		const fireInterval = 2000 - this.phase * 300;
		if (time - this.lastFireTime > fireInterval && dist < 700) {
			this.lastFireTime = time;
			// 4 directional shots (cube fires in a cross pattern)
			for (let i = 0; i < 4; i++) {
				const a = angleToPlayer + (Math.PI / 2) * i;
				this.fireEnemyBullet(a, ENEMY_BULLET.SPEED_TURRET, 2);
			}
		}

		// Phase 2+: Spawn drones
		if (this.phase >= 2 && time - this.lastDroneTime > 10000) {
			this.lastDroneTime = time;
			EventBus.emit('boss-spawn-enemies', {
				type: 'swarmer',
				count: 3,
				x: this.sprite.x,
				y: this.sprite.y
			});
		}

		// Phase 3: Adaptation cleanup
		if (this.adaptedAngle !== null && time > this.adaptedUntil) {
			this.adaptedAngle = null;
		}
	}

	takeDamage(amount: number): boolean {
		// Phase 3 adaptation: if hit 3x from similar angle, become briefly invulnerable
		if (this.phase >= 3) {
			const scene = this.scene as Phaser.Scene;
			// Check last few hit angles
			if (this.adaptedAngle !== null && scene.time.now < this.adaptedUntil) {
				// Show "ADAPTED" text
				const text = scene.add
					.text(this.sprite.x, this.sprite.y - 40, 'ADAPTED', {
						fontSize: '12px',
						color: '#44ff44',
						fontFamily: 'monospace',
						fontStyle: 'bold'
					})
					.setOrigin(0.5)
					.setDepth(25);
				scene.tweens.add({
					targets: text,
					alpha: 0,
					duration: 800,
					onComplete: () => text.destroy()
				});
				return false;
			}
		}

		return super.takeDamage(amount);
	}

	protected onPacified() {
		// Power down — sprite darkens
		this.scene.tweens.add({
			targets: this.sprite,
			tint: 0x222222,
			alpha: 0.3,
			duration: 2000,
			onComplete: () => {
				super.onPacified();
			}
		});
	}
}
