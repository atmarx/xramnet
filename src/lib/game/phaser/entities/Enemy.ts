import Phaser from 'phaser';
import { CATEGORY } from '../config';

export interface EnemyConfig {
	hp: number;
	score: number;
	label: string;
	bodyRadius?: number;
	frictionAir?: number;
}

export abstract class Enemy {
	scene: Phaser.Scene;
	sprite: Phaser.Physics.Matter.Sprite;
	hp: number;
	maxHp: number;
	scoreValue: number;
	dead = false;

	constructor(scene: Phaser.Scene, x: number, y: number, texture: string, config: EnemyConfig) {
		this.scene = scene;
		this.hp = config.hp;
		this.maxHp = config.hp;
		this.scoreValue = config.score;

		this.sprite = scene.matter.add.sprite(x, y, texture, undefined, {
			shape: { type: 'circle', radius: config.bodyRadius ?? 14 },
			frictionAir: config.frictionAir ?? 0.02,
			label: config.label
		});

		this.sprite.setCollisionCategory(CATEGORY.ENEMY);
		this.sprite.setCollidesWith([
			CATEGORY.PLAYER,
			CATEGORY.PLAYER_BULLET,
			CATEGORY.ASTEROID,
			CATEGORY.WALL
		]);
		this.sprite.setData('entity', this);
		this.sprite.setData('type', 'enemy');
		this.sprite.setDepth(6);
	}

	abstract update(time: number, delta: number, playerSprite: Phaser.Physics.Matter.Sprite): void;

	takeDamage(amount: number): boolean {
		if (this.dead) return false;
		this.hp -= amount;
		if (this.hp <= 0) {
			this.dead = true;
			return true;
		}
		// Hit flash
		this.sprite.setTint(0xffffff);
		this.scene.time.delayedCall(80, () => {
			if (this.sprite.active) this.sprite.clearTint();
		});
		return false;
	}

	destroy() {
		if (this.sprite.active) {
			const emitter = this.scene.add.particles(this.sprite.x, this.sprite.y, 'particle', {
				speed: { min: 40, max: 150 },
				scale: { start: 1.2, end: 0 },
				alpha: { start: 0.9, end: 0 },
				lifespan: { min: 300, max: 600 },
				blendMode: 'ADD',
				tint: [0xff4444, 0xff6644, 0xffaa44],
				quantity: Phaser.Math.Between(6, 10)
			});
			this.scene.time.delayedCall(700, () => emitter.destroy());
		}
		this.sprite.destroy();
	}

	protected fireEnemyBullet(angle: number, speed: number, damage: number) {
		const noseX = this.sprite.x + Math.cos(angle) * 20;
		const noseY = this.sprite.y + Math.sin(angle) * 20;

		const bullet = this.scene.matter.add.sprite(noseX, noseY, 'enemy-bullet', undefined, {
			isSensor: true,
			label: 'enemyBullet'
		});
		bullet.setCollisionCategory(CATEGORY.ENEMY_BULLET);
		bullet.setCollidesWith([CATEGORY.PLAYER, CATEGORY.ASTEROID, CATEGORY.WALL]);
		bullet.setRotation(angle);
		bullet.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
		bullet.setFrictionAir(0);
		bullet.setData('damage', damage);
		bullet.setData('type', 'enemyBullet');
		bullet.setDepth(7);

		this.scene.time.delayedCall(3000, () => {
			if (bullet.active) bullet.destroy();
		});
	}

	protected moveToward(tx: number, ty: number, speed: number) {
		const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, tx, ty);
		const force = speed * 0.0003;
		this.sprite.applyForce(
			new Phaser.Math.Vector2(Math.cos(angle) * force, Math.sin(angle) * force)
		);
	}
}
