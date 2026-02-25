import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { ENEMIES } from '../config';

export class Swarmer extends Enemy {
	private activateTime: number;
	private activated = false;

	constructor(scene: Phaser.Scene, x: number, y: number) {
		super(scene, x, y, 'swarmer', {
			hp: ENEMIES.SWARMER.HP,
			score: ENEMIES.SWARMER.SCORE,
			label: 'enemy-swarmer',
			bodyRadius: 10,
			frictionAir: 0.01
		});
		// Staggered activation: random 0-500ms delay
		this.activateTime = scene.time.now + Math.random() * 500;
	}

	update(time: number, _delta: number, playerSprite: Phaser.Physics.Matter.Sprite) {
		if (this.dead || !this.sprite.active) return;
		if (!this.activated) {
			if (time >= this.activateTime) this.activated = true;
			else return;
		}

		// Always chase player
		const angle = Phaser.Math.Angle.Between(
			this.sprite.x,
			this.sprite.y,
			playerSprite.x,
			playerSprite.y
		);
		this.sprite.setRotation(angle);

		const force = ENEMIES.SWARMER.SPEED * 0.0004;
		this.sprite.applyForce(
			new Phaser.Math.Vector2(Math.cos(angle) * force, Math.sin(angle) * force)
		);
	}
}
