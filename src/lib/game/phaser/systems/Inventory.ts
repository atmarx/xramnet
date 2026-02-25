/**
 * Item and Boss catalogs for The Rift's adventure system.
 * Every boss has a weak item — find it, give it, skip the fight.
 * Captain Guybrush Threepwood would be proud.
 */

export interface InventoryItem {
	id: string;
	name: string;
	description: string;
	texture: string;
	bossId: string;
}

export interface BossDef {
	id: string;
	name: string;
	hp: number;
	score: number;
	combatScore: number;
	pacifyScore: number;
	weakItemId: string;
	texture: string;
	introText: string;
	deathQuote: string;
	pacifyQuote: string;
}

// ── Item Catalog ───────────────────────────────────────────────

export const ITEM_CATALOG: Record<string, InventoryItem> = {
	baileys: {
		id: 'baileys',
		name: "Bailey's",
		description: 'Creamy. From a shoe.',
		texture: 'item-baileys',
		bossId: 'old-gregg'
	},
	'deflector-dish': {
		id: 'deflector-dish',
		name: 'Deflector Dish',
		description: 'Reconfigured for anti-Borg frequencies.',
		texture: 'item-deflector',
		bossId: 'borg-cube'
	},
	'space-cheese': {
		id: 'space-cheese',
		name: 'Space Cheese',
		description: 'Aged in zero gravity.',
		texture: 'item-cheese',
		bossId: 'the-moon'
	},
	shrubbery: {
		id: 'shrubbery',
		name: 'A Shrubbery',
		description: 'A nice one. Not too expensive.',
		texture: 'item-shrubbery',
		bossId: 'knights-ni'
	},
	'holy-hand-grenade': {
		id: 'holy-hand-grenade',
		name: 'Holy Hand Grenade',
		description: 'Count to three. Not five.',
		texture: 'item-grenade',
		bossId: 'black-knight'
	},
	'companion-cube': {
		id: 'companion-cube',
		name: 'Companion Cube',
		description: 'The cube cannot speak.',
		texture: 'item-cube',
		bossId: 'glados'
	},
	'earl-grey': {
		id: 'earl-grey',
		name: 'Earl Grey Tea',
		description: 'Hot.',
		texture: 'item-tea',
		bossId: 'q'
	}
};

// ── Boss Catalog ───────────────────────────────────────────────

export const BOSS_CATALOG: Record<string, BossDef> = {
	'old-gregg': {
		id: 'old-gregg',
		name: 'Old Gregg',
		hp: 35,
		score: 500,
		combatScore: 500,
		pacifyScore: 1000,
		weakItemId: 'baileys',
		texture: 'boss-gregg',
		introText: "I'M OLD GREGG!",
		deathQuote: "Don't kill me!\nI've got so much to give!",
		pacifyQuote: 'You DO love me!'
	},
	'borg-cube': {
		id: 'borg-cube',
		name: 'Borg Cube',
		hp: 50,
		score: 800,
		combatScore: 800,
		pacifyScore: 1500,
		weakItemId: 'deflector-dish',
		texture: 'boss-borg',
		introText: 'RESISTANCE IS FUTILE',
		deathQuote: 'Connection... severed.',
		pacifyQuote: 'Frequency shift detected...\nresistance is... possible.'
	},
	'the-moon': {
		id: 'the-moon',
		name: 'The Moon',
		hp: 30,
		score: 400,
		combatScore: 400,
		pacifyScore: 800,
		weakItemId: 'space-cheese',
		texture: 'boss-moon',
		introText: "I'M THE MOON!",
		deathQuote: 'I did a poo...',
		pacifyQuote: "Ohhh cheese!\nI'm the Moon!\nLook at me!"
	},
	'knights-ni': {
		id: 'knights-ni',
		name: 'Knights Who Say Ni',
		hp: 40,
		score: 600,
		combatScore: 600,
		pacifyScore: 1200,
		weakItemId: 'shrubbery',
		texture: 'boss-knights',
		introText: 'WE ARE THE KNIGHTS\nWHO SAY... NI!',
		deathQuote: "We'll say Ni again\nto you if you don't...\noh, we're dead.",
		pacifyQuote: "A shrubbery!\nA NICE one!"
	},
	'black-knight': {
		id: 'black-knight',
		name: 'The Black Knight',
		hp: 25,
		score: 350,
		combatScore: 350,
		pacifyScore: 700,
		weakItemId: 'holy-hand-grenade',
		texture: 'boss-bknight',
		introText: 'NONE SHALL PASS!',
		deathQuote: "Right. Let's call\nit a draw.",
		pacifyQuote: "Right, I'll call\nit a draw!"
	},
	glados: {
		id: 'glados',
		name: 'GLaDOS',
		hp: 45,
		score: 700,
		combatScore: 700,
		pacifyScore: 1400,
		weakItemId: 'companion-cube',
		texture: 'boss-glados',
		introText: 'THE ENRICHMENT CENTER\nREMINDS YOU...',
		deathQuote: 'This was a triumph...',
		pacifyQuote: "I'm not even angry.\nI'm being SO sincere\nright now."
	},
	q: {
		id: 'q',
		name: 'Q',
		hp: 30,
		score: 450,
		combatScore: 450,
		pacifyScore: 900,
		weakItemId: 'earl-grey',
		texture: 'boss-q',
		introText: "Q'S WATCHING.",
		deathQuote: 'You wound me,\nmon capitaine.',
		pacifyQuote: 'Jean-Luc always\nknew how to...\ntempt me.'
	}
};

// ── Boss Keys ─────────────────────────────────────────────────

export interface BossKey {
	bossId: string;
	emoji: string;
	name: string;
}

export const BOSS_KEY_EMOJIS: Record<string, { emoji: string; name: string }> = {
	'old-gregg': { emoji: '🎨', name: 'Watercolor Key' },
	'borg-cube': { emoji: '🔲', name: 'Assimilation Key' },
	'the-moon': { emoji: '🌙', name: 'Lunar Key' },
	'knights-ni': { emoji: '🌲', name: 'Shrubbery Key' },
	'black-knight': { emoji: '⚔️', name: 'Combat Key' },
	glados: { emoji: '🔬', name: 'Science Key' },
	q: { emoji: '✨', name: 'Cosmic Key' }
};

// Helper: get items as array
export function getAllItems(): InventoryItem[] {
	return Object.values(ITEM_CATALOG);
}

// Helper: get all boss definitions as array
export function getAllBosses(): BossDef[] {
	return Object.values(BOSS_CATALOG);
}

// Helper: find which item works on a boss
export function getItemForBoss(bossId: string): InventoryItem | undefined {
	return Object.values(ITEM_CATALOG).find((item) => item.bossId === bossId);
}
