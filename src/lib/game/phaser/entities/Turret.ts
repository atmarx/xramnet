import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { ENEMIES, ENEMY_BULLET } from '../config';

export class Turret extends Enemy {
	private lastBurstTime = 0;
	private burstShotsRemaining = 0;
	private lastShotTime = 0;
	private targetAngle = 0;
	private readonly detectionRange = 600;

	constructor(scene: Phaser.Scene, x: number, y: number) {
		super(scene, x, y, 'turret', {
			hp: ENEMIES.TURRET.HP,
			score: ENEMIES.TURRET.SCORE,
			label: 'enemy-turret',
			bodyRadius: 16,
			frictionAir: 1.0
		});
		this.sprite.setStatic(true);
	}

	update(time: number, _delta: number, playerSprite: Phaser.Physics.Matter.Sprite) {
		if (this.dead || !this.sprite.active) return;

		const dist = Phaser.Math.Distance.Between(
			this.sprite.x,
			this.sprite.y,
			playerSprite.x,
			playerSprite.y
		);

		if (dist < this.detectionRange) {
			this.targetAngle = Phaser.Math.Angle.Between(
				this.sprite.x,
				this.sprite.y,
				playerSprite.x,
				playerSprite.y
			);
			this.sprite.setRotation(this.targetAngle);

			// Burst fire pattern
			if (this.burstShotsRemaining > 0) {
				if (time - this.lastShotTime > ENEMIES.TURRET.BURST_DELAY) {
					this.lastShotTime = time;
					this.burstShotsRemaining--;
					// Slight spread within burst
					const spread = (Math.random() - 0.5) * 0.12;
					this.fireEnemyBullet(
						this.targetAngle + spread,
						ENEMY_BULLET.SPEED_TURRET,
						ENEMIES.TURRET.DAMAGE
					);
				}
			} else if (time - this.lastBurstTime > ENEMIES.TURRET.BURST_COOLDOWN) {
				// Start new burst
				this.lastBurstTime = time;
				this.burstShotsRemaining = ENEMIES.TURRET.BURST_COUNT;
				this.lastShotTime = time;
				this.fireEnemyBullet(
					this.targetAngle,
					ENEMY_BULLET.SPEED_TURRET,
					ENEMIES.TURRET.DAMAGE
				);
				this.burstShotsRemaining--;
			}
		}
	}
}
