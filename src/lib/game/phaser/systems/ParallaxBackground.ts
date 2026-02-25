import Phaser from 'phaser';
import { STAR_LAYERS, SECTOR } from '../config';

interface Star {
	x: number;
	y: number;
	size: number;
	alpha: number;
	twinklePhase: number;
	twinkleSpeed: number;
}

interface StarLayer {
	stars: Star[];
	speed: number;
	graphics: Phaser.GameObjects.Graphics;
}

/**
 * Three-layer parallax starfield that scrolls relative to camera movement.
 * Stars are distributed across a padded area and wrap around edges.
 */
export class ParallaxBackground {
	private scene: Phaser.Scene;
	private layers: StarLayer[] = [];
	private lastCamX = 0;
	private lastCamY = 0;

	// Stars fill an area larger than the viewport for smooth wrapping
	private fieldWidth: number;
	private fieldHeight: number;

	constructor(scene: Phaser.Scene) {
		this.scene = scene;
		const cam = scene.cameras.main;
		this.fieldWidth = cam.width + 200;
		this.fieldHeight = cam.height + 200;
		this.lastCamX = cam.scrollX;
		this.lastCamY = cam.scrollY;

		this.createLayers();
	}

	private createLayers() {
		for (const layerDef of STAR_LAYERS) {
			const gfx = this.scene.add.graphics();
			gfx.setScrollFactor(0); // drawn in screen space
			gfx.setDepth(-10 + STAR_LAYERS.indexOf(layerDef));

			const stars: Star[] = [];
			for (let i = 0; i < layerDef.count; i++) {
				stars.push({
					x: Math.random() * this.fieldWidth - 100,
					y: Math.random() * this.fieldHeight - 100,
					size: Phaser.Math.Between(layerDef.minSize, layerDef.maxSize),
					alpha: layerDef.alpha,
					twinklePhase: Math.random() * Math.PI * 2,
					twinkleSpeed: 0.5 + Math.random() * 1.5
				});
			}

			this.layers.push({ stars, speed: layerDef.speed, graphics: gfx });
		}
	}

	update(time: number) {
		const cam = this.scene.cameras.main;
		const dx = cam.scrollX - this.lastCamX;
		const dy = cam.scrollY - this.lastCamY;
		this.lastCamX = cam.scrollX;
		this.lastCamY = cam.scrollY;

		const vw = cam.width;
		const vh = cam.height;

		for (const layer of this.layers) {
			layer.graphics.clear();

			for (const star of layer.stars) {
				// Parallax offset: faster layers scroll more
				star.x -= dx * layer.speed;
				star.y -= dy * layer.speed;

				// Wrap around edges
				if (star.x < -100) star.x += this.fieldWidth;
				else if (star.x > vw + 100) star.x -= this.fieldWidth;
				if (star.y < -100) star.y += this.fieldHeight;
				else if (star.y > vh + 100) star.y -= this.fieldHeight;

				// Twinkle
				const twinkle = 0.6 + 0.4 * Math.sin(time * 0.001 * star.twinkleSpeed + star.twinklePhase);
				const alpha = star.alpha * twinkle;

				layer.graphics.fillStyle(0xffffff, alpha);
				layer.graphics.fillRect(
					Math.round(star.x),
					Math.round(star.y),
					star.size,
					star.size
				);
			}
		}
	}

	destroy() {
		for (const layer of this.layers) {
			layer.graphics.destroy();
		}
		this.layers = [];
	}
}
