import Phaser from 'phaser';
import { SECTOR, SHIP } from '../config';
import { EventBus } from '../EventBus';

import type { InventoryItem, BossKey } from '../systems/Inventory';

/** Color mapping for sector types on the minimap */
const SECTOR_COLORS: Record<string, number> = {
	empty: 0x556677,
	asteroid_field: 0x887744,
	patrol: 0x448844,
	hostile: 0xcc4444,
	nebula: 0x774499,
	boss: 0xff8844
};

const SECTOR_LABELS: Record<string, string> = {
	empty: 'Open Space',
	asteroid_field: 'Asteroid Field',
	patrol: 'Patrol Zone',
	hostile: 'Hostile Territory',
	nebula: 'Nebula',
	boss: 'Boss Sector'
};

export class HUDScene extends Phaser.Scene {
	private scoreText!: Phaser.GameObjects.Text;
	private hullLabel!: Phaser.GameObjects.Text;
	private shieldLabel!: Phaser.GameObjects.Text;
	private sectorText!: Phaser.GameObjects.Text;
	private sectorTypeText!: Phaser.GameObjects.Text;
	private barsGfx!: Phaser.GameObjects.Graphics;
	private minimapGfx!: Phaser.GameObjects.Graphics;

	private currentHealth: number = SHIP.MAX_HEALTH;
	private currentMaxHealth: number = SHIP.MAX_HEALTH;
	private currentShields: number = SHIP.MAX_SHIELDS;
	private currentMaxShields: number = SHIP.MAX_SHIELDS;
	private currentScore = 0;
	private currentSectorX: number = SECTOR.START_X;
	private currentSectorY: number = SECTOR.START_Y;
	private currentSectorType = 'empty';
	private visitedSectors = new Set<string>();
	private scannedSectors = new Set<string>();
	private scannedSectorTypes = new Map<string, string>();

	// Boss HUD
	private bossData: { name: string; hp: number; maxHp: number; phase: number } | null = null;
	private bossNameText!: Phaser.GameObjects.Text;
	private bossBarGfx!: Phaser.GameObjects.Graphics;

	// Inventory HUD
	private inventoryItems: InventoryItem[] = [];
	private inventoryGfx!: Phaser.GameObjects.Graphics;
	private inventoryIcons: Phaser.GameObjects.Sprite[] = [];

	// Boss Keys HUD
	private bossKeys: BossKey[] = [];
	private bossKeyTexts: Phaser.GameObjects.Text[] = [];

	constructor() {
		super('HUDScene');
	}

	create(data?: {
		health?: number;
		maxHealth?: number;
		shields?: number;
		maxShields?: number;
		score?: number;
		sectorX?: number;
		sectorY?: number;
		sectorType?: string;
		visitedSectors?: Set<string>;
		scannedSectors?: Set<string>;
		scannedSectorTypes?: Map<string, string>;
	}) {
		this.currentHealth = data?.health ?? SHIP.MAX_HEALTH;
		this.currentMaxHealth = data?.maxHealth ?? SHIP.MAX_HEALTH;
		this.currentShields = data?.shields ?? SHIP.MAX_SHIELDS;
		this.currentMaxShields = data?.maxShields ?? SHIP.MAX_SHIELDS;
		this.currentScore = data?.score ?? 0;
		this.currentSectorX = data?.sectorX ?? SECTOR.START_X;
		this.currentSectorY = data?.sectorY ?? SECTOR.START_Y;
		this.currentSectorType = data?.sectorType ?? 'empty';
		this.visitedSectors = data?.visitedSectors ?? new Set();
		this.scannedSectors = data?.scannedSectors ?? new Set();
		this.scannedSectorTypes = data?.scannedSectorTypes ?? new Map();

		const { width } = this.scale;

		// Score (top right)
		this.scoreText = this.add
			.text(width - 20, 20, '', {
				fontSize: '18px',
				color: '#88aacc',
				fontFamily: 'monospace'
			})
			.setOrigin(1, 0);

		// Sector coordinates (top right, below score)
		this.sectorText = this.add
			.text(width - 20, 44, '', {
				fontSize: '14px',
				color: '#667788',
				fontFamily: 'monospace'
			})
			.setOrigin(1, 0);

		// Bar labels (top left)
		this.shieldLabel = this.add.text(20, 18, 'Shields', {
			fontSize: '10px',
			color: '#44aacc',
			fontFamily: 'monospace'
		});
		this.hullLabel = this.add.text(20, 38, 'Hull', {
			fontSize: '10px',
			color: '#667788',
			fontFamily: 'monospace'
		});

		// Bars graphics
		this.barsGfx = this.add.graphics();

		// Minimap
		this.minimapGfx = this.add.graphics();

		// Sector type label (below minimap, positioned in drawMinimap)
		this.sectorTypeText = this.add.text(20, 0, '', {
			fontSize: '11px',
			color: '#556677',
			fontFamily: 'monospace'
		});

		// Boss name + health bar (top center, hidden until boss active)
		this.bossNameText = this.add
			.text(width / 2, 14, '', {
				fontSize: '14px',
				color: '#ff8844',
				fontFamily: 'monospace',
				fontStyle: 'bold'
			})
			.setOrigin(0.5, 0)
			.setAlpha(0);

		this.bossBarGfx = this.add.graphics();

		// Inventory display (bottom left)
		this.inventoryGfx = this.add.graphics();

		EventBus.on('hud-update', this.onHudUpdate, this);

		this.events.on('shutdown', () => {
			EventBus.off('hud-update', this.onHudUpdate, this);
		});

		this.drawAll();
	}

