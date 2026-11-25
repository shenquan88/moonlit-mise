// Drawing only: the world's state and the current screen in, pixels out. The fixed 1280x720
// kitchen is scaled to fit the window and everything is drawn with Canvas 2D paths and the
// shared PALETTE/LAYOUT, so no images, fonts or assets are loaded. The scene is split into small
// named painters (kitchen, pantry, stations, tickets, plate, HUD, feedback) for easy reading.

import { FIELD, FONT, LAYOUT, PALETTE, SHIFT, STOVE } from './config.js';
import { INGREDIENTS, INGREDIENT_IDS } from './recipes.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

/** Render-only art colours for the eight ingredients, keyed by ingredient id. */
const ING_COLORS = {
  salmon: '#f39a6f',
  rice: '#f8f4ec',
  nori: '#2f4d38',
  beef: '#8f4436',
  noodles: '#e6c76b',
  greens: '#5fae62',
  tomato: '#e25845',
  egg: '#f4c63f',
};

/** Fixed star field for the night sky; deterministic so screenshots never shimmer. */
const STARS = [
  [48, 34], [102, 78], [168, 22], [231, 96], [298, 44], [356, 118], [418, 28],
  [492, 82], [548, 34], [604, 108], [672, 46], [726, 92], [838, 30], [912, 72],
  [1018, 22], [1072, 148], [1180, 52], [1234, 116], [1290, 44], [1348, 92],
  [1408, 28], [1468, 78], [78, 190], [204, 178], [520, 190], [962, 196], [1272, 204],
];

/** The assembling plate sits at the centre of the worktop, in front of the recipe card. */
export function plateRect() {
  const width = 300;
  const height = 110;
  return {
    x: LAYOUT.worktop.x + (LAYOUT.worktop.w - width) / 2,
    y: LAYOUT.worktop.y + LAYOUT.worktop.h - height - 14,
    w: width,
    h: height,
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

// Ingredient art -------------------------------------------------------------

function drawSalmon(ctx, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.3);
  const w = r * 2;
  const h = r * 1.05;
  ctx.fillStyle = ING_COLORS.salmon;
  roundRect(ctx, -w / 2, -h / 2, w, h, r * 0.3);
  ctx.fill();
  ctx.strokeStyle = '#d97a4e';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,235,216,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 3; i += 1) {
    const x = -w / 2 + (w * (i + 0.5)) / 3;
    ctx.moveTo(x - 5, -h / 2 + 2);
    ctx.lineTo(x + 5, h / 2 - 2);
  }
  ctx.stroke();
  ctx.restore();
}

