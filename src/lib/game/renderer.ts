// All canvas drawing logic for the physics playground
// Pure rendering functions — read state, draw to canvas, no game state mutations
// (Exception: debris position updates are coupled to rendering for frame-sync)

import {
	CONFIG, TOOLTIP_WIDTH, TOOLTIP_HEIGHT, SHIP_MAX_HEALTH,
	getCircleRadius,
	type BlobBody, type GameState
} from './types';

// ─── Main Render Entry Points ──────────────────────────────────────

/** Render everything in world space */
export function renderWorldSpace(
	ctx: CanvasRenderingContext2D,
	state: GameState,
	allBodies: BlobBody[],
	spaceshipBody: Matter.Body | null,
	tooltipBody: BlobBody | null,
	hoveredBody: BlobBody | null,
	highlightType: string | null
) {
	const currentRadius = getCircleRadius(state.isMobile, state.isUltrawide);

	renderBodyLabels(ctx, allBodies, currentRadius, state, highlightType);
	renderDamageRings(ctx, allBodies, currentRadius, state);
	renderShipHealthRing(ctx, spaceshipBody, state);
	renderCenterDamageRing(ctx, state, currentRadius);
	renderBlackHole(ctx, state);
	renderDebris(ctx, state);
	renderShipThrust(ctx, spaceshipBody, state);
	renderMissileGlow(ctx, state);
	renderTooltip(ctx, tooltipBody, hoveredBody);
}

/** Render screen-space HUD elements (not affected by camera) */
export function renderScreenSpace(ctx: CanvasRenderingContext2D, state: GameState) {
	renderVictoryText(ctx, state);
	renderGoodbyeText(ctx, state);
	renderEscapeGlow(ctx, state);
}

/** Update fading constraints (mutates fadingConstraints array + constraint render styles) */
export function updateFadingConstraints(
	state: GameState,
	constraints: Matter.Constraint[],
	Matter: any,
	engine: Matter.Engine
) {
	for (let i = state.fadingConstraints.length - 1; i >= 0; i--) {
		const fc = state.fadingConstraints[i];
		const age = state.time - fc.startTime;
		if (age > fc.duration) {
			Matter.Composite.remove(engine.world, fc.constraint);
			const cIdx = constraints.indexOf(fc.constraint);
			if (cIdx !== -1) constraints.splice(cIdx, 1);
			state.fadingConstraints.splice(i, 1);
		} else {
			const alpha = 1 - (age / fc.duration);
			fc.constraint.render.strokeStyle = `rgba(136, 136, 136, ${0.2 * alpha})`;
		}
	}
}

// ─── Body Labels ───────────────────────────────────────────────────

