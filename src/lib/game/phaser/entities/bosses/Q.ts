import Phaser from 'phaser';
import { Boss } from '../Boss';
import { ENEMY_BULLET } from '../../config';
import { EventBus } from '../../EventBus';

/**
 * Q — Star Trek: TNG
 * Phase 1: Teleports every 4s, fires star bolts
 * Phase 2: + "Snap" inverts player controls for 3s every 8s
 * Phase 3: + Spawns 2 illusion clones (1HP decoys)
 * Pacify with Earl Grey Tea: "Jean-Luc always knew how to... tempt me."
 */
export class Q extends Boss {
	private lastTeleportTime = 0;
	private lastFireTime = 0;
	private lastSnapTime = 0;
	private lastCloneTime = 0;
	private teleportInterval = 4000;

	constructor(scene: Phaser.Scene, x: number, y: number) {
		super(scene, x, y, { bossId: 'q', bodyRadius: 16 });
		this.sprite.setScale(1.3);
	}

	protected updateBoss(time: number, _delta: number, playerSprite: Phaser.Physics.Matter.Sprite) {
		const angleToPlayer = Phaser.Math.Angle.Between(
			this.sprite.x,
			this.sprite.y,
			playerSprite.x,
			playerSprite.y
		);
		this.sprite.setRotation(angleToPlayer);

		// Phase 1+: Teleport
		const teleportInt = this.teleportInterval - this.phase * 500;
		if (time - this.lastTeleportTime > teleportInt) {
			this.lastTeleportTime = time;
			this.teleport();
		}

		// Phase 1+: Fire star bolts
		const fireInterval = 1500 - this.phase * 200;
		if (time - this.lastFireTime > fireInterval) {
			this.lastFireTime = time;
			this.fireStarBolt(angleToPlayer);
		}

		// Phase 2+: Control snap
		if (this.phase >= 2 && time - this.lastSnapTime > 8000) {
			this.lastSnapTime = time;
			this.snapControls();
		}

		// Phase 3: Spawn illusion clones
		if (this.phase >= 3 && time - this.lastCloneTime > 10000) {
			this.lastCloneTime = time;
			this.spawnClones();
		}
	}

	private teleport() {
		// Vanish particles at old position
		const oldX = this.sprite.x;
		const oldY = this.sprite.y;

		const vanishEmitter = this.scene.add.particles(oldX, oldY, 'particle', {
			speed: { min: 30, max: 100 },
			scale: { start: 1.5, end: 0 },
			alpha: { start: 0.8, end: 0 },
			lifespan: 400,
			blendMode: 'ADD',
			tint: [0xffcc44, 0xffffff],
			emitting: false
		});
		vanishEmitter.explode(12);
		this.scene.time.delayedCall(500, () => vanishEmitter.destroy());

		// New position — random within sector bounds
		const margin = 600;
		const range = 4000 - margin * 2;
		const newX = margin + Math.random() * range;
		const newY = margin + Math.random() * range;

		this.sprite.setPosition(newX, newY);
		this.sprite.setVelocity(0, 0);

		// Appear particles at new position
		const appearEmitter = this.scene.add.particles(newX, newY, 'particle', {
			speed: { min: 20, max: 80 },
			scale: { start: 0, end: 1.5 },
			alpha: { start: 0, end: 0.8 },
			lifespan: 300,
			blendMode: 'ADD',
			tint: [0xffcc44, 0xffffff],
			emitting: false
		});
		appearEmitter.explode(12);
		this.scene.time.delayedCall(400, () => appearEmitter.destroy());

		// "Flash" text
		const text = this.scene.add
			.text(newX, newY - 30, '*snap*', {
				fontSize: '12px',
				color: '#ffcc44',
				fontFamily: 'monospace',
				fontStyle: 'italic'
			})
			.setOrigin(0.5)
			.setDepth(25);

		this.scene.tweens.add({
			targets: text,
			alpha: 0,
			y: text.y - 20,
			duration: 800,
			onComplete: () => text.destroy()
		});
	}

	private fireStarBolt(angle: number) {
		// Fire 1-3 bolts depending on phase
		const count = this.phase;
		const spread = 0.2;
		for (let i = 0; i < count; i++) {
			const offset = count > 1 ? (i / (count - 1) - 0.5) * spread : 0;
			this.fireEnemyBullet(angle + offset, ENEMY_BULLET.SPEED_SCOUT, 2);
		}
	}

	private snapControls() {
		// Emit event for GameScene to invert player controls temporarily
		EventBus.emit('q-snap', { duration: 3000 });

		// Visual feedback
		const text = this.scene.add
			.text(this.sprite.x, this.sprite.y - 40, 'Mon capitaine...', {
				fontSize: '14px',
				color: '#ffcc44',
				fontFamily: 'monospace',
				fontStyle: 'italic'
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

		// Brief screen flash
		const flash = this.scene.add.rectangle(640, 360, 1280, 720, 0xffcc44, 0.2);
		flash.setScrollFactor(0).setDepth(50);
		this.scene.time.delayedCall(300, () => {
			if (flash.active) flash.destroy();
		});
	}

	private spawnClones() {
		EventBus.emit('boss-spawn-enemies', {
			type: 'swarmer',
			count: 2,
			x: this.sprite.x,
			y: this.sprite.y
		});
	}

	protected onPacified() {
		// Dramatic finger snap vanish
		const text = this.scene.add
			.text(this.sprite.x, this.sprite.y - 30, '*snap*', {
				fontSize: '16px',
				color: '#ffcc44',
				fontFamily: 'monospace',
				fontStyle: 'bold'
			})
			.setOrigin(0.5)
			.setDepth(25);

		this.scene.tweens.add({
			targets: text,
			alpha: 0,
			duration: 2000,
			onComplete: () => text.destroy()
		});

		// Flash and vanish
		const flash = this.scene.add.rectangle(
			this.sprite.x,
			this.sprite.y,
			200,
			200,
			0xffffff,
			0.8
		);
		flash.setDepth(50);
		this.scene.tweens.add({
			targets: flash,
			alpha: 0,
			scaleX: 3,
			scaleY: 3,
			duration: 500,
			onComplete: () => flash.destroy()
		});

		super.onPacified();
	}
}
