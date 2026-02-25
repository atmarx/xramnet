import Phaser from 'phaser';
import { Boss } from '../Boss';
import { ENEMY_BULLET } from '../../config';
import { EventBus } from '../../EventBus';

/**
 * Old Gregg — Mighty Boosh
 * Phase 1: Spiral watercolor projectiles (5 bullets every 3s)
 * Phase 2: + "Do you love me?" flash (green tint, player slowed)
 * Phase 3: + Spawns 2 swarmers every 8s
 * Pacify with Bailey's: "You DO love me!"
 */
export class OldGregg extends Boss {
	private lastSpiralTime = 0;
	private spiralAngle = 0;
	private lastFlashTime = 0;
	private lastSpawnTime = 0;
	private orbitAngle = 0;

	constructor(scene: Phaser.Scene, x: number, y: number) {
		super(scene, x, y, { bossId: 'old-gregg' });
		this.sprite.setScale(1.5);
	}

	protected updateBoss(time: number, _delta: number, playerSprite: Phaser.Physics.Matter.Sprite) {
		const dist = Phaser.Math.Distance.Between(
			this.sprite.x,
			this.sprite.y,
			playerSprite.x,
			playerSprite.y
		);

		// Lazy orbit around center of arena
		this.orbitAngle += 0.003 * this.phase;
		const centerX = 2000;
		const centerY = 2000;
		const orbitRadius = 400 - this.phase * 50;
		const targetX = centerX + Math.cos(this.orbitAngle) * orbitRadius;
		const targetY = centerY + Math.sin(this.orbitAngle) * orbitRadius;
		this.moveToward(targetX, targetY, 2 + this.phase);

		// Face the player
		const angleToPlayer = Phaser.Math.Angle.Between(
			this.sprite.x,
			this.sprite.y,
			playerSprite.x,
			playerSprite.y
		);
		this.sprite.setRotation(angleToPlayer);

		// Phase 1+: Spiral watercolor projectiles
		const spiralInterval = 3000 - this.phase * 500;
		if (time - this.lastSpiralTime > spiralInterval && dist < 800) {
			this.lastSpiralTime = time;
			this.fireSpiralBurst(angleToPlayer);
		}

		// Phase 2+: "Do you love me?" flash
		if (this.phase >= 2 && time - this.lastFlashTime > 8000 && dist < 600) {
			this.lastFlashTime = time;
			this.doLoveMeFlash();
		}

		// Phase 3: Spawn swarmers
		if (this.phase >= 3 && time - this.lastSpawnTime > 8000) {
			this.lastSpawnTime = time;
			this.spawnSwarmers();
		}
	}

	private fireSpiralBurst(baseAngle: number) {
		const bulletCount = 5 + this.phase;
		const spread = (Math.PI * 2) / bulletCount;

		for (let i = 0; i < bulletCount; i++) {
			const angle = baseAngle + this.spiralAngle + spread * i;
			this.fireEnemyBullet(angle, ENEMY_BULLET.SPEED_SCOUT * 0.8, 2);
		}
		this.spiralAngle += 0.4;
	}

	private doLoveMeFlash() {
		// Green screen flash
		const flash = this.scene.add.rectangle(640, 360, 1280, 720, 0x00ff44, 0.3);
		flash.setScrollFactor(0).setDepth(50);

		// Floating text
		const text = this.scene.add
			.text(this.sprite.x, this.sprite.y - 50, 'Do you love me?', {
				fontSize: '18px',
				color: '#44ff88',
				fontFamily: 'monospace',
				fontStyle: 'bold'
			})
			.setOrigin(0.5)
			.setDepth(25);

		this.scene.tweens.add({
			targets: text,
			y: text.y - 40,
			alpha: 0,
			duration: 2000,
			onComplete: () => text.destroy()
		});

		this.scene.time.delayedCall(1000, () => {
			if (flash.active) flash.destroy();
		});
	}

	private spawnSwarmers() {
		EventBus.emit('boss-spawn-enemies', {
			type: 'swarmer',
			count: 2,
			x: this.sprite.x,
			y: this.sprite.y
		});
	}

	protected onPacified() {
		// Dance animation — wobble before fading
		this.scene.tweens.add({
			targets: this.sprite,
			angle: { from: -15, to: 15 },
			duration: 200,
			yoyo: true,
			repeat: 5,
			onComplete: () => {
				super.onPacified();
			}
		});
	}
}
