// Every tuning number, colour and screen layout in one place. The kitchen is a fixed 1280x720
// logical canvas; the renderer scales it to the window, so no rule below depends on screen size.
// This file has no browser code and no drawing: it is the single source of truth for the rest.

export const FIELD = { width: 1280, height: 720 };

/** The fixed simulation step in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Shift: serve this many orders, and keep the three reputation hearts you start with. */
export const SHIFT = {
  ordersToServe: 10,
  hearts: 3,
  /** Base seconds between order arrivals; it shrinks as the level climbs. */
  orderInterval: 7.5,
  orderIntervalMin: 3.4,
  orderIntervalScale: 0.92,
  /** Patience multiplier applied to each recipe at higher levels. */
  patienceScalePerLevel: 0.93,
};

export const PLAYER = {
  /** Combo window in seconds: serve the next order within this to keep the streak. */
  comboWindow: 14,
};

/** The stove: how long a cook step takes and where its "perfect" window sits. */
export const STOVE = {
  cookSeconds: 2.6,
  perfectMin: 0.55,
  perfectMax: 0.8,
  okMin: 0.4,
  okMax: 0.94,
};

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

export const PALETTE = {
  backdrop: '#0b0c18',
  skyTop: '#1c2040',
  skyMid: '#171a34',
  skyBottom: '#0e1126',
  wall: '#271d35',
  wallDark: '#1f172b',
  wood: '#5b3a22',
  woodLight: '#7c5230',
  woodDark: '#3f2716',
  copper: '#c9853c',
  copperLight: '#eab56a',
  copperDark: '#8f5a24',
  ink: '#f4ebd8',
  muted: '#b3a794',
  faint: '#7d7364',
  moon: '#f6e7bd',
  moonGlow: '#f9d98c',
  plate: '#e7e2d4',
  plateRim: '#c9c2ae',
  pan: '#2b2f3a',
  panShine: '#454b5a',
  flameCore: '#ffd45e',
  flameMid: '#ff9d3c',
  flameEdge: '#e2602a',
  good: '#8fd69a',
  warn: '#e5694f',
  danger: '#d6493f',
  steam: '#c9c4e8',
  ticket: '#f3ead8',
  ticketInk: '#2a2030',
  board: '#c69a63',
  boardDark: '#9c7444',
  knife: '#d8dde4',
  knifeEdge: '#9aa4b0',
};

/** Where the pantry bins, stations and buttons sit; hit-testing and drawing both read this. */
export const LAYOUT = {
  pantry: { x: 18, y: 150, w: 288, h: 560, cols: 2, rows: 4, gap: 10 },
  worktop: { x: 320, y: 474, w: 948, h: 232 },
  stations: {
    board: { x: 336, y: 330, w: 270, h: 250 },
    stove: { x: 640, y: 330, w: 270, h: 250 },
    pass: { x: 944, y: 330, w: 300, h: 250 },
  },
  recipeCard: { x: 336, y: 152, w: 700, h: 160 },
  serveButton: { x: 944, y: 560, w: 300, h: 58 },
  orders: { x: 566, y: 10, w: 700, h: 128, slots: 3 },
  hud: { x: 20, y: 60, w: 520, h: 84 },
  title: { x: 22, y: 22 },
};

/** Names for accessibility and the HUD; the renderer draws its own art for each. */
export const INGREDIENT_NAMES = {
  salmon: 'Salmon',
  rice: 'Rice',
  nori: 'Nori',
  beef: 'Beef',
  noodles: 'Noodles',
  greens: 'Greens',
  tomato: 'Tomato',
  egg: 'Egg',
};