function renderBodyLabels(
	ctx: CanvasRenderingContext2D,
	allBodies: BlobBody[],
	currentRadius: number,
	state: GameState,
	highlightType: string | null
) {
	for (const body of allBodies) {
		const pos = body.position;

		if (body.blobData) {
			const item = body.blobData.item;
			const isFilterHighlighted = highlightType && body.blobData.type === highlightType;

			if (isFilterHighlighted) {
				ctx.save();
				const glowColor = body.blobData.type === 'project'
					? 'rgba(100, 200, 150, 0.6)'
					: 'rgba(107, 159, 255, 0.6)';
				ctx.shadowColor = glowColor;
				ctx.shadowBlur = 15;
				ctx.fillStyle = glowColor;
				ctx.beginPath();
				ctx.arc(pos.x, pos.y, currentRadius + 4, 0, Math.PI * 2);
				ctx.fill();
				ctx.restore();
			}

			ctx.save();
			const fontSize = state.isMobile ? 10 : (state.isUltrawide ? 16 : 13);
			ctx.font = `${fontSize}px system-ui, sans-serif`;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';

			const title = item.title;
			const textMetrics = ctx.measureText(title);
			const textHeight = state.isMobile ? 14 : (state.isUltrawide ? 22 : 18);
			const padding = state.isMobile ? 6 : (state.isUltrawide ? 8 : 6);
			const pillWidth = textMetrics.width + padding * 2;
			const pillHeight = textHeight + padding;
			const pillX = pos.x - pillWidth / 2;
			const pillY = pos.y - pillHeight / 2;

			ctx.fillStyle = body.blobData.type === 'project'
				? CONFIG.COLORS.projects
				: CONFIG.COLORS.musings;
			ctx.beginPath();
			ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 6);
			ctx.fill();

			ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
			ctx.shadowBlur = 0;
			ctx.shadowOffsetX = 0;
			ctx.shadowOffsetY = 1;
			ctx.fillStyle = '#fff';
			ctx.fillText(title, pos.x, pos.y);
			ctx.restore();

		} else if (body.tagData) {
			const isFilterHighlighted = highlightType === 'tag';
			const tagRadius = currentRadius * 0.8;

			if (isFilterHighlighted) {
				ctx.save();
				ctx.shadowColor = 'rgba(180, 180, 180, 0.5)';
				ctx.shadowBlur = 12;
				ctx.fillStyle = 'rgba(180, 180, 180, 0.4)';
				ctx.beginPath();
				ctx.arc(pos.x, pos.y, tagRadius + 3, 0, Math.PI * 2);
				ctx.fill();
				ctx.restore();
			}

			ctx.save();
			const tagFontSize = state.isMobile ? 9 : (state.isUltrawide ? 14 : 11);
			ctx.font = `${tagFontSize}px system-ui, sans-serif`;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';

			const tagName = body.tagData.name;
			const textMetrics = ctx.measureText(tagName);
			const textHeight = state.isMobile ? 12 : (state.isUltrawide ? 20 : 15);
			const padding = state.isMobile ? 4 : (state.isUltrawide ? 6 : 4);
			const pillWidth = textMetrics.width + padding * 2;
			const pillHeight = textHeight + padding;
			const pillX = pos.x - pillWidth / 2;
			const pillY = pos.y - pillHeight / 2;

			ctx.fillStyle = CONFIG.COLORS.tags;
			ctx.beginPath();
			ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 5);
			ctx.fill();

			ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
			ctx.shadowBlur = 0;
			ctx.shadowOffsetX = 0;
			ctx.shadowOffsetY = 1;
			ctx.fillStyle = '#fff';
			ctx.fillText(tagName, pos.x, pos.y);
			ctx.restore();
		}
	}
}

// ─── Damage Rings ──────────────────────────────────────────────────

function renderDamageRings(
	ctx: CanvasRenderingContext2D,
	allBodies: BlobBody[],
	currentRadius: number,
	state: GameState
) {
	for (const body of allBodies) {
		if (body.health !== undefined && body.maxHealth !== undefined && body.health < body.maxHealth) {
			const pos = body.position;
			const damage = 1 - (body.health / body.maxHealth);
			const ringRadius = (body.tagData ? currentRadius * 0.8 : currentRadius) + 6;

			ctx.save();
			ctx.strokeStyle = `rgba(255, ${Math.floor(60 * (1 - damage))}, ${Math.floor(30 * (1 - damage))}, ${0.5 + damage * 0.5})`;
			ctx.lineWidth = 3;
			ctx.lineCap = 'round';
			ctx.beginPath();
			const startAngle = -Math.PI / 2;
			const endAngle = startAngle + (Math.PI * 2 * damage);
			ctx.arc(pos.x, pos.y, ringRadius, startAngle, endAngle);
			ctx.stroke();
			ctx.restore();
		}
	}
}

function renderShipHealthRing(
	ctx: CanvasRenderingContext2D,
	spaceshipBody: Matter.Body | null,
	state: GameState
) {
	if (!spaceshipBody || state.shipDead) return;

	const pos = spaceshipBody.position;
	const healthFrac = state.shipHealth / SHIP_MAX_HEALTH;
	const hue = healthFrac * 120; // 0=red, 60=yellow, 120=green
	const ringRadius = 22;

	ctx.save();

	// Background ring (dim, full circle showing max capacity)
	ctx.strokeStyle = `hsla(${hue}, 50%, 40%, ${0.1 + (1 - healthFrac) * 0.1})`;
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.arc(pos.x, pos.y, ringRadius, 0, Math.PI * 2);
	ctx.stroke();

	// Foreground arc (bright, proportional to current health)
	const arcLength = healthFrac * Math.PI * 2;
	ctx.strokeStyle = `hsla(${hue}, 100%, 55%, ${0.5 + (1 - healthFrac) * 0.4})`;
	ctx.lineWidth = 3;
	ctx.lineCap = 'round';
	ctx.beginPath();
	ctx.arc(pos.x, pos.y, ringRadius, -Math.PI / 2, -Math.PI / 2 + arcLength);
	ctx.stroke();

	// Low health pulse glow
	if (healthFrac < 0.3) {
		const pulse = 0.3 + Math.sin(state.time * 8) * 0.3;
		ctx.shadowColor = `hsla(${hue}, 100%, 50%, ${pulse})`;
		ctx.shadowBlur = 8 + pulse * 12;
		ctx.strokeStyle = `hsla(${hue}, 100%, 60%, ${pulse * 0.6})`;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(pos.x, pos.y, ringRadius, -Math.PI / 2, -Math.PI / 2 + arcLength);
		ctx.stroke();
	}

	ctx.restore();
}

