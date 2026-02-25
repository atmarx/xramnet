import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { ENEMIES, ENEMY_BULLET } from '../config';

export class Scout extends Enemy {
	private state: 'patrol' | 'engage' = 'patrol';
	private patrolAngle = Math.random() * Math.PI * 2;
	private patrolCenter: { x: number; y: number };
	private lastFireTime = 0;
	private readonly detectionRange = 400;
	private readonly orbitRadius = 250;

	constructor(scene: Phaser.Scene, x: number, y: number) {
		super(scene, x, y, 'scout', {
			hp: ENEMIES.SCOUT.HP,
			score: ENEMIES.SCOUT.SCORE,
			label: 'enemy-scout',
			bodyRadius: 14,
			frictionAir: 0.03
		});
		this.patrolCenter = { x, y };
	}

	update(time: number, _delta: number, playerSprite: Phaser.Physics.Matter.Sprite) {
		if (this.dead || !this.sprite.active) return;

		const dist = Phaser.Math.Distance.Between(
			this.sprite.x,
			this.sprite.y,
			playerSprite.x,
			playerSprite.y
		);

		if (this.state === 'patrol') {
			this.patrolAngle += 0.01;
			const tx = this.patrolCenter.x + Math.cos(this.patrolAngle) * 150;
			const ty = this.patrolCenter.y + Math.sin(this.patrolAngle) * 150;
			this.moveToward(tx, ty, ENEMIES.SCOUT.SPEED * 0.5);

			if (dist < this.detectionRange) {
				this.state = 'engage';
			}
		} else {
			// Face player
			const angleToPlayer = Phaser.Math.Angle.Between(
				this.sprite.x,
				this.sprite.y,
				playerSprite.x,
				playerSprite.y
			);
			this.sprite.setRotation(angleToPlayer);

			if (dist > this.orbitRadius + 50) {
				// Close distance
				this.moveToward(playerSprite.x, playerSprite.y, ENEMIES.SCOUT.SPEED);
			} else if (dist < this.orbitRadius - 50) {
				// Back off
				this.moveToward(playerSprite.x, playerSprite.y, -ENEMIES.SCOUT.SPEED * 0.5);
			} else {
				// Strafe perpendicular (orbit)
				const perpAngle = angleToPlayer + Math.PI / 2;
				const ox = this.sprite.x + Math.cos(perpAngle) * 50;
				const oy = this.sprite.y + Math.sin(perpAngle) * 50;
				this.moveToward(ox, oy, ENEMIES.SCOUT.SPEED * 0.7);
			}

			// Fire at player
			if (time - this.lastFireTime > 2000 && dist < this.detectionRange) {
				this.lastFireTime = time;
				this.fireEnemyBullet(angleToPlayer, ENEMY_BULLET.SPEED_SCOUT, ENEMIES.SCOUT.DAMAGE);
			}

			// Disengage if too far
			if (dist > this.detectionRange * 2) {
				this.state = 'patrol';
			}
		}
	}
}