	private onHudUpdate = (data: {
		health: number;
		maxHealth: number;
		shields: number;
		maxShields: number;
		score: number;
		sectorX: number;
		sectorY: number;
		sectorType: string;
		visitedSectors: Set<string>;
		scannedSectors: Set<string>;
		scannedSectorTypes: Map<string, string>;
		boss?: { name: string; hp: number; maxHp: number; phase: number } | null;
		inventory?: InventoryItem[];
		bossKeys?: BossKey[];
	}) => {
		this.currentHealth = data.health;
		this.currentMaxHealth = data.maxHealth;
		this.currentShields = data.shields;
		this.currentMaxShields = data.maxShields;
		this.currentScore = data.score;
		this.currentSectorX = data.sectorX;
		this.currentSectorY = data.sectorY;
		this.currentSectorType = data.sectorType;
		this.visitedSectors = data.visitedSectors;
		this.scannedSectors = data.scannedSectors;
		this.scannedSectorTypes = data.scannedSectorTypes;
		this.bossData = data.boss ?? null;
		if (data.inventory) this.inventoryItems = data.inventory;
		if (data.bossKeys) this.bossKeys = data.bossKeys;
	};

	update() {
		this.drawAll();
	}

	private drawAll() {
		const { width } = this.scale;

		// Reposition right-aligned elements for dynamic sizing
		this.scoreText.setPosition(width - 20, 20);
		this.scoreText.setText(`Score: ${this.currentScore}`);
		this.sectorText.setPosition(width - 20, 44);
		this.sectorText.setText(this.sectorLabel());
		this.bossNameText.setX(width / 2);

		this.drawBars();
		this.drawMinimap();
		this.drawSectorType();
		this.drawBossBar();
		this.drawInventory();
		this.drawBossKeys();
	}

