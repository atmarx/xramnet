import Phaser from 'phaser';

/**
 * BootScene: generates placeholder textures and transitions to GameScene.
 * When real pixel art assets exist, this will preload them instead.
 */
export class BootScene extends Phaser.Scene {
	constructor() {
		super('BootScene');
	}

	preload() {
		// Progress bar
		const { width, height } = this.scale;
		const barW = 320;
		const barH = 20;
		const barX = (width - barW) / 2;
		const barY = height / 2;

		const bg = this.add.rectangle(barX + barW / 2, barY, barW, barH, 0x222222);
		const fill = this.add.rectangle(barX + 2, barY, 0, barH - 4, 0x4488ff);
		fill.setOrigin(0, 0.5);

		const text = this.add
			.text(width / 2, barY - 30, 'Entering The Rift...', {
				fontSize: '16px',
				color: '#6688cc'
			})
			.setOrigin(0.5);

		this.load.on('progress', (value: number) => {
			fill.width = (barW - 4) * value;
		});

		this.load.on('complete', () => {
			bg.destroy();
			fill.destroy();
			text.destroy();
		});

		// Real sprite assets
		this.load.image('kilroy', 'game/sprites/kilroy.webp');
		this.load.image('kilroy-text', 'game/sprites/kilroy-text.webp');
		this.load.image('meme-doge', 'game/sprites/meme-doge.webp');
		this.load.image('meme-nyan', 'game/sprites/meme-nyan.webp');
		this.load.image('meme-harambe', 'game/sprites/meme-harambe.webp');
		this.load.image('meme-blb', 'game/sprites/meme-blb.webp');
		this.load.image('meme-success', 'game/sprites/meme-success.webp');
		this.load.image('meme-toothfairy', 'game/sprites/meme-toothfairy.webp');
		this.load.image('meme-operator', 'game/sprites/meme-operator.webp');
	}

	create() {
		this.generatePlaceholderTextures();
		this.scene.start('GameScene');
	}

