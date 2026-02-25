import Phaser from 'phaser';
import { Boss } from '../Boss';

/**
 * Knights Who Say Ni — Monty Python
 * Phase 1: 3 knights in formation charge toward player
 * Phase 2: + "NI!" shockwave every 5s (physics pushback)
 * Phase 3: Knights split up, each attacks independently
 * Pacify with A Shrubbery: "A shrubbery! A NICE one!"
 */
export class KnightsWhoSayNi extends Boss {
	private subKnights: Phaser.GameObjects.Sprite[] = [];
	private formationOffsets = [
		{ x: -40, y: -20 },
		{ x: 40, y: -20 },
		{ x: 0, y: 30 }
	];
	private lastNiTime = 0;
	private split = false;
	private splitVelocities: { vx: number; vy: number }[] = [];

	constructor(scene: Phaser.Scene, x: number, y: number) {
		super(scene, x, y, { bossId: 'knights-ni', bodyRadius: 20 });

		// Create 2 additional knight sprites (the main one is the Boss sprite)
		for (let i = 1; i < 3; i++) {
			const knight = scene.add
				.sprite(x + this.formationOffsets[i].x, y + this.formationOffsets[i].y, 'boss-knights')
				.setDepth(8)
				.setScale(1.2);
			this.subKnights.push(knight);
		}

		this.sprite.setScale(1.2);
	}

	protected updateBoss(time: number, _delta: number, playerSprite: Phaser.Physics.Matter.Sprite) {
		const angleToPlayer = Phaser.Math.Angle.Between(
			this.sprite.x,
			this.sprite.y,
			playerSprite.x,
			playerSprite.y
		);

		if (!this.split) {
			// Formation charge
			this.moveToward(playerSprite.x, playerSprite.y, 3 + this.phase);
			this.sprite.setRotation(angleToPlayer);

			// Sub-knights follow in formation
			for (let i = 0; i < this.subKnights.length; i++) {
				const offset = this.formationOffsets[i + 1];
				const cos = Math.cos(angleToPlayer);
				const sin = Math.sin(angleToPlayer);
				const tx = this.sprite.x + cos * offset.x - sin * offset.y;
				const ty = this.sprite.y + sin * offset.x + cos * offset.y;
				this.subKnights[i].setPosition(
					Phaser.Math.Linear(this.subKnights[i].x, tx, 0.08),
					Phaser.Math.Linear(this.subKnights[i].y, ty, 0.08)
				);
				this.subKnights[i].setRotation(angleToPlayer);
			}
		} else {
			// Split mode: each knight chases independently
			this.moveToward(playerSprite.x, playerSprite.y, 4 + this.phase);
			this.sprite.setRotation(angleToPlayer);

			for (let i = 0; i < this.subKnights.length; i++) {
				const k = this.subKnights[i];
				if (!k.active) continue;
				const a = Phaser.Math.Angle.Between(k.x, k.y, playerSprite.x, playerSprite.y);
				const speed = 1.5 + this.phase * 0.5;
				k.x += Math.cos(a) * speed;
				k.y += Math.sin(a) * speed;
				k.setRotation(a);
			}
		}

		// Phase 2+: NI! shockwave
		if (this.phase >= 2 && time - this.lastNiTime > 5000) {
			this.lastNiTime = time;
			this.niShockwave(playerSprite);
		}

		// Phase 3: Split formation
		if (this.phase >= 3 && !this.split) {
			this.split = true;
		}
	}

	private niShockwave(playerSprite: Phaser.Physics.Matter.Sprite) {
		// "NI!" text
		const text = this.scene.add
			.text(this.sprite.x, this.sprite.y - 30, 'NI!', {
				fontSize: '24px',
				color: '#44ff44',
				fontFamily: 'monospace',
				fontStyle: 'bold'
			})
			.setOrigin(0.5)
			.setDepth(25);

		this.scene.tweens.add({
			targets: text,
			y: text.y - 50,
			alpha: 0,
			scaleX: 2,
			scaleY: 2,
			duration: 1000,
			onComplete: () => text.destroy()
		});

		// Visual ring
		const ring = this.scene.add
			.circle(this.sprite.x, this.sprite.y, 10, 0x44ff44, 0.4)
			.setDepth(3);
		this.scene.tweens.add({
			targets: ring,
			scaleX: 20,
			scaleY: 20,
			alpha: 0,
			duration: 600,
			onComplete: () => ring.destroy()
		});

		// Physics pushback
		const dist = Phaser.Math.Distance.Between(
			this.sprite.x,
			this.sprite.y,
			playerSprite.x,
			playerSprite.y
		);

		if (dist < 300) {
			const angle = Phaser.Math.Angle.Between(
				this.sprite.x,
				this.sprite.y,
				playerSprite.x,
				playerSprite.y
			);
			const force = 0.03 * (1 - dist / 300);
			playerSprite.applyForce(
				new Phaser.Math.Vector2(Math.cos(angle) * force, Math.sin(angle) * force)
			);

			// Damage if close
			if (dist < 150) {
				const player = playerSprite.getData('entity');
				if (player && !player.dead) {
					player.takeDamage(2);
				}
			}
		}
	}

	protected onPacified() {
		// Knights march away
		for (const knight of this.subKnights) {
			if (!knight.active) continue;
			const angle = Math.random() * Math.PI * 2;
			this.scene.tweens.add({
				targets: knight,
				x: knight.x + Math.cos(angle) * 500,
				y: knight.y + Math.sin(angle) * 500,
				alpha: 0,
				duration: 2000,
				onComplete: () => knight.destroy()
			});
		}
		this.subKnights = [];
		super.onPacified();
	}

	destroy() {
		for (const knight of this.subKnights) {
			if (knight.active) knight.destroy();
		}
		this.subKnights = [];
		super.destroy();
	}
}
