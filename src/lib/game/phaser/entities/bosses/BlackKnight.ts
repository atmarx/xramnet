import Phaser from 'phaser';
import { Boss } from '../Boss';

/**
 * The Black Knight — Monty Python
 * Phase 1: Aggressive charge + contact damage
 * Phase 2 (60% HP): "Tis but a scratch!" — speed +50%
 * Phase 3 (30% HP): "Just a flesh wound!" — speed +100%
 * Pacify with Holy Hand Grenade: "Right, I'll call it a draw!"
 */
export class BlackKnight extends Boss {
	private chargeSpeed = 5;
	private lastTauntTime = 0;
	private currentTaunt = '';

	constructor(scene: Phaser.Scene, x: number, y: number) {
		super(scene, x, y, { bossId: 'black-knight', bodyRadius: 16 });
		this.sprite.setScale(1.3);
	}

	protected getPhase(hpFrac: number): number {
		if (hpFrac > 0.6) return 1;
		if (hpFrac > 0.3) return 2;
		return 3;
	}

	protected updateBoss(time: number, _delta: number, playerSprite: Phaser.Physics.Matter.Sprite) {
		const oldPhase = this.phase;

		// Check for phase transitions
		const hpFrac = this.hp / this.maxHp;
		const newPhase = this.getPhase(hpFrac);

		if (newPhase !== oldPhase && newPhase > oldPhase) {
			this.onPhaseChange(newPhase);
		}

		// Always charge toward player
		const speed = this.chargeSpeed * (1 + (this.phase - 1) * 0.5);
		this.moveToward(playerSprite.x, playerSprite.y, speed);

		// Face the player
		const angle = Phaser.Math.Angle.Between(
			this.sprite.x,
			this.sprite.y,
			playerSprite.x,
			playerSprite.y
		);
		this.sprite.setRotation(angle);

		// Phase 2+: occasional sword swing (area bullet burst)
		if (this.phase >= 2) {
			const dist = Phaser.Math.Distance.Between(
				this.sprite.x,
				this.sprite.y,
				playerSprite.x,
				playerSprite.y
			);
			if (dist < 120 && time - this.lastTauntTime > 2000) {
				this.lastTauntTime = time;
				this.swordSwing(angle);
			}
		}
	}

	private onPhaseChange(newPhase: number) {
		const taunts: Record<number, string> = {
			2: "'Tis but a scratch!",
			3: 'Just a flesh wound!'
		};

		this.currentTaunt = taunts[newPhase] || '';
		if (this.currentTaunt) {
			// Floating taunt text
			const text = this.scene.add
				.text(this.sprite.x, this.sprite.y - 40, this.currentTaunt, {
					fontSize: '14px',
					color: '#ff6644',
					fontFamily: 'monospace',
					fontStyle: 'bold'
				})
				.setOrigin(0.5)
				.setDepth(25);

			this.scene.tweens.add({
				targets: text,
				y: text.y - 50,
				alpha: 0,
				duration: 2500,
				onComplete: () => text.destroy()
			});

			// Screen shake on phase transition
			this.scene.cameras.main.shake(200, 0.005);
		}

		// Visual change: tint darker with each phase
		if (newPhase === 2) {
			this.sprite.setTint(0xcc4444);
		} else if (newPhase === 3) {
			this.sprite.setTint(0xff2222);
			// Phase 3: reduce body size (losing limbs!)
			this.sprite.setScale(1.0);
		}
	}

	private swordSwing(baseAngle: number) {
		// Close-range burst of 3 projectiles in a fan
		for (let i = -1; i <= 1; i++) {
			this.fireEnemyBullet(baseAngle + i * 0.4, 4, 3);
		}
	}

	protected onPacified() {
		// Hop away animation
		const hopDir = Math.random() * Math.PI * 2;
		this.scene.tweens.add({
			targets: this.sprite,
			x: this.sprite.x + Math.cos(hopDir) * 300,
			y: this.sprite.y + Math.sin(hopDir) * 300,
			alpha: 0,
			scaleX: 0.3,
			scaleY: 0.3,
			duration: 1500,
			ease: 'Bounce.easeOut',
			onComplete: () => {
				super.onPacified();
			}
		});
	}
}