	private drawBars() {
		const gfx = this.barsGfx;
		gfx.clear();

		const barX = 65;
		const barW = 120;
		const barH = 10;

		// Shield bar
		const shieldY = 20;
		const shieldFrac = this.currentShields / this.currentMaxShields;
		gfx.fillStyle(0x222233, 0.8);
		gfx.fillRect(barX, shieldY, barW, barH);
		if (shieldFrac > 0) {
			gfx.fillStyle(0x44bbdd, 0.8);
			gfx.fillRect(barX + 1, shieldY + 1, (barW - 2) * shieldFrac, barH - 2);
		}
		gfx.lineStyle(1, 0x335566, 0.5);
		gfx.strokeRect(barX, shieldY, barW, barH);

		// Hull bar
		const hullY = 40;
		const hullFrac = this.currentHealth / this.currentMaxHealth;
		gfx.fillStyle(0x222233, 0.8);
		gfx.fillRect(barX, hullY, barW, barH);
		if (hullFrac > 0) {
			const hue = hullFrac * 120;
			const color = Phaser.Display.Color.HSLToColor(hue / 360, 0.8, 0.5);
			gfx.fillStyle(color.color, 0.9);
			gfx.fillRect(barX + 1, hullY + 1, (barW - 2) * hullFrac, barH - 2);
		}
		gfx.lineStyle(1, 0x445566, 0.5);
		gfx.strokeRect(barX, hullY, barW, barH);

		// Low hull pulse
		if (hullFrac < 0.3 && hullFrac > 0) {
			const pulse = 0.3 + 0.3 * Math.sin(this.time.now * 0.008);
			gfx.fillStyle(0xff3333, pulse);
			gfx.fillRect(barX + 1, hullY + 1, (barW - 2) * hullFrac, barH - 2);
		}
	}

	private drawMinimap() {
		this.minimapGfx.clear();
		const mx = 20;
		const my = 62;
		const cellSize = 12;
		const padding = 1;
		const gridSize = SECTOR.GRID_SIZE;

		// Background
		this.minimapGfx.fillStyle(0x111122, 0.7);
		this.minimapGfx.fillRect(
			mx - 2,
			my - 2,
			gridSize * (cellSize + padding) + 4,
			gridSize * (cellSize + padding) + 4
		);

		for (let gy = 0; gy < gridSize; gy++) {
			for (let gx = 0; gx < gridSize; gx++) {
				const cx = mx + gx * (cellSize + padding);
				const cy = my + gy * (cellSize + padding);
				const key = `${gx},${gy}`;
				const isCurrent = gx === this.currentSectorX && gy === this.currentSectorY;
				const isVisited = this.visitedSectors.has(key);
				const isScanned = this.scannedSectors.has(key);

				if (isCurrent) {
					this.minimapGfx.fillStyle(0x44aaff, 0.9);
				} else if (isVisited) {
					const sType = this.scannedSectorTypes.get(key) ?? 'empty';
					const color = SECTOR_COLORS[sType] ?? 0x556677;
					this.minimapGfx.fillStyle(color, 0.8);
				} else if (isScanned) {
					const sType = this.scannedSectorTypes.get(key) ?? 'empty';
					const color = SECTOR_COLORS[sType] ?? 0x556677;
					this.minimapGfx.fillStyle(color, 0.35);
				} else {
					this.minimapGfx.fillStyle(0x111122, 0.2);
				}

				this.minimapGfx.fillRect(cx, cy, cellSize, cellSize);
			}
		}

		// Border
		this.minimapGfx.lineStyle(1, 0x445566, 0.5);
		this.minimapGfx.strokeRect(
			mx - 2,
			my - 2,
			gridSize * (cellSize + padding) + 4,
			gridSize * (cellSize + padding) + 4
		);

		// Position sector type text below minimap
		const minimapBottom = my + gridSize * (cellSize + padding) + 6;
		this.sectorTypeText.setPosition(20, minimapBottom);
	}

	private drawSectorType() {
		const label = SECTOR_LABELS[this.currentSectorType] ?? this.currentSectorType;
		const color = SECTOR_COLORS[this.currentSectorType] ?? 0x556677;
		const hex = '#' + color.toString(16).padStart(6, '0');
		this.sectorTypeText.setText(label);
		this.sectorTypeText.setColor(hex);
	}

	private sectorLabel(): string {
		return `Sector [${this.currentSectorX},${this.currentSectorY}]`;
	}

	// ── Boss Health Bar ──────────────────────────────────────────