function renderCenterDamageRing(
	ctx: CanvasRenderingContext2D,
	state: GameState,
	currentRadius: number
) {
	if (state.centerDead || state.centerHealth >= 50) return; // CENTER_MAX_HEALTH

	const centerRadius = state.isMobile ? CONFIG.CENTER_RADIUS_MOBILE : CONFIG.CENTER_RADIUS_DESKTOP;
	const damage = 1 - (state.centerHealth / 50);
	ctx.save();
	ctx.strokeStyle = `rgba(255, ${Math.floor(60 * (1 - damage))}, ${Math.floor(30 * (1 - damage))}, ${0.5 + damage * 0.5})`;
	ctx.lineWidth = 4;
	ctx.lineCap = 'round';
	ctx.beginPath();
	ctx.arc(state.width / 2, state.height / 2, centerRadius + 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * damage);
	ctx.stroke();
	ctx.restore();
}

// ─── Black Hole ────────────────────────────────────────────────────

function renderBlackHole(ctx: CanvasRenderingContext2D, state: GameState) {
	if (!state.blackHoleActive) return;

	ctx.save();
	const gradient = ctx.createRadialGradient(
		state.width / 2, state.height / 2, 0,
		state.width / 2, state.height / 2, state.blackHoleRadius * 3
	);
	gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
	gradient.addColorStop(0.3, 'rgba(0, 0, 0, 0.8)');
	gradient.addColorStop(0.6, 'rgba(20, 0, 40, 0.3)');
	gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
	ctx.fillStyle = gradient;
	ctx.beginPath();
	ctx.arc(state.width / 2, state.height / 2, state.blackHoleRadius * 3, 0, Math.PI * 2);
	ctx.fill();

	ctx.strokeStyle = `rgba(100, 50, 200, ${0.3 + Math.sin(state.time * 5) * 0.15})`;
	ctx.lineWidth = 2;
	for (let r = 0; r < 3; r++) {
		const ringR = state.blackHoleRadius * (1.2 + r * 0.6);
		const spin = state.time * (3 - r) + r * 2;
		ctx.beginPath();
		ctx.arc(state.width / 2, state.height / 2, ringR, spin, spin + Math.PI * 1.5);
		ctx.stroke();
	}
	ctx.restore();

	// Big bang flash
	if (state.bigBangTriggered) {
		const flashElapsed = state.time - state.bigBangTime;
		if (flashElapsed < 2) {
			const flash = flashElapsed < 0.3 ? flashElapsed / 0.3 : Math.max(0, 1 - (flashElapsed - 0.3) / 1.7);
			ctx.save();
			ctx.fillStyle = `rgba(255, 255, 255, ${flash * 0.8})`;
			ctx.fillRect(0, 0, state.width, state.height);
			ctx.restore();
		}
	}
}

// ─── Debris ────────────────────────────────────────────────────────