	private generatePlaceholderTextures() {
		// Ship: white triangle pointing right
		const shipGfx = this.make.graphics({ x: 0, y: 0, add: false });
		shipGfx.fillStyle(0xffffff, 1);
		shipGfx.beginPath();
		shipGfx.moveTo(32, 16); // nose (right)
		shipGfx.lineTo(0, 0); // top-left
		shipGfx.lineTo(6, 16); // indent
		shipGfx.lineTo(0, 32); // bottom-left
		shipGfx.closePath();
		shipGfx.fillPath();
		// Engine glow
		shipGfx.fillStyle(0x4488ff, 0.6);
		shipGfx.fillCircle(4, 16, 5);
		shipGfx.generateTexture('ship', 32, 32);
		shipGfx.destroy();

		// Laser bolt: small bright rectangle
		const laserGfx = this.make.graphics({ x: 0, y: 0, add: false });
		laserGfx.fillStyle(0x44ffaa, 1);
		laserGfx.fillRect(0, 2, 12, 4);
		laserGfx.fillStyle(0xffffff, 0.8);
		laserGfx.fillRect(1, 3, 10, 2);
		laserGfx.generateTexture('laser', 12, 8);
		laserGfx.destroy();

		// Asteroid: brownish irregular circle
		const astGfx = this.make.graphics({ x: 0, y: 0, add: false });
		astGfx.fillStyle(0x887766, 1);
		astGfx.fillCircle(16, 16, 14);
		astGfx.fillStyle(0x665544, 0.6);
		astGfx.fillCircle(12, 12, 5);
		astGfx.fillCircle(20, 18, 4);
		astGfx.generateTexture('asteroid', 32, 32);
		astGfx.destroy();

		// Enemy scout: red diamond
		const scoutGfx = this.make.graphics({ x: 0, y: 0, add: false });
		scoutGfx.fillStyle(0xff4444, 1);
		scoutGfx.beginPath();
		scoutGfx.moveTo(16, 0);
		scoutGfx.lineTo(32, 16);
		scoutGfx.lineTo(16, 32);
		scoutGfx.lineTo(0, 16);
		scoutGfx.closePath();
		scoutGfx.fillPath();
		scoutGfx.generateTexture('scout', 32, 32);
		scoutGfx.destroy();

		// Enemy bullet: small red dot
		const ebGfx = this.make.graphics({ x: 0, y: 0, add: false });
		ebGfx.fillStyle(0xff6644, 1);
		ebGfx.fillCircle(4, 4, 4);
		ebGfx.generateTexture('enemy-bullet', 8, 8);
		ebGfx.destroy();

		// Enemy turret: orange octagon with barrel
		const turretGfx = this.make.graphics({ x: 0, y: 0, add: false });
		turretGfx.fillStyle(0xff8800, 1);
		turretGfx.beginPath();
		for (let i = 0; i < 8; i++) {
			const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
			const px = 16 + Math.cos(a) * 14;
			const py = 16 + Math.sin(a) * 14;
			if (i === 0) turretGfx.moveTo(px, py);
			else turretGfx.lineTo(px, py);
		}
		turretGfx.closePath();
		turretGfx.fillPath();
		turretGfx.fillStyle(0xffaa44, 0.8);
		turretGfx.fillRect(24, 14, 8, 4);
		turretGfx.generateTexture('turret', 32, 32);
		turretGfx.destroy();

		// Enemy swarmer: small green triangle
		const swarmerGfx = this.make.graphics({ x: 0, y: 0, add: false });
		swarmerGfx.fillStyle(0x44ff44, 1);
		swarmerGfx.beginPath();
		swarmerGfx.moveTo(20, 4);
		swarmerGfx.lineTo(24, 20);
		swarmerGfx.lineTo(0, 12);
		swarmerGfx.closePath();
		swarmerGfx.fillPath();
		swarmerGfx.generateTexture('swarmer', 24, 24);
		swarmerGfx.destroy();

		// Sensor beacon: cyan diamond with glow
		const beaconGfx = this.make.graphics({ x: 0, y: 0, add: false });
		beaconGfx.fillStyle(0x00ccff, 0.3);
		beaconGfx.fillCircle(12, 12, 12);
		beaconGfx.fillStyle(0x44eeff, 1);
		beaconGfx.beginPath();
		beaconGfx.moveTo(12, 2);
		beaconGfx.lineTo(22, 12);
		beaconGfx.lineTo(12, 22);
		beaconGfx.lineTo(2, 12);
		beaconGfx.closePath();
		beaconGfx.fillPath();
		beaconGfx.generateTexture('sensor-beacon', 24, 24);
		beaconGfx.destroy();

		// Planet: blue sphere with atmospheric bands (64x64)
		const planetGfx = this.make.graphics({ x: 0, y: 0, add: false });
		planetGfx.fillStyle(0x4488aa, 1);
		planetGfx.fillCircle(32, 32, 28);
		planetGfx.fillStyle(0x5599bb, 0.4);
		planetGfx.fillRect(8, 22, 48, 4);
		planetGfx.fillRect(6, 30, 52, 3);
		planetGfx.fillRect(8, 38, 48, 4);
		planetGfx.fillStyle(0xffffff, 0.12);
		planetGfx.fillCircle(24, 24, 18);
		planetGfx.generateTexture('planet', 64, 64);
		planetGfx.destroy();

		// Wormhole: spiral with glow (32x32)
		const whGfx = this.make.graphics({ x: 0, y: 0, add: false });
		whGfx.fillStyle(0xff44ff, 0.2);
		whGfx.fillCircle(16, 16, 16);
		whGfx.lineStyle(2, 0xff88ff, 0.8);
		whGfx.beginPath();
		for (let t = 0; t < Math.PI * 4; t += 0.15) {
			const r = 2 + t * 2;
			const px = 16 + Math.cos(t) * r;
			const py = 16 + Math.sin(t) * r;
			if (t === 0) whGfx.moveTo(px, py);
			else whGfx.lineTo(px, py);
		}
		whGfx.strokePath();
		whGfx.fillStyle(0xffffff, 0.9);
		whGfx.fillCircle(16, 16, 3);
		whGfx.generateTexture('wormhole', 32, 32);
		whGfx.destroy();

		// Mushroom: red cap with white spots (24x24)
		const mushGfx = this.make.graphics({ x: 0, y: 0, add: false });
		mushGfx.fillStyle(0xddccaa, 1);
		mushGfx.fillRect(9, 14, 6, 10);
		mushGfx.fillStyle(0xff4444, 1);
		mushGfx.fillCircle(12, 10, 8);
		mushGfx.fillStyle(0xffffff, 0.8);
		mushGfx.fillCircle(9, 8, 2);
		mushGfx.fillCircle(14, 7, 1.5);
		mushGfx.fillCircle(11, 5, 1.5);
		mushGfx.generateTexture('mushroom', 24, 24);
		mushGfx.destroy();

		// Easter egg: data pad / terminal (24x24)
		const eggPadGfx = this.make.graphics({ x: 0, y: 0, add: false });
		eggPadGfx.fillStyle(0x334466, 1);
		eggPadGfx.fillRoundedRect(4, 2, 16, 20, 2);
		eggPadGfx.fillStyle(0x44aaff, 0.6);
		eggPadGfx.fillRect(6, 4, 12, 10);
		eggPadGfx.fillStyle(0x88ccff, 0.4);
		eggPadGfx.fillRect(7, 5, 4, 1);
		eggPadGfx.fillRect(7, 7, 8, 1);
		eggPadGfx.fillRect(7, 9, 6, 1);
		eggPadGfx.fillRect(7, 11, 10, 1);
		eggPadGfx.fillStyle(0x55aacc, 0.8);
		eggPadGfx.fillCircle(12, 18, 2);
		eggPadGfx.generateTexture('egg-datapad', 24, 24);
		eggPadGfx.destroy();

		// Easter egg: glowing artifact (24x24)
		const eggArtGfx = this.make.graphics({ x: 0, y: 0, add: false });
		eggArtGfx.fillStyle(0x8844ff, 0.2);
		eggArtGfx.fillCircle(12, 12, 12);
		eggArtGfx.fillStyle(0xaa66ff, 0.4);
		eggArtGfx.fillCircle(12, 12, 8);
		eggArtGfx.fillStyle(0xcc88ff, 1);
		eggArtGfx.beginPath();
		eggArtGfx.moveTo(12, 3);
		eggArtGfx.lineTo(17, 10);
		eggArtGfx.lineTo(14, 10);
		eggArtGfx.lineTo(16, 21);
		eggArtGfx.lineTo(12, 14);
		eggArtGfx.lineTo(8, 21);
		eggArtGfx.lineTo(10, 10);
		eggArtGfx.lineTo(7, 10);
		eggArtGfx.closePath();
		eggArtGfx.fillPath();
		eggArtGfx.generateTexture('egg-artifact', 24, 24);
		eggArtGfx.destroy();

		// Easter egg: space junk / crate (24x24)
		const eggCrateGfx = this.make.graphics({ x: 0, y: 0, add: false });
		eggCrateGfx.fillStyle(0x886644, 1);
		eggCrateGfx.fillRect(3, 5, 18, 14);
		eggCrateGfx.lineStyle(1, 0xaa8866, 0.8);
		eggCrateGfx.strokeRect(3, 5, 18, 14);
		eggCrateGfx.lineStyle(1, 0x664422, 0.6);
		eggCrateGfx.lineBetween(3, 12, 21, 12);
		eggCrateGfx.lineBetween(12, 5, 12, 19);
		eggCrateGfx.fillStyle(0xffcc44, 0.6);
		eggCrateGfx.fillRect(10, 10, 4, 4);
		eggCrateGfx.generateTexture('egg-crate', 24, 24);
		eggCrateGfx.destroy();

		// Easter egg: signal beacon (24x24)
		const eggSigGfx = this.make.graphics({ x: 0, y: 0, add: false });
		eggSigGfx.fillStyle(0x556677, 1);
		eggSigGfx.fillRect(10, 8, 4, 14);
		eggSigGfx.fillStyle(0xff4444, 0.9);
		eggSigGfx.fillCircle(12, 6, 4);
		eggSigGfx.lineStyle(1, 0xff6666, 0.4);
		eggSigGfx.strokeCircle(12, 6, 7);
		eggSigGfx.strokeCircle(12, 6, 10);
		eggSigGfx.generateTexture('egg-signal', 24, 24);
		eggSigGfx.destroy();

		// Pickup: speed boost — blue lightning bolt (24x24)
		const speedGfx = this.make.graphics({ x: 0, y: 0, add: false });
		speedGfx.fillStyle(0x2266ff, 0.3);
		speedGfx.fillCircle(12, 12, 11);
		speedGfx.fillStyle(0x44aaff, 1);
		speedGfx.beginPath();
		speedGfx.moveTo(14, 2);
		speedGfx.lineTo(6, 12);
		speedGfx.lineTo(11, 12);
		speedGfx.lineTo(8, 22);
		speedGfx.lineTo(18, 10);
		speedGfx.lineTo(13, 10);
		speedGfx.closePath();
		speedGfx.fillPath();
		speedGfx.generateTexture('pickup-speed', 24, 24);
		speedGfx.destroy();

		// Pickup: double shot — two green arrows (24x24)
		const doubleGfx = this.make.graphics({ x: 0, y: 0, add: false });
		doubleGfx.fillStyle(0x22aa44, 0.3);
		doubleGfx.fillCircle(12, 12, 11);
		doubleGfx.fillStyle(0x44ff66, 1);
		// Left arrow
		doubleGfx.beginPath();
		doubleGfx.moveTo(10, 4);
		doubleGfx.lineTo(6, 12);
		doubleGfx.lineTo(10, 20);
		doubleGfx.lineTo(10, 15);
		doubleGfx.lineTo(8, 15);
		doubleGfx.lineTo(8, 9);
		doubleGfx.lineTo(10, 9);
		doubleGfx.closePath();
		doubleGfx.fillPath();
		// Right arrow
		doubleGfx.beginPath();
		doubleGfx.moveTo(16, 4);
		doubleGfx.lineTo(20, 12);
		doubleGfx.lineTo(16, 20);
		doubleGfx.lineTo(16, 15);
		doubleGfx.lineTo(14, 15);
		doubleGfx.lineTo(14, 9);
		doubleGfx.lineTo(16, 9);
		doubleGfx.closePath();
		doubleGfx.fillPath();
		doubleGfx.generateTexture('pickup-doubleshot', 24, 24);
		doubleGfx.destroy();

		// Pickup: shield overcharge — cyan shield icon (24x24)
		const shieldGfx = this.make.graphics({ x: 0, y: 0, add: false });
		shieldGfx.fillStyle(0x22aacc, 0.3);
		shieldGfx.fillCircle(12, 12, 11);
		shieldGfx.fillStyle(0x44eeff, 1);
		shieldGfx.beginPath();
		shieldGfx.moveTo(12, 3);
		shieldGfx.lineTo(20, 7);
		shieldGfx.lineTo(19, 14);
		shieldGfx.lineTo(12, 21);
		shieldGfx.lineTo(5, 14);
		shieldGfx.lineTo(4, 7);
		shieldGfx.closePath();
		shieldGfx.fillPath();
		shieldGfx.fillStyle(0x88ffff, 0.5);
		shieldGfx.beginPath();
		shieldGfx.moveTo(12, 6);
		shieldGfx.lineTo(17, 9);
		shieldGfx.lineTo(16, 13);
		shieldGfx.lineTo(12, 17);
		shieldGfx.lineTo(8, 13);
		shieldGfx.lineTo(7, 9);
		shieldGfx.closePath();
		shieldGfx.fillPath();
		shieldGfx.generateTexture('pickup-shield', 24, 24);
		shieldGfx.destroy();

		// Pickup: mystery — rainbow question mark (24x24)
		const mystGfx = this.make.graphics({ x: 0, y: 0, add: false });
		mystGfx.fillStyle(0xff44ff, 0.2);
		mystGfx.fillCircle(12, 12, 11);
		mystGfx.fillStyle(0xaa44ff, 0.3);
		mystGfx.fillCircle(12, 12, 8);
		// Question mark shape
		mystGfx.fillStyle(0xffcc44, 1);
		mystGfx.fillCircle(12, 8, 4);
		mystGfx.fillStyle(0x000000, 1);
		mystGfx.fillCircle(12, 8, 2);
		mystGfx.fillStyle(0xffcc44, 1);
		mystGfx.fillRect(11, 11, 3, 4);
		mystGfx.fillCircle(12, 18, 1.5);
		mystGfx.generateTexture('pickup-mystery', 24, 24);
		mystGfx.destroy();

		// ── Boss Textures ────────────────────────────────────────

		// Boss: Old Gregg — green humanoid with glowing eyes (48x48)
		const greggGfx = this.make.graphics({ x: 0, y: 0, add: false });
		greggGfx.fillStyle(0x44ffaa, 0.3);
		greggGfx.fillCircle(24, 24, 22);
		greggGfx.fillStyle(0x22aa66, 1);
		greggGfx.fillCircle(24, 24, 16);
		greggGfx.fillStyle(0x44ffcc, 1);
		greggGfx.fillCircle(18, 20, 4); // left eye
		greggGfx.fillCircle(30, 20, 4); // right eye
		greggGfx.fillStyle(0xffffff, 0.9);
		greggGfx.fillCircle(18, 20, 2);
		greggGfx.fillCircle(30, 20, 2);
		greggGfx.fillStyle(0x44ffaa, 0.8);
		greggGfx.fillRect(18, 30, 12, 3); // mouth
		greggGfx.generateTexture('boss-gregg', 48, 48);
		greggGfx.destroy();

		// Boss: Borg Cube — grey-green cube with grid (48x48)
		const borgGfx = this.make.graphics({ x: 0, y: 0, add: false });
		borgGfx.fillStyle(0x334433, 1);
		borgGfx.fillRect(6, 6, 36, 36);
		borgGfx.lineStyle(1, 0x44ff44, 0.4);
		for (let i = 0; i < 5; i++) {
			borgGfx.lineBetween(6 + i * 9, 6, 6 + i * 9, 42);
			borgGfx.lineBetween(6, 6 + i * 9, 42, 6 + i * 9);
		}
		borgGfx.fillStyle(0x44ff44, 0.6);
		borgGfx.fillCircle(24, 24, 4);
		borgGfx.lineStyle(1, 0x66ff66, 0.3);
		borgGfx.strokeRect(6, 6, 36, 36);
		borgGfx.generateTexture('boss-borg', 48, 48);
		borgGfx.destroy();

		// Boss: The Moon — grey circle with silly face (64x64)
		const moonGfx = this.make.graphics({ x: 0, y: 0, add: false });
		moonGfx.fillStyle(0xccccaa, 1);
		moonGfx.fillCircle(32, 32, 28);
		moonGfx.fillStyle(0xaaaaaa, 0.4);
		moonGfx.fillCircle(22, 24, 5);
		moonGfx.fillCircle(38, 30, 4);
		moonGfx.fillCircle(28, 38, 3);
		moonGfx.fillStyle(0x222222, 1);
		moonGfx.fillCircle(24, 26, 3); // left eye
		moonGfx.fillCircle(38, 26, 3); // right eye
		moonGfx.fillStyle(0xffffff, 0.8);
		moonGfx.fillCircle(25, 25, 1);
		moonGfx.fillCircle(39, 25, 1);
		moonGfx.fillStyle(0x333333, 1);
		moonGfx.fillRect(28, 36, 8, 3); // mouth
		moonGfx.generateTexture('boss-moon', 64, 64);
		moonGfx.destroy();

		// Boss: Knights Who Say Ni — green knight helmet (32x32)
		const knightGfx = this.make.graphics({ x: 0, y: 0, add: false });
		knightGfx.fillStyle(0x44aa44, 1);
		knightGfx.fillRect(8, 6, 16, 20);
		knightGfx.fillStyle(0x338833, 1);
		knightGfx.fillRect(8, 4, 16, 6);
		knightGfx.fillStyle(0x226622, 0.8);
		knightGfx.fillRect(10, 14, 12, 3); // visor slit
		knightGfx.fillStyle(0xffcc44, 0.6);
		knightGfx.fillRect(14, 2, 4, 6); // plume
		knightGfx.generateTexture('boss-knights', 32, 32);
		knightGfx.destroy();

		// Boss: Black Knight — dark armored figure (32x32)
		const bkGfx = this.make.graphics({ x: 0, y: 0, add: false });
		bkGfx.fillStyle(0x222222, 1);
		bkGfx.fillRect(8, 4, 16, 24);
		bkGfx.fillStyle(0x444444, 1);
		bkGfx.fillRect(8, 4, 16, 8);
		bkGfx.fillStyle(0xff2222, 0.6);
		bkGfx.fillRect(10, 8, 12, 2); // visor glow
		bkGfx.fillStyle(0x888888, 0.8);
		bkGfx.fillRect(4, 12, 6, 2); // left arm
		bkGfx.fillRect(22, 12, 6, 2); // right arm
		bkGfx.fillStyle(0xaaaaaa, 0.6);
		bkGfx.fillRect(24, 8, 8, 2); // sword
		bkGfx.generateTexture('boss-bknight', 32, 32);
		bkGfx.destroy();

		// Boss: GLaDOS — mechanical eye with chassis (48x48)
		const gladosGfx = this.make.graphics({ x: 0, y: 0, add: false });
		gladosGfx.fillStyle(0x555566, 1);
		gladosGfx.fillRect(16, 8, 16, 32);
		gladosGfx.fillStyle(0x666677, 0.8);
		gladosGfx.fillRect(12, 16, 24, 8);
		gladosGfx.fillStyle(0xffaa00, 1);
		gladosGfx.fillCircle(24, 20, 6);
		gladosGfx.fillStyle(0xff4400, 0.8);
		gladosGfx.fillCircle(24, 20, 3);
		gladosGfx.fillStyle(0xffffff, 0.9);
		gladosGfx.fillCircle(24, 19, 1.5);
		gladosGfx.lineStyle(1, 0x888899, 0.5);
		gladosGfx.lineBetween(24, 8, 24, 4);
		gladosGfx.lineBetween(24, 40, 24, 44);
		gladosGfx.generateTexture('boss-glados', 48, 48);
		gladosGfx.destroy();

		// Boss: Q — glowing golden humanoid (32x32)
		const qGfx = this.make.graphics({ x: 0, y: 0, add: false });
		qGfx.fillStyle(0xffcc44, 0.2);
		qGfx.fillCircle(16, 16, 16);
		qGfx.fillStyle(0xffaa22, 0.4);
		qGfx.fillCircle(16, 16, 10);
		qGfx.fillStyle(0xffdd66, 1);
		qGfx.fillCircle(16, 12, 6); // head
		qGfx.fillRect(13, 18, 6, 10); // body
		qGfx.fillStyle(0xffffff, 0.8);
		qGfx.fillCircle(14, 11, 1.5);
		qGfx.fillCircle(18, 11, 1.5);
		qGfx.generateTexture('boss-q', 32, 32);
		qGfx.destroy();

		// ── Item Textures ────────────────────────────────────────

		// Item: Bailey's — brown bottle (24x24)
		const bailGfx = this.make.graphics({ x: 0, y: 0, add: false });
		bailGfx.fillStyle(0xffcc44, 0.2);
		bailGfx.fillCircle(12, 12, 11);
		bailGfx.fillStyle(0x664422, 1);
		bailGfx.fillRect(8, 8, 8, 14);
		bailGfx.fillStyle(0x553311, 1);
		bailGfx.fillRect(9, 4, 6, 6);
		bailGfx.fillStyle(0xccaa66, 0.8);
		bailGfx.fillRect(9, 12, 6, 4);
		bailGfx.generateTexture('item-baileys', 24, 24);
		bailGfx.destroy();

		// Item: Deflector Dish — blue satellite dish (24x24)
		const deflGfx = this.make.graphics({ x: 0, y: 0, add: false });
		deflGfx.fillStyle(0x4488ff, 0.2);
		deflGfx.fillCircle(12, 12, 11);
		deflGfx.fillStyle(0x6699cc, 1);
		deflGfx.beginPath();
		deflGfx.arc(12, 14, 8, Math.PI, 0, false, 0.05);
		deflGfx.fillPath();
		deflGfx.fillStyle(0x44aaff, 0.9);
		deflGfx.fillCircle(12, 12, 3);
		deflGfx.fillStyle(0x888888, 0.8);
		deflGfx.fillRect(11, 4, 2, 8);
		deflGfx.generateTexture('item-deflector', 24, 24);
		deflGfx.destroy();

		// Item: Space Cheese — yellow wedge (24x24)
		const cheeseGfx = this.make.graphics({ x: 0, y: 0, add: false });
		cheeseGfx.fillStyle(0xffcc44, 0.2);
		cheeseGfx.fillCircle(12, 12, 11);
		cheeseGfx.fillStyle(0xffcc22, 1);
		cheeseGfx.beginPath();
		cheeseGfx.moveTo(4, 18);
		cheeseGfx.lineTo(20, 18);
		cheeseGfx.lineTo(20, 8);
		cheeseGfx.closePath();
		cheeseGfx.fillPath();
		cheeseGfx.fillStyle(0xeeaa00, 0.5);
		cheeseGfx.fillCircle(12, 15, 2);
		cheeseGfx.fillCircle(16, 13, 1.5);
		cheeseGfx.generateTexture('item-cheese', 24, 24);
		cheeseGfx.destroy();

		// Item: Shrubbery — green bush (24x24)
		const shrubGfx = this.make.graphics({ x: 0, y: 0, add: false });
		shrubGfx.fillStyle(0x44aa44, 0.2);
		shrubGfx.fillCircle(12, 12, 11);
		shrubGfx.fillStyle(0x664422, 1);
		shrubGfx.fillRect(10, 16, 4, 6);
		shrubGfx.fillStyle(0x22aa22, 1);
		shrubGfx.fillCircle(12, 12, 7);
		shrubGfx.fillStyle(0x44cc44, 0.6);
		shrubGfx.fillCircle(9, 10, 4);
		shrubGfx.fillCircle(15, 11, 3);
		shrubGfx.generateTexture('item-shrubbery', 24, 24);
		shrubGfx.destroy();

		// Item: Holy Hand Grenade — golden orb with cross (24x24)
		const grenadeGfx = this.make.graphics({ x: 0, y: 0, add: false });
		grenadeGfx.fillStyle(0xffcc44, 0.3);
		grenadeGfx.fillCircle(12, 12, 11);
		grenadeGfx.fillStyle(0xddaa22, 1);
		grenadeGfx.fillCircle(12, 14, 7);
		grenadeGfx.fillStyle(0xffcc44, 0.8);
		grenadeGfx.fillRect(11, 3, 2, 8);
		grenadeGfx.fillRect(8, 6, 8, 2);
		grenadeGfx.generateTexture('item-grenade', 24, 24);
		grenadeGfx.destroy();

		// Item: Companion Cube — pink cube with heart (24x24)
		const cubeGfx = this.make.graphics({ x: 0, y: 0, add: false });
		cubeGfx.fillStyle(0xff88cc, 0.2);
		cubeGfx.fillCircle(12, 12, 11);
		cubeGfx.fillStyle(0xaaaaaa, 1);
		cubeGfx.fillRect(5, 5, 14, 14);
		cubeGfx.lineStyle(1, 0x888888, 0.6);
		cubeGfx.strokeRect(5, 5, 14, 14);
		cubeGfx.fillStyle(0xff6699, 0.9);
		// Heart shape (simplified)
		cubeGfx.fillCircle(10, 11, 2.5);
		cubeGfx.fillCircle(14, 11, 2.5);
		cubeGfx.beginPath();
		cubeGfx.moveTo(7, 12);
		cubeGfx.lineTo(12, 17);
		cubeGfx.lineTo(17, 12);
		cubeGfx.closePath();
		cubeGfx.fillPath();
		cubeGfx.generateTexture('item-cube', 24, 24);
		cubeGfx.destroy();

		// Item: Earl Grey Tea — steaming cup (24x24)
		const teaGfx = this.make.graphics({ x: 0, y: 0, add: false });
		teaGfx.fillStyle(0xffcc44, 0.2);
		teaGfx.fillCircle(12, 12, 11);
		teaGfx.fillStyle(0xdddddd, 1);
		teaGfx.fillRect(7, 10, 10, 10);
		teaGfx.fillStyle(0xcccccc, 0.8);
		teaGfx.fillRect(17, 13, 3, 4); // handle
		teaGfx.fillStyle(0x886644, 0.6);
		teaGfx.fillRect(8, 11, 8, 6); // tea
		// Steam wisps
		teaGfx.lineStyle(1, 0xffffff, 0.4);
		teaGfx.beginPath();
		teaGfx.moveTo(10, 10);
		teaGfx.lineTo(9, 6);
		teaGfx.moveTo(14, 10);
		teaGfx.lineTo(15, 5);
		teaGfx.strokePath();
		teaGfx.generateTexture('item-tea', 24, 24);
		teaGfx.destroy();

		// Patrol ship: friendly blue-green diamond shape (32x32)
		const patrolGfx = this.make.graphics({ x: 0, y: 0, add: false });
		patrolGfx.fillStyle(0x44aa88, 1);
		patrolGfx.beginPath();
		patrolGfx.moveTo(28, 16); // nose
		patrolGfx.lineTo(16, 8); // top wing
		patrolGfx.lineTo(4, 16); // tail
		patrolGfx.lineTo(16, 24); // bottom wing
		patrolGfx.closePath();
		patrolGfx.fillPath();
		patrolGfx.fillStyle(0x66ccaa, 0.6);
		patrolGfx.fillCircle(20, 16, 4); // cockpit glow
		patrolGfx.generateTexture('patrol-ship', 32, 32);
		patrolGfx.destroy();

		// Distress beacon: pulsing red signal (16x16)
		const distressGfx = this.make.graphics({ x: 0, y: 0, add: false });
		distressGfx.fillStyle(0xff4444, 0.8);
		distressGfx.fillCircle(8, 8, 6);
		distressGfx.fillStyle(0xff8888, 0.5);
		distressGfx.fillCircle(8, 8, 3);
		distressGfx.fillStyle(0xffffff, 0.8);
		distressGfx.fillCircle(8, 8, 1.5);
		distressGfx.generateTexture('distress-beacon', 16, 16);
		distressGfx.destroy();

		// Particle: tiny white dot (for debris/effects)
		const particleGfx = this.make.graphics({ x: 0, y: 0, add: false });
		particleGfx.fillStyle(0xffffff, 1);
		particleGfx.fillCircle(2, 2, 2);
		particleGfx.generateTexture('particle', 4, 4);
		particleGfx.destroy();

		// Star: single pixel for parallax
		const starGfx = this.make.graphics({ x: 0, y: 0, add: false });
		starGfx.fillStyle(0xffffff, 1);
		starGfx.fillRect(0, 0, 2, 2);
		starGfx.generateTexture('star-dot', 2, 2);
		starGfx.destroy();
	}
}