	private drawBossBar() {
		const gfx = this.bossBarGfx;
		gfx.clear();

		if (!this.bossData) {
			this.bossNameText.setAlpha(0);
			return;
		}

		const { width } = this.scale;
		const barW = 250;
		const barH = 12;
		const barX = (width - barW) / 2;
		const barY = 32;

		// Boss name
		this.bossNameText.setText(this.bossData.name);
		this.bossNameText.setAlpha(1);

		// Background
		gfx.fillStyle(0x221111, 0.8);
		gfx.fillRect(barX, barY, barW, barH);

		// Health fill
		const frac = Math.max(0, this.bossData.hp / this.bossData.maxHp);
		if (frac > 0) {
			// Color shifts with phase: orange → red → dark red
			const colors = [0xff8844, 0xff4422, 0xcc2211];
			const color = colors[Math.min(this.bossData.phase - 1, colors.length - 1)];
			gfx.fillStyle(color, 0.9);
			gfx.fillRect(barX + 1, barY + 1, (barW - 2) * frac, barH - 2);
		}

		// Border
		gfx.lineStyle(1, 0x884422, 0.6);
		gfx.strokeRect(barX, barY, barW, barH);

		// Phase indicator
		if (this.bossData.phase > 1) {
			const phaseText = `Phase ${this.bossData.phase}`;
			// Draw phase dots
			for (let i = 0; i < this.bossData.phase; i++) {
				gfx.fillStyle(0xff6633, 0.8);
				gfx.fillCircle(barX + barW + 12 + i * 10, barY + barH / 2, 3);
			}
		}
	}

	// ── Boss Keys Display ────────────────────────────────────────

	private drawBossKeys() {
		// Clean up old texts
		for (const txt of this.bossKeyTexts) {
			txt.destroy();
		}
		this.bossKeyTexts = [];

		if (this.bossKeys.length === 0) return;

		const { width, height } = this.scale;
		const slotSize = 28;
		const padding = 6;
		const startY = height - slotSize - padding - 10;

		// Right-align: keys grow leftward from bottom-right
		const totalW = this.bossKeys.length * (slotSize + padding) + padding;
		const startX = width - 20 - totalW;

		for (let i = 0; i < this.bossKeys.length; i++) {
			const key = this.bossKeys[i];
			const kx = startX + padding + i * (slotSize + padding) + slotSize / 2;
			const ky = startY + slotSize / 2;

			const txt = this.add
				.text(kx, ky, key.emoji, {
					fontSize: '16px',
					fontFamily: '"Press Start 2P", monospace'
				})
				.setOrigin(0.5, 0.5)
				.setDepth(20);

			// Gold glow via shadow
			txt.setShadow(0, 0, '#ffcc44', 6, true, true);

			this.bossKeyTexts.push(txt);
		}
	}

	// ── Inventory Bar ────────────────────────────────────────────

	private drawInventory() {
		const gfx = this.inventoryGfx;
		gfx.clear();

		// Clean up old icons
		for (const icon of this.inventoryIcons) {
			icon.destroy();
		}
		this.inventoryIcons = [];

		if (this.inventoryItems.length === 0) return;

		const { height } = this.scale;
		const slotSize = 24;
		const padding = 4;
		const startX = 20;
		const startY = height - slotSize - padding - 10;

		// Background bar
		const totalW = this.inventoryItems.length * (slotSize + padding) + padding;
		gfx.fillStyle(0x111122, 0.7);
		gfx.fillRoundedRect(startX - padding, startY - padding, totalW, slotSize + padding * 2, 4);
		gfx.lineStyle(1, 0x445566, 0.5);
		gfx.strokeRoundedRect(
			startX - padding,
			startY - padding,
			totalW,
			slotSize + padding * 2,
			4
		);

		// Item icons
		for (let i = 0; i < this.inventoryItems.length; i++) {
			const item = this.inventoryItems[i];
			const ix = startX + i * (slotSize + padding) + slotSize / 2;
			const iy = startY + slotSize / 2;

			// Golden slot border
			gfx.lineStyle(1, 0xffcc44, 0.5);
			gfx.strokeRect(
				ix - slotSize / 2,
				iy - slotSize / 2,
				slotSize,
				slotSize
			);

			// Item sprite
			const icon = this.add.sprite(ix, iy, item.texture).setDisplaySize(18, 18).setDepth(20);
			this.inventoryIcons.push(icon);
		}
	}
}