function renderDebris(ctx: CanvasRenderingContext2D, state: GameState) {
	for (let i = state.debris.length - 1; i >= 0; i--) {
		const d = state.debris[i];
		const age = state.time - d.born;
		if (age > d.lifespan) {
			state.debris.splice(i, 1);
			continue;
		}

		const alpha = 1 - (age / d.lifespan);
		d.x += d.vx;
		d.y += d.vy;
		d.vy += 0.05;
		d.vx *= 0.99;
		d.vy *= 0.99;

		ctx.save();
		ctx.globalAlpha = alpha;
		ctx.fillStyle = d.color;
		ctx.shadowColor = d.color;
		ctx.shadowBlur = 6 * alpha;
		ctx.beginPath();
		ctx.arc(d.x, d.y, d.size * alpha, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}
}

// ─── Victory Text ──────────────────────────────────────────────────

function renderVictoryText(ctx: CanvasRenderingContext2D, state: GameState) {
	if (!state.victoryTriggered) return;

	const elapsed = state.time - state.victoryTime;
	const fadeIn = Math.min(1, elapsed / 1.5);
	const fadeOut = elapsed > 10 ? Math.max(0, 1 - (elapsed - 10) / 2) : 1;
	const alpha = fadeIn * fadeOut;
	if (alpha <= 0) return;

	const pulse = 1 + Math.sin(state.time * 3) * 0.03;
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.font = `bold ${Math.floor(48 * pulse)}px system-ui, sans-serif`;
	ctx.fillStyle = '#fff';
	ctx.shadowColor = '#fff';
	ctx.shadowBlur = 20 * alpha;
	ctx.fillText('TOTAL ANNIHILATION', state.width / 2, state.height * 0.35);
	ctx.font = '18px system-ui, sans-serif';
	ctx.shadowBlur = 8;
	ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
	ctx.fillText(`${state.totalPlanets} planets destroyed`, state.width / 2, state.height * 0.35 + 45);
	ctx.restore();
}

// ─── Goodbye Text ──────────────────────────────────────────────────

function renderGoodbyeText(ctx: CanvasRenderingContext2D, state: GameState) {
	if (!state.goodbyeTextActive) return;

	const elapsed = state.time - state.goodbyeTextTime;
	const fadeIn = Math.min(1, elapsed / 1.0);
	const fadeOut = elapsed > 8 ? Math.max(0, 1 - (elapsed - 8) / 2) : 1;
	const alpha = fadeIn * fadeOut;

	if (alpha <= 0) {
		state.goodbyeTextActive = false;
		return;
	}

	const pulse = 1 + Math.sin(state.time * 2) * 0.02;
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.font = `bold ${Math.floor(36 * pulse)}px system-ui, sans-serif`;
	ctx.fillStyle = '#fff';
	ctx.shadowColor = 'rgba(100, 50, 200, 0.8)';
	ctx.shadowBlur = 20 * alpha;
	ctx.fillText('So long, and thanks for all the fish!', state.width / 2, state.height * 0.3);
	ctx.font = '16px system-ui, sans-serif';
	ctx.shadowBlur = 8;
	ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
	ctx.fillText('— Douglas Adams', state.width / 2, state.height * 0.3 + 40);
	ctx.restore();
}

// ─── Escape Glow ───────────────────────────────────────────────────

function renderEscapeGlow(ctx: CanvasRenderingContext2D, state: GameState) {
	if (!state.blackHoleActive || state.shipEscaped || state.escapeGlowIntensity <= 0) return;

	const intensity = state.escapeGlowIntensity;
	const pulse = 0.7 + Math.sin(state.time * 3) * 0.3;

	ctx.save();
	// Deep blue glow on right edge (Loom-style rift)
	const gradient = ctx.createLinearGradient(state.width - 120, 0, state.width, 0);
	gradient.addColorStop(0, 'rgba(30, 60, 200, 0)');
	gradient.addColorStop(0.5, `rgba(40, 80, 220, ${0.15 * intensity * pulse})`);
	gradient.addColorStop(1, `rgba(60, 100, 255, ${0.4 * intensity * pulse})`);
	ctx.fillStyle = gradient;
	ctx.fillRect(state.width - 120, 0, 120, state.height);

	// Vertical light streak (rift crack)
	const streakGrad = ctx.createLinearGradient(0, 0, 0, state.height);
	streakGrad.addColorStop(0, 'rgba(80, 120, 255, 0)');
	streakGrad.addColorStop(0.3, `rgba(100, 150, 255, ${0.3 * intensity * pulse})`);
	streakGrad.addColorStop(0.5, `rgba(140, 180, 255, ${0.5 * intensity * pulse})`);
	streakGrad.addColorStop(0.7, `rgba(100, 150, 255, ${0.3 * intensity * pulse})`);
	streakGrad.addColorStop(1, 'rgba(80, 120, 255, 0)');
	ctx.fillStyle = streakGrad;
	ctx.fillRect(state.width - 4, 0, 4, state.height);

	// Pulsing arrows
	const textAlpha = intensity * (0.4 + Math.sin(state.time * 4) * 0.3);
	ctx.globalAlpha = textAlpha;
	ctx.font = 'bold 20px system-ui, sans-serif';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillStyle = 'rgba(100, 150, 255, 0.9)';
	ctx.shadowColor = 'rgba(60, 100, 255, 0.8)';
	ctx.shadowBlur = 12;
	ctx.fillText('▸ ▸ ▸', state.width - 40, state.height / 2);
	ctx.restore();
}

// ─── Ship Thrust Flame ─────────────────────────────────────────────

function renderShipThrust(
	ctx: CanvasRenderingContext2D,
	spaceshipBody: Matter.Body | null,
	state: GameState
) {
	if (!spaceshipBody || state.shipDead || !state.keys.up) return;

	const pos = spaceshipBody.position;
	const angle = spaceshipBody.angle;
	ctx.save();
	ctx.translate(pos.x, pos.y);
	ctx.rotate(angle);

	const flicker = 0.7 + Math.random() * 0.6;
	const flameLen = 12 * flicker;

	ctx.beginPath();
	ctx.moveTo(-6, 14);
	ctx.lineTo(0, 14 + flameLen);
	ctx.lineTo(6, 14);
	ctx.closePath();

	const gradient = ctx.createLinearGradient(0, 14, 0, 14 + flameLen);
	gradient.addColorStop(0, 'rgba(255, 200, 50, 0.9)');
	gradient.addColorStop(0.5, 'rgba(255, 100, 20, 0.7)');
	gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
	ctx.fillStyle = gradient;
	ctx.fill();
	ctx.restore();
}

// ─── Missile Glow ──────────────────────────────────────────────────

function renderMissileGlow(ctx: CanvasRenderingContext2D, state: GameState) {
	for (const m of state.missiles) {
		const mp = m.body.position;
		ctx.save();
		ctx.shadowColor = '#ff6644';
		ctx.shadowBlur = 8;
		ctx.fillStyle = '#ff6644';
		ctx.beginPath();
		ctx.arc(mp.x, mp.y, 3, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}
}

// ─── Tooltip ───────────────────────────────────────────────────────

function renderTooltip(
	ctx: CanvasRenderingContext2D,
	tooltipBody: BlobBody | null,
	hoveredBody: BlobBody | null
) {
	if (!tooltipBody || !tooltipBody.tooltipData) return;

	const td = tooltipBody.tooltipData;
	const pos = tooltipBody.position;
	const x = pos.x - TOOLTIP_WIDTH / 2;
	const y = pos.y - TOOLTIP_HEIGHT / 2;
	const isHovered = hoveredBody === tooltipBody;

	ctx.save();

	if (isHovered) {
		ctx.shadowColor = 'rgba(255, 255, 255, 0.2)';
		ctx.shadowBlur = 10;
	}

	ctx.fillStyle = 'rgba(20, 20, 40, 0.95)';
	ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.roundRect(x, y, TOOLTIP_WIDTH, TOOLTIP_HEIGHT, 10);
	ctx.fill();
	ctx.stroke();

	ctx.shadowColor = 'transparent';
	ctx.shadowBlur = 0;

	ctx.font = 'bold 14px system-ui, sans-serif';
	ctx.textAlign = 'left';
	ctx.textBaseline = 'top';

	if (td.type === 'project') ctx.fillStyle = CONFIG.COLORS.projects;
	else if (td.type === 'musing') ctx.fillStyle = CONFIG.COLORS.musings;
	else ctx.fillStyle = 'rgb(180, 180, 180)';

	const textX = x + 14;
	const titleY = y + 14;
	const maxTextWidth = TOOLTIP_WIDTH - 28;

	let titleText = td.title;
	while (ctx.measureText(titleText).width > maxTextWidth && titleText.length > 0) {
		titleText = titleText.slice(0, -1);
	}
	if (titleText !== td.title) titleText += '…';
	ctx.fillText(titleText, textX, titleY);

	if (td.description) {
		ctx.font = '12px system-ui, sans-serif';
		ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
		let descText = td.description;
		while (ctx.measureText(descText).width > maxTextWidth && descText.length > 0) {
			descText = descText.slice(0, -1);
		}
		if (descText !== td.description) descText += '…';
		ctx.fillText(descText, textX, titleY + 22);
	}

	const btnY = y + TOOLTIP_HEIGHT - 30;
	ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
	ctx.beginPath();
	ctx.roundRect(textX, btnY, maxTextWidth, 22, 4);
	ctx.fill();

	ctx.font = '12px system-ui, sans-serif';
	ctx.textAlign = 'center';
	ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
	const btnLabel = td.type === 'tag' ? 'View Tagged Items →' : `View ${td.type} →`;
	ctx.fillText(btnLabel, pos.x, btnY + 11);

	ctx.restore();
}
