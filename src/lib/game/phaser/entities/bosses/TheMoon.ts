import Phaser from 'phaser';
import { Boss } from '../Boss';
import { ENEMY_BULLET } from '../../config';

/**
 * The Moon — Mighty Boosh
 * Phase 1: Sweeping laser beam (rotates 360° every 4s)
 * Phase 2: + Gas cloud AOE zones that drift and damage on contact
 * Phase 3: + Laser fires faster, gas clouds are larger
 * Pacify with Space Cheese: "Ohhh cheese! I'm the Moon! Look at me!"
 */
export class TheMoon extends Boss {
	private laserAngle = 0;
	private lastGasTime = 0;
	private gasClouds: { circle: Phaser.GameObjects.Arc; vx: number; vy: number }[] = [];
	private lastSweepFireTime = 0;

	constructor(scene: Phaser.Scene, x: number, y: number) {
		super(scene, x, y, { bossId: 'the-moon', bodyRadius: 32 });
		this.sprite.setScale(2);
		this.sprite.setStatic(true);
	}

	protected updateBoss(time: number, delta: number, playerSprite: Phaser.Physics.Matter.Sprite) {
		// Sweeping laser beam — fires bullets in a rotating arc
		const sweepSpeed = 0.001 * (1 + this.phase * 0.5);
		this.laserAngle += sweepSpeed * delta;

		const fireInterval = this.phase >= 3 ? 150 : 250;
		if (time - this.lastSweepFireTime > fireInterval) {
			this.lastSweepFireTime = time;
			this.fireEnemyBullet(this.laserAngle, ENEMY_BULLET.SPEED_TURRET * 1.2, 1);
		}

		// Phase 2+: Gas clouds
		if (this.phase >= 2 && time - this.lastGasTime > 6000) {
			this.lastGasTime = time;
			this.spawnGasCloud();
		}

		// Update gas clouds (drift + damage check)
		this.updateGasClouds(delta, playerSprite);
	}

	private spawnGasCloud() {
		const angle = Math.random() * Math.PI * 2;
		const dist = 150 + Math.random() * 200;
		const cx = this.sprite.x + Math.cos(angle) * dist;
		const cy = this.sprite.y + Math.sin(angle) * dist;
		const radius = this.phase >= 3 ? 80 : 50;

		const cloud = this.scene.add.circle(cx, cy, radius, 0x884488, 0.25).setDepth(3);

		// Pulse
		this.scene.tweens.add({
			targets: cloud,
			alpha: 0.15,
			scaleX: 1.2,
			scaleY: 1.2,
			duration: 1500,
			yoyo: true,
			repeat: -1,
			ease: 'Sine.easeInOut'
		});

		const vx = (Math.random() - 0.5) * 0.3;
		const vy = (Math.random() - 0.5) * 0.3;

		this.gasClouds.push({ circle: cloud, vx, vy });

		// Destroy after 12s
		this.scene.time.delayedCall(12000, () => {
			const idx = this.gasClouds.findIndex((g) => g.circle === cloud);
			if (idx >= 0) {
				this.scene.tweens.killTweensOf(cloud);
				cloud.destroy();
				this.gasClouds.splice(idx, 1);
			}
		});
	}

	private updateGasClouds(
		delta: number,
		playerSprite: Phaser.Physics.Matter.Sprite
	) {
		for (const gas of this.gasClouds) {
			if (!gas.circle.active) continue;

			// Drift
			gas.circle.x += gas.vx * delta;
			gas.circle.y += gas.vy * delta;

			// Damage check
			const dist = Phaser.Math.Distance.Between(
				playerSprite.x,
				playerSprite.y,
				gas.circle.x,
				gas.circle.y
			);

			const radius = gas.circle.radius * (gas.circle.scaleX || 1);
			if (dist < radius) {
				// Damage per tick (gentle, but persistent)
				const player = playerSprite.getData('entity');
				if (player && !player.dead) {
					// Only damage every 500ms (tracked via cloud data)
					const lastDmg = (gas.circle as any)._lastDmg ?? 0;
					const now = this.scene.time.now;
					if (now - lastDmg > 500) {
						(gas.circle as any)._lastDmg = now;
						player.takeDamage(1);
					}
				}
			}
		}
	}

	protected onPacified() {
		// Clean up gas clouds
		for (const gas of this.gasClouds) {
			this.scene.tweens.killTweensOf(gas.circle);
			gas.circle.destroy();
		}
		this.gasClouds = [];

		// Happy face text
		const text = this.scene.add
			.text(this.sprite.x, this.sprite.y - 50, ':D', {
				fontSize: '24px',
				color: '#ffcc44',
				fontFamily: 'monospace',
				fontStyle: 'bold'
			})
			.setOrigin(0.5)
			.setDepth(25);

		this.scene.tweens.add({
			targets: text,
			y: text.y - 60,
			alpha: 0,
			duration: 3000,
			onComplete: () => text.destroy()
		});

		super.onPacified();
	}

	destroy() {
		// Clean up gas clouds
		for (const gas of this.gasClouds) {
			this.scene.tweens.killTweensOf(gas.circle);
			if (gas.circle.active) gas.circle.destroy();
		}
		this.gasClouds = [];
		super.destroy();
	}
}
