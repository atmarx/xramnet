import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { BOSS, CATEGORY } from '../config';
import { BOSS_CATALOG, type BossDef } from '../systems/Inventory';
import { EventBus } from '../EventBus';

export interface BossConfig {
	bossId: string;
	bodyRadius?: number;
}

export abstract class Boss extends Enemy {
	bossId: string;
	bossDef: BossDef;
	phase: number = 1;
	pacified = false;

	// Item give interaction
	private givePromptActive = false;
	private giveGraceTimer: Phaser.Time.TimerEvent | null = null;
	private giveWindowTimer: Phaser.Time.TimerEvent | null = null;
	private giveKey: Phaser.Input.Keyboard.Key | null = null;

	constructor(scene: Phaser.Scene, x: number, y: number, bossConfig: BossConfig) {
		const def = BOSS_CATALOG[bossConfig.bossId];
		super(scene, x, y, def.texture, {
			hp: def.hp,
			score: def.combatScore,
			label: `enemy-boss-${bossConfig.bossId}`,
			bodyRadius: bossConfig.bodyRadius ?? BOSS.BODY_RADIUS,
			frictionAir: 0.02
		});

		this.bossId = bossConfig.bossId;
		this.bossDef = def;

		// Bigger sprite for bosses
		this.sprite.setDepth(8);

		// Setup give key listener
		this.giveKey = scene.input.keyboard!.addKey('SPACE');

		// Dramatic entrance
		this.playIntro();
	}

	private playIntro() {
		EventBus.emit('boss-intro', {
			name: this.bossDef.name,
			text: this.bossDef.introText
		});

		// Brief invulnerability during intro
		const origCategory = (this.sprite.body as MatterJS.BodyType).collisionFilter.category!;
		this.sprite.setCollisionCategory(0);
		this.scene.time.delayedCall(BOSS.INTRO_DURATION, () => {
			if (this.sprite.active && !this.dead) {
				this.sprite.setCollisionCategory(origCategory);
			}
		});
	}

	update(time: number, delta: number, playerSprite: Phaser.Physics.Matter.Sprite) {
		if (this.dead || this.pacified || !this.sprite.active) return;

		// Update phase based on HP
		const hpFrac = this.hp / this.maxHp;
		this.phase = this.getPhase(hpFrac);

		// If in give grace period, don't attack
		if (this.givePromptActive) {
			this.checkGiveInput();
			return;
		}

		this.updateBoss(time, delta, playerSprite);
	}

	/** Subclasses implement their specific AI here */
	protected abstract updateBoss(
		time: number,
		delta: number,
		playerSprite: Phaser.Physics.Matter.Sprite
	): void;

	/** Returns current phase (1, 2, or 3) based on HP fraction */
	protected getPhase(hpFrac: number): number {
		if (hpFrac > 0.5) return 1;
		if (hpFrac > 0.25) return 2;
		return 3;
	}

	/**
	 * Called by GameScene when player is in range with the correct item.
	 * Initiates the give interaction.
	 */
	startGiveInteraction(itemName: string) {
		if (this.givePromptActive || this.dead || this.pacified) return;

		this.givePromptActive = true;

		EventBus.emit('boss-give-prompt', {
			show: true,
			itemName,
			bossName: this.bossDef.name
		});

		// Grace period — boss stops attacking briefly
		this.giveGraceTimer = this.scene.time.delayedCall(BOSS.GIVE_GRACE_PERIOD, () => {
			// Grace over, but window still open
		});

		// Window timer — after this, resume attacking
		this.giveWindowTimer = this.scene.time.delayedCall(BOSS.GIVE_WINDOW, () => {
			this.cancelGiveInteraction();
		});
	}

	private checkGiveInput() {
		if (this.giveKey?.isDown) {
			this.acceptItem();
		}
	}

	private acceptItem() {
		this.pacified = true;
		this.givePromptActive = false;
		this.giveGraceTimer?.remove();
		this.giveWindowTimer?.remove();

		EventBus.emit('boss-give-prompt', { show: false });
		EventBus.emit('boss-pacified', {
			bossId: this.bossId,
			quote: this.bossDef.pacifyQuote,
			score: this.bossDef.pacifyScore
		});

		this.onPacified();
	}

	cancelGiveInteraction() {
		if (!this.givePromptActive) return;
		this.givePromptActive = false;
		this.giveGraceTimer?.remove();
		this.giveWindowTimer?.remove();
		EventBus.emit('boss-give-prompt', { show: false });
	}

	/** Override for boss-specific pacify animation */
	protected onPacified() {
		// Default: fade out with particles
		const x = this.sprite.x;
		const y = this.sprite.y;

		const emitter = this.scene.add.particles(x, y, 'particle', {
			speed: { min: 40, max: 150 },
			scale: { start: 2, end: 0 },
			alpha: { start: 0.9, end: 0 },
			lifespan: { min: 500, max: 1200 },
			blendMode: 'ADD',
			tint: [0xffcc44, 0x44ffaa, 0xffffff],
			emitting: false
		});
		emitter.explode(30);
		this.scene.time.delayedCall(1300, () => emitter.destroy());

		// Pacify quote text
		const quoteText = this.scene.add
			.text(x, y - 40, this.bossDef.pacifyQuote, {
				fontSize: '14px',
				color: '#ffcc44',
				fontFamily: 'monospace',
				align: 'center',
				fontStyle: 'bold'
			})
			.setOrigin(0.5)
			.setDepth(25);

		this.scene.tweens.add({
			targets: quoteText,
			y: quoteText.y - 60,
			alpha: 0,
			duration: 3000,
			onComplete: () => quoteText.destroy()
		});

		// Fade out sprite
		this.scene.tweens.add({
			targets: this.sprite,
			alpha: 0,
			scaleX: 0.5,
			scaleY: 0.5,
			duration: 1000,
			onComplete: () => {
				this.sprite.destroy();
			}
		});
	}

	/** Override destroy for dramatic boss death */
	destroy() {
		if (this.sprite.active) {
			const x = this.sprite.x;
			const y = this.sprite.y;

			// Big explosion
			const emitter = this.scene.add.particles(x, y, 'particle', {
				speed: { min: 60, max: 250 },
				scale: { start: 2, end: 0 },
				alpha: { start: 1, end: 0 },
				lifespan: { min: 500, max: 1200 },
				blendMode: 'ADD',
				tint: [0xff4444, 0xff8844, 0xffcc44, 0xffffff],
				emitting: false
			});
			emitter.explode(35);
			this.scene.time.delayedCall(1300, () => emitter.destroy());

			// Camera shake
			this.scene.cameras.main.shake(300, 0.01);

			// Death quote
			EventBus.emit('boss-defeated', {
				bossId: this.bossId,
				quote: this.bossDef.deathQuote,
				score: this.bossDef.combatScore
			});
		}

		this.giveGraceTimer?.remove();
		this.giveWindowTimer?.remove();
		this.sprite.destroy();
	}

	/** Whether this boss is still an active threat */
	isActive(): boolean {
		return !this.dead && !this.pacified && this.sprite.active;
	}
}
