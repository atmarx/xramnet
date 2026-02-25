import Phaser from 'phaser';

/**
 * EventBus for bidirectional Svelte ↔ Phaser communication.
 * Emit from Phaser scenes, listen in Svelte (and vice versa).
 */
export const EventBus = new Phaser.Events.EventEmitter();