function drawRice(ctx, cx, cy, r) {
  ctx.fillStyle = '#3a4150';
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.4, r * 0.95, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = ING_COLORS.rice;
  ctx.beginPath();
  ctx.ellipse(cx, cy - r * 0.05, r * 0.85, r * 0.62, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#e7dfcd';
  const grains = [[-0.5, -0.2], [-0.15, -0.45], [0.2, -0.18], [0.5, -0.4], [0, -0.05], [-0.35, -0.55], [0.35, -0.6]];
  for (const [gx, gy] of grains) {
    ctx.beginPath();
    ctx.arc(cx + gx * r, cy + gy * r, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawNori(ctx, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(0.15);
  const w = r * 1.7;
  const h = r * 1.05;
  ctx.fillStyle = ING_COLORS.nori;
  roundRect(ctx, -w / 2, -h / 2, w, h, 2);
  ctx.fill();
  ctx.strokeStyle = '#1f3727';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(140,190,150,0.5)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-w / 3, -h / 3);
  ctx.lineTo(w / 4, -h / 3);
  ctx.stroke();
  ctx.restore();
}

function drawBeef(ctx, cx, cy, r) {
  ctx.fillStyle = ING_COLORS.beef;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 0.95, r * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#6f3329';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(240,205,180,0.7)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.5, cy - r * 0.2);
  ctx.quadraticCurveTo(cx, cy + r * 0.1, cx + r * 0.4, cy - r * 0.3);
  ctx.moveTo(cx - r * 0.2, cy + r * 0.3);
  ctx.quadraticCurveTo(cx + r * 0.1, cy, cx + r * 0.5, cy + r * 0.2);
  ctx.stroke();
}

function drawNoodles(ctx, cx, cy, r) {
  ctx.strokeStyle = ING_COLORS.noodles;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  const waves = [
    [-0.7, -0.5, 0.7, -0.5],
    [-0.7, -0.15, 0.7, -0.15],
    [-0.7, 0.2, 0.7, 0.2],
    [-0.7, 0.5, 0.7, 0.5],
  ];
  waves.forEach((wave, index) => {
    const [x0, y0, x1, y1] = wave;
    ctx.beginPath();
    ctx.moveTo(cx + x0 * r, cy + y0 * r);
    ctx.bezierCurveTo(
      cx + x0 * r * 0.4, cy + (y0 - 0.45) * r,
      cx + x1 * r * 0.4, cy + (y1 + 0.45) * r,
      cx + x1 * r, cy + y1 * r,
    );
    ctx.stroke();
  });
}

function drawGreens(ctx, cx, cy, r) {
  ctx.fillStyle = ING_COLORS.greens;
  for (let i = 0; i < 3; i += 1) {
    const angle = -0.65 + i * 0.65;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.45, r * 0.28, r * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.strokeStyle = '#3f7d44';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 0.4);
  ctx.lineTo(cx, cy + r * 0.55);
  ctx.stroke();
}

function drawTomato(ctx, cx, cy, r) {
  ctx.fillStyle = ING_COLORS.tomato;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.75, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#b63c30';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.3, cy - r * 0.3, r * 0.18, r * 0.12, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4f9e52';
  ctx.beginPath();
  ctx.ellipse(cx, cy - r * 0.78, r * 0.26, r * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawEgg(ctx, cx, cy, r) {
  ctx.fillStyle = '#fbf6ec';
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 0.95, r * 0.75, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ING_COLORS.egg;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.arc(cx - r * 0.16, cy - r * 0.16, r * 0.13, 0, Math.PI * 2);
  ctx.fill();
}

const ING_ART = {
  salmon: drawSalmon,
  rice: drawRice,
  nori: drawNori,
  beef: drawBeef,
  noodles: drawNoodles,
  greens: drawGreens,
  tomato: drawTomato,
  egg: drawEgg,
};

function drawIngredient(ctx, id, cx, cy, r) {
  const artist = ING_ART[id];
  if (artist) {
    artist(ctx, cx, cy, r);
    return;
  }
  ctx.fillStyle = ING_COLORS[id] || '#888888';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
    canvas.style.width = `${Math.floor(FIELD.width * scale)}px`;
    canvas.style.height = `${Math.floor(FIELD.height * scale)}px`;
    const width = Math.round(FIELD.width * scale * ratio);
    const height = Math.round(FIELD.height * scale * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = width / FIELD.width;
  }

  function text(value, x, y, size, color, align, baseline) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    ctx.font = fonts.get(size);
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = baseline || 'alphabetic';
    ctx.fillText(value, x, y);
  }

  function drawMeter(x, y, w, h, ratio, color) {
    const r = clamp(ratio, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    roundRect(ctx, x, y, w, h, h / 2);
    ctx.fill();
    if (r > 0) {
      ctx.fillStyle = color;
      roundRect(ctx, x, y, w * r, h, h / 2);
      ctx.fill();
    }
  }

  function patienceColor(ratio) {
    if (ratio > 0.5) return PALETTE.good;
    if (ratio > 0.25) return PALETTE.copperLight;
    return PALETTE.warn;
  }

  function drawSky() {
    const gradient = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    gradient.addColorStop(0, PALETTE.skyTop);
    gradient.addColorStop(0.55, PALETTE.skyMid);
    gradient.addColorStop(1, PALETTE.skyBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = 'rgba(246,231,189,0.85)';
    for (const [x, y] of STARS) {
      const twinkle = 0.5 + 0.5 * Math.sin((x + y) * 0.7 + 1.3);
      ctx.globalAlpha = 0.35 + twinkle * 0.55;
      ctx.beginPath();
      ctx.arc(x, y, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawMoon() {
    const x = 1108;
    const y = 96;
    const glow = ctx.createRadialGradient(x, y, 10, x, y, 130);
    glow.addColorStop(0, 'rgba(249,217,140,0.55)');
    glow.addColorStop(1, 'rgba(249,217,140,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 140, y - 140, 280, 280);
    ctx.fillStyle = PALETTE.moon;
    ctx.beginPath();
    ctx.arc(x, y, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(226,203,148,0.55)';
    ctx.beginPath();
    ctx.arc(x - 13, y - 9, 7, 0, Math.PI * 2);
    ctx.arc(x + 9, y + 13, 5, 0, Math.PI * 2);
    ctx.arc(x + 15, y - 16, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawWallAndCounter() {
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(0, 300, FIELD.width, 174);
    ctx.fillStyle = PALETTE.wallDark;
    ctx.fillRect(0, 300, FIELD.width, 4);
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let y = 320; y < 474; y += 26) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(FIELD.width, y);
      ctx.stroke();
    }
    ctx.fillStyle = PALETTE.woodLight;
    ctx.fillRect(0, 474, FIELD.width, FIELD.height - 474);
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(0, 474, FIELD.width, 6);
    ctx.fillRect(0, FIELD.height - 22, FIELD.width, 22);
    ctx.strokeStyle = 'rgba(63,39,22,0.5)';
    for (let x = 40; x < FIELD.width; x += 92) {
      ctx.beginPath();
      ctx.moveTo(x, 486);
      ctx.lineTo(x - 20, FIELD.height - 22);
      ctx.stroke();
    }
  }

  function drawLamp() {
    const x = 775;
    const glow = ctx.createRadialGradient(x, 128, 8, x, 128, 150);
    glow.addColorStop(0, 'rgba(249,217,140,0.32)');
    glow.addColorStop(1, 'rgba(249,217,140,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 160, 0, 320, 320);
    ctx.strokeStyle = PALETTE.copperDark;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 64);
    ctx.stroke();
    ctx.fillStyle = PALETTE.copper;
    ctx.beginPath();
    ctx.moveTo(x - 34, 62);
    ctx.lineTo(x + 34, 62);
    ctx.lineTo(x + 20, 116);
    ctx.lineTo(x - 20, 116);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PALETTE.copperDark;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = PALETTE.moonGlow;
    ctx.beginPath();
    ctx.arc(x, 124, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawKitchen(state) {
    drawSky();
    drawMoon();
    drawWallAndCounter();
    drawLamp();
  }

  function drawPantry(state) {
    const p = LAYOUT.pantry;
    ctx.fillStyle = PALETTE.wallDark;
    roundRect(ctx, p.x, p.y, p.w, p.h, 10);
    ctx.fill();
    ctx.strokeStyle = PALETTE.copperDark;
    ctx.lineWidth = 2;
    ctx.stroke();
    // A title strip inside the panel keeps the PANTRY label clear of the HUD above it.
    const titleH = 44;
    text('PANTRY', p.x + 12, p.y + titleH - 12, 20, PALETTE.copperLight, 'left', 'alphabetic');
    const gridTop = p.y + titleH;
    const cellW = (p.w - p.gap * (p.cols + 1)) / p.cols;
    const cellH = (p.h - titleH - p.gap * (p.rows + 1)) / p.rows;
    INGREDIENT_IDS.forEach((id, index) => {
      const col = Math.floor(index / p.rows);
      const row = index % p.rows;
      const bx = p.x + p.gap + col * (cellW + p.gap);
      const by = gridTop + p.gap + row * (cellH + p.gap);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      roundRect(ctx, bx, by, cellW, cellH, 6);
      ctx.fill();
      ctx.strokeStyle = state.hand === id ? PALETTE.copperLight : PALETTE.copperDark;
      ctx.lineWidth = state.hand === id ? 3 : 1.5;
      ctx.stroke();
      drawIngredient(ctx, id, bx + cellW / 2, by + cellH / 2 + 6, Math.min(cellW, cellH) * 0.34);
      text(INGREDIENTS[id].name, bx + cellW / 2, by + cellH - 13, 13, PALETTE.muted, 'center', 'alphabetic');
    });
  }

  function drawOrders(state) {
    const o = LAYOUT.orders;
    const gap = 12;
    const slotW = (o.w - gap * (o.slots - 1)) / o.slots;
    for (let i = 0; i < o.slots; i += 1) {
      const x = o.x + i * (slotW + gap);
      ctx.fillStyle = PALETTE.ticket;
      roundRect(ctx, x, o.y, slotW, o.h, 6);
      ctx.fill();
      const order = state.orders[i];
      if (!order) {
        ctx.strokeStyle = 'rgba(42,32,48,0.18)';
        ctx.lineWidth = 2;
        ctx.stroke();
        text('—', x + slotW / 2, o.y + o.h / 2 + 6, 28, 'rgba(42,32,48,0.25)', 'center', 'middle');
        continue;
      }
      if (i === 0) {
        ctx.strokeStyle = PALETTE.copperLight;
        ctx.lineWidth = 3;
      } else {
        ctx.strokeStyle = 'rgba(42,32,48,0.3)';
        ctx.lineWidth = 1.5;
      }
      ctx.stroke();
      text(order.recipe.name, x + 12, o.y + 26, 16, PALETTE.ticketInk, 'left', 'alphabetic');
      text(order.recipe.zh, x + 12, o.y + 46, 13, '#6d5a44', 'left', 'alphabetic');
      const ratio = clamp(order.patience / order.patienceMax, 0, 1);
      drawMeter(x + 12, o.y + 56, slotW - 24, 9, ratio, patienceColor(ratio));
      const ingredients = order.recipe.ingredients;
      const startX = x + 14;
      ingredients.forEach((id, index) => {
        const inDish = state.boardPlate.raw.includes(id) || state.boardPlate.prepped.includes(id);
        const cx = startX + index * 24;
        const cy = o.y + o.h - 18;
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fillStyle = inDish ? ING_COLORS[id] : 'rgba(42,32,48,0.12)';
        ctx.fill();
        if (!inDish) {
          ctx.strokeStyle = 'rgba(42,32,48,0.3)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });
      text(`$${order.recipe.price}`, x + slotW - 12, o.y + 26, 14, PALETTE.copperDark, 'right', 'alphabetic');
    }
  }

  function drawRecipeCard(state) {
    const c = LAYOUT.recipeCard;
    ctx.fillStyle = 'rgba(20,17,30,0.92)';
    roundRect(ctx, c.x, c.y, c.w, c.h, 12);
    ctx.fill();
    ctx.strokeStyle = PALETTE.copperDark;
    ctx.lineWidth = 2;
    ctx.stroke();
    const order = state.orders[0];
    if (!order) {
      text('Waiting for an order…', c.x + c.w / 2, c.y + c.h / 2 + 6, 26, PALETTE.muted, 'center', 'middle');
      return;
    }
    text(order.recipe.name, c.x + 20, c.y + 34, 27, PALETTE.ink, 'left', 'alphabetic');
    text(order.recipe.zh, c.x + 20, c.y + 62, 17, PALETTE.muted, 'left', 'alphabetic');
    text(`$${order.recipe.price}`, c.x + c.w - 20, c.y + 38, 26, PALETTE.copperLight, 'right', 'alphabetic');
    const ingredients = order.recipe.ingredients;
    const iconY = c.y + 100;
    const spacing = 68;
    const startX = c.x + c.w / 2 - ((ingredients.length - 1) * spacing) / 2;
    ingredients.forEach((id, index) => {
      const inDish = state.boardPlate.raw.includes(id) || state.boardPlate.prepped.includes(id);
      const cx = startX + index * spacing;
      if (inDish) {
        ctx.fillStyle = 'rgba(143,214,154,0.16)';
        ctx.beginPath();
        ctx.arc(cx, iconY, 24, 0, Math.PI * 2);
        ctx.fill();
      }
      drawIngredient(ctx, id, cx, iconY, 17);
      text(INGREDIENTS[id].name, cx, iconY + 26, 10, PALETTE.faint, 'center', 'alphabetic');
    });
    const ratio = clamp(order.patience / order.patienceMax, 0, 1);
    drawMeter(c.x + 20, c.y + c.h - 22, c.w - 40, 10, ratio, patienceColor(ratio));
  }

  function drawFlame(x, y, w, h, phase) {
    const layers = [
      [PALETTE.flameEdge, 1],
      [PALETTE.flameMid, 0.72],
      [PALETTE.flameCore, 0.45],
    ];
    for (const [color, scale] of layers) {
      const sway = Math.sin(phase + scale * 7) * w * 0.06;
      const fw = w * scale;
      const fh = h * scale;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x + sway - fw / 2, y);
      ctx.quadraticCurveTo(x + sway - fw * 0.35, y - fh * 0.55, x + sway, y - fh);
      ctx.quadraticCurveTo(x + sway + fw * 0.35, y - fh * 0.55, x + sway + fw / 2, y);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawBoard(state) {
    const b = LAYOUT.stations.board;
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(b.x + b.w / 2, b.y + b.h - 8, b.w * 0.46, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.board;
    roundRect(ctx, b.x, b.y + 30, b.w, b.h - 30, 14);
    ctx.fill();
    ctx.strokeStyle = PALETTE.boardDark;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(156,116,68,0.5)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i += 1) {
      ctx.beginPath();
      ctx.moveTo(b.x + 18, b.y + 30 + (i * (b.h - 30)) / 4);
      ctx.lineTo(b.x + b.w - 18, b.y + 30 + (i * (b.h - 30)) / 4);
      ctx.stroke();
    }
    // knife swings down while the chop animation plays.
    const chop = state.stations.board.progress;
    const kx = b.x + b.w * 0.7;
    const ky = b.y + 34;
    ctx.save();
    ctx.translate(kx, ky);
    ctx.rotate(-0.55 + chop * 1.15);
    ctx.fillStyle = PALETTE.knifeEdge;
    roundRect(ctx, -5, -64, 10, 46, 3);
    ctx.fill();
    ctx.fillStyle = PALETTE.knife;
    ctx.beginPath();
    ctx.moveTo(-5, -64);
    ctx.lineTo(5, -64);
    ctx.lineTo(5, -26);
    ctx.lineTo(-5, -18);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.woodDark;
    roundRect(ctx, -5, -18, 10, 26, 3);
    ctx.fill();
    ctx.restore();
    text('BOARD', b.x + 16, b.y + b.h - 14, 16, PALETTE.boardDark, 'left', 'alphabetic');
  }

  function drawStove(state) {
    const s = LAYOUT.stations.stove;
    const stove = state.stations.stove;
    const cx = s.x + s.w / 2;

    // Stove appliance body, sitting on the counter.
    ctx.fillStyle = '#1b1e28';
    roundRect(ctx, s.x + 14, s.y + 92, s.w - 28, s.h - 112, 12);
    ctx.fill();
    ctx.strokeStyle = '#3a3f4c';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Burner: a dark ring with a stand, drawn inside the appliance.
    const burnerY = s.y + 176;
    const burnerR = 52;
    ctx.fillStyle = '#10121a';
    ctx.beginPath();
    ctx.arc(cx, burnerY, burnerR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333845';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.strokeStyle = '#4a5162';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, burnerY, burnerR * 0.66, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#262a35';
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i += 1) {
      const angle = (Math.PI / 4) * i;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * burnerR * 0.4, burnerY + Math.sin(angle) * burnerR * 0.4);
      ctx.lineTo(cx + Math.cos(angle) * burnerR * 0.92, burnerY + Math.sin(angle) * burnerR * 0.92);
      ctx.stroke();
    }

    // Flame rises from the burner behind the pan while cooking.
    if (stove.active) {
      const flameH = 30 + stove.fire * 18;
      drawFlame(cx, burnerY - 10, 50, flameH, state.elapsed * 16);
    }

    // Copper pan, always seated on the burner.
    const panY = burnerY - 56;
    ctx.strokeStyle = PALETTE.copperDark;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx + 68, panY);
    ctx.lineTo(cx + 96, panY - 4);
    ctx.stroke();
    ctx.fillStyle = PALETTE.copper;
    ctx.beginPath();
    ctx.ellipse(cx, panY, 74, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.copperDark;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = PALETTE.copperLight;
    ctx.beginPath();
    ctx.ellipse(cx, panY - 6, 60, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    if (stove.active && stove.ingredient) {
      drawIngredient(ctx, stove.ingredient, cx, panY - 2, 17);
    }

    // Steam curls above the pan while cooking.
    if (stove.active) {
      ctx.strokeStyle = PALETTE.steam;
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i += 1) {
        const sx = cx - 22 + i * 22;
        const travel = (state.elapsed * 14 + i * 23) % 40;
        const sy = panY - 34 - travel;
        ctx.globalAlpha = 0.55 * (1 - travel / 40);
        ctx.beginPath();
        ctx.arc(sx, sy, 7 + i, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Heat meter with the perfect window.
    const barX = s.x + 20;
    const barY = s.y + s.h - 28;
    const barW = s.w - 40;
    const barH = 12;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    roundRect(ctx, barX, barY, barW, barH, barH / 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.steam;
    ctx.fillRect(barX + barW * STOVE.okMin, barY, barW * (STOVE.okMax - STOVE.okMin), barH);
    ctx.fillStyle = PALETTE.good;
    ctx.fillRect(barX + barW * STOVE.perfectMin, barY, barW * (STOVE.perfectMax - STOVE.perfectMin), barH);
    if (stove.active) {
      const px = barX + barW * clamp(stove.fire, 0, 1);
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(px - 2, barY - 3, 4, barH + 6);
    }
    text('STOVE', s.x + 16, s.y + 22, 16, PALETTE.copperLight, 'left', 'alphabetic');
  }

  function drawPass(state) {
    const p = LAYOUT.stations.pass;
    ctx.fillStyle = PALETTE.wallDark;
    roundRect(ctx, p.x, p.y, p.w, p.h, 14);
    ctx.fill();
    ctx.strokeStyle = PALETTE.copperDark;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = PALETTE.skyBottom;
    roundRect(ctx, p.x + 18, p.y + 18, p.w - 36, p.h - 62, 10);
    ctx.fill();
    ctx.strokeStyle = PALETTE.copper;
    ctx.lineWidth = 2;
    ctx.stroke();
    text('PASS', p.x + p.w / 2, p.y + 44, 24, PALETTE.copperLight, 'center', 'middle');
    // One fixed status slot: the instruction only shows while the plate is empty and there is
    // no serve/plate feedback, otherwise the current status (e.g. PLATED) owns this line.
    const plate = state.boardPlate;
    const hasPassFloat = state.floating.some(
      (item) => item.text === 'PLATED' || item.text.startsWith('+') || item.text.startsWith('COMBO'),
    );
    if (plate.raw.length > 0) {
      text('PLATED', p.x + p.w / 2, p.y + 96, 20, PALETTE.good, 'center', 'middle');
    } else if (plate.raw.length === 0 && plate.prepped.length === 0 && !hasPassFloat) {
      text('serve the plate here', p.x + p.w / 2, p.y + 96, 15, PALETTE.muted, 'center', 'middle');
    }
    ctx.fillStyle = PALETTE.copper;
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2, p.y + 128, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.copperDark;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = PALETTE.copperDark;
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2, p.y + 128, 6, 0, Math.PI * 2);
    ctx.fill();
    const sb = LAYOUT.serveButton;
    ctx.fillStyle = PALETTE.copper;
    roundRect(ctx, sb.x, sb.y, sb.w, sb.h, 10);
    ctx.fill();
    ctx.strokeStyle = PALETTE.copperDark;
    ctx.lineWidth = 3;
    ctx.stroke();
    text('SERVE', sb.x + sb.w / 2, sb.y + sb.h / 2 + 1, 24, PALETTE.ink, 'center', 'middle');
  }

  function drawStations(state) {
    drawBoard(state);
    drawStove(state);
    drawPass(state);
  }

  function drawPlate(state) {
    const rect = plateRect();
    const cx = rect.x + rect.w / 2;
    const plateY = rect.y + rect.h * 0.6;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(cx, rect.y + rect.h - 6, rect.w * 0.46, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    // plate rim + well
    ctx.fillStyle = PALETTE.plate;
    ctx.beginPath();
    ctx.ellipse(cx, plateY, rect.w * 0.46, rect.h * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.plateRim;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#fdfcf7';
    ctx.beginPath();
    ctx.ellipse(cx, plateY, rect.w * 0.34, rect.h * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();

    const prepped = state.boardPlate.prepped;
    const raw = state.boardPlate.raw;
    if (prepped.length > 0) {
      const spacing = 56;
      const startX = cx - ((prepped.length - 1) * spacing) / 2;
      prepped.forEach((id, index) => {
        const ix = startX + index * spacing;
        ctx.fillStyle = 'rgba(143,214,154,0.25)';
        ctx.beginPath();
        ctx.arc(ix, plateY - 30, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = PALETTE.good;
        ctx.lineWidth = 2;
        ctx.stroke();
        drawIngredient(ctx, id, ix, plateY - 30, 13);
      });
    }
    if (raw.length > 0) {
      const spacing = 62;
      const startX = cx - ((raw.length - 1) * spacing) / 2;
      raw.forEach((id, index) => {
        drawIngredient(ctx, id, startX + index * spacing, plateY + 10, 17);
      });
    } else if (prepped.length === 0) {
      text('empty', cx, plateY + 4, 13, PALETTE.faint, 'center', 'middle');
    }
    if (prepped.length > 0) {
      text('READY — P to plate', cx, rect.y + 14, 15, PALETTE.good, 'center', 'alphabetic');
    }
  }

  function drawHud(state) {
    const h = LAYOUT.hud;
    ctx.fillStyle = 'rgba(11,12,24,0.72)';
    roundRect(ctx, h.x, h.y, h.w, h.h, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(201,133,60,0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Row 1: score and hearts.
    text(`SCORE ${state.score}`, h.x + 16, h.y + 30, 26, PALETTE.ink, 'left', 'alphabetic');
    for (let i = 0; i < SHIFT.hearts; i += 1) {
      const hx = h.x + 210 + i * 30;
      const hy = h.y + 12;
      ctx.fillStyle = i < state.hearts ? PALETTE.warn : 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.moveTo(hx, hy + 8);
      ctx.bezierCurveTo(hx, hy, hx - 12, hy - 2, hx - 12, hy + 6);
      ctx.bezierCurveTo(hx - 12, hy + 12, hx, hy + 16, hx, hy + 20);
      ctx.bezierCurveTo(hx, hy + 16, hx + 12, hy + 12, hx + 12, hy + 6);
      ctx.bezierCurveTo(hx + 12, hy - 2, hx, hy, hx, hy + 8);
      ctx.fill();
    }
    // Row 2: combo streak.
    text(`COMBO x${state.combo}`, h.x + 16, h.y + 58, 17, state.combo > 1 ? PALETTE.copperLight : PALETTE.muted, 'left', 'alphabetic');
    // Row 3: level, orders served and the active order countdown.
    text(`LV ${state.level}`, h.x + 16, h.y + 78, 15, PALETTE.muted, 'left', 'alphabetic');
    text(`SERVED ${state.served}/${SHIFT.ordersToServe}`, h.x + 130, h.y + 78, 15, PALETTE.muted, 'left', 'alphabetic');
    text(`ORDER ${Math.max(0, Math.ceil(state.timeLeft))}s`, h.x + 330, h.y + 78, 15, patienceColor(state.timeLeft / 40), 'left', 'alphabetic');
  }

  function drawFeedback(state) {
    if (state.flashGood > 0) {
      ctx.fillStyle = `rgba(143,214,154,${(state.flashGood * 0.16).toFixed(3)})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    if (state.flashBad > 0) {
      ctx.fillStyle = `rgba(229,105,79,${(state.flashBad * 0.18).toFixed(3)})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    for (const particle of state.particles) {
      ctx.globalAlpha = clamp(1 - particle.age / particle.life, 0, 1);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const item of state.floating) {
      // PLATED has its own fixed status slot in drawPass, so it is not a floater.
      if (item.text === 'PLATED') continue;
      const isTip = item.text.startsWith('+') || item.text.startsWith('COMBO');
      const alpha = clamp(1 - item.age / 1.15, 0, 1);
      ctx.globalAlpha = alpha;
      text(item.text, item.x, item.y + (isTip ? 46 : 0), 20, item.color, 'center', 'alphabetic');
    }
    ctx.globalAlpha = 1;
  }

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(11,12,24,0.42)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // Kept short and pushed toward the top so the BOARD and STOVE stations below stay visible.
    const panel = { x: 340, y: 16, w: 600, h: 292 };
    ctx.fillStyle = 'rgba(20,17,30,0.9)';
    roundRect(ctx, panel.x, panel.y, panel.w, panel.h, 20);
    ctx.fill();
    ctx.strokeStyle = PALETTE.copperLight;
    ctx.lineWidth = 3;
    ctx.stroke();
    const cx = panel.x + panel.w / 2;
    ctx.fillStyle = PALETTE.moonGlow;
    ctx.beginPath();
    ctx.arc(cx, panel.y + 52, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.moon;
    ctx.beginPath();
    ctx.arc(cx - 5, panel.y + 47, 22, 0, Math.PI * 2);
    ctx.fill();
    text('Moonlit Mise', cx, panel.y + 112, 46, PALETTE.ink, 'center', 'alphabetic');
    text('月港小厨', cx, panel.y + 152, 28, PALETTE.moonGlow, 'center', 'alphabetic');
    text('Chop, cook, plate and serve before the tide turns.', cx, panel.y + 192, 18, PALETTE.muted, 'center', 'alphabetic');
    text('Press Space or click to start', cx, panel.y + 234, 22, PALETTE.copperLight, 'center', 'alphabetic');
    if (best > 0) text(`Best ${best}`, cx, panel.y + 266, 16, PALETTE.good, 'center', 'alphabetic');
  }

  function drawOver(state, best) {
    ctx.fillStyle = 'rgba(11,12,24,0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const panel = { x: 360, y: 150, w: 560, h: 340 };
    ctx.fillStyle = '#14111e';
    roundRect(ctx, panel.x, panel.y, panel.w, panel.h, 20);
    ctx.fill();
    ctx.strokeStyle = state.won ? PALETTE.good : PALETTE.warn;
    ctx.lineWidth = 3;
    ctx.stroke();
    const cx = panel.x + panel.w / 2;
    text(state.won ? 'Shift complete!' : 'Out of hearts', cx, panel.y + 66, 44, state.won ? PALETTE.good : PALETTE.warn, 'center', 'alphabetic');
    text('Score', cx, panel.y + 128, 18, PALETTE.muted, 'center', 'alphabetic');
    text(String(state.score), cx, panel.y + 174, 52, PALETTE.ink, 'center', 'alphabetic');
    text(`Best ${best}`, cx, panel.y + 218, 22, PALETTE.copperLight, 'center', 'alphabetic');
    text(`Orders served ${state.served}/${SHIFT.ordersToServe} · Best combo x${state.bestCombo}`, cx, panel.y + 256, 18, PALETTE.muted, 'center', 'alphabetic');
    text('Press Space or click to play again', cx, panel.y + 308, 24, PALETTE.copperLight, 'center', 'alphabetic');
  }

  function draw(state, screen, best) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, 0, 0);
    if (state.shake > 0) {
      ctx.translate(Math.sin(state.elapsed * 90) * state.shake * 3, Math.cos(state.elapsed * 83) * state.shake * 3);
    }
    drawKitchen(state);
    drawPantry(state);
    if (screen === SCREEN_TITLE) {
      drawStations(state);
      drawFeedback(state);
      drawTitle(state, best);
      return;
    }
    drawOrders(state);
    drawRecipeCard(state);
    drawStations(state);
    drawPlate(state);
    drawHud(state);
    drawFeedback(state);
    if (screen === SCREEN_OVER) drawOver(state, best);
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
