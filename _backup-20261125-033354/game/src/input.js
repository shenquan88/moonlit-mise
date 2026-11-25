// Keyboard and pointer input. The game is mouse-first: every station and pantry bin is a click
// target, and the keyboard offers the same moves (1-8 for ingredients, B for the board, C for the
// stove, Space to plate/serve, M to mute, P to pause). This file turns raw events into semantic
// intents and never knows the rules, so the world stays about cooking.

import { LAYOUT } from './config.js';
import { INGREDIENT_IDS } from './recipes.js';
import { unlock } from './audio.js';

const INGREDIENT_KEYS = new Set(['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8']);

function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

/** The pantry bin (0..7) at a logical point, or -1 when the point is outside the bins. */
function binAt(x, y) {
  const p = LAYOUT.pantry;
  const cellW = (p.w - p.gap * (p.cols + 1)) / p.cols;
  const cellH = (p.h - p.gap * (p.rows + 1)) / p.rows;
  for (let index = 0; index < INGREDIENT_IDS.length; index += 1) {
    const col = Math.floor(index / p.rows);
    const row = index % p.rows;
    const bx = p.x + p.gap + col * (cellW + p.gap);
    const by = p.y + p.gap + row * (cellH + p.gap);
    if (x >= bx && x <= bx + cellW && y >= by && y <= by + cellH) return index;
  }
  return -1;
}

export function createInput(target, view) {
  let pointer = null;
  const clicks = [];
  const actions = [];
  let hover = null;

  function logical(clientX, clientY) {
    const rect = target.getBoundingClientRect();
    return {
      x: (clientX - rect.left - view.x) / view.scale,
      y: (clientY - rect.top - view.y) / view.scale,
    };
  }

  window.addEventListener('pointermove', (event) => {
    const point = logical(event.clientX, event.clientY);
    pointer = point;
    hover = {
      bin: binAt(point.x, point.y),
      station: null,
      button: false,
    };
    for (const name of Object.keys(LAYOUT.stations)) {
      if (pointInRect(point.x, point.y, LAYOUT.stations[name])) hover.station = name;
    }
    if (pointInRect(point.x, point.y, LAYOUT.serveButton)) hover.button = true;
  });

  window.addEventListener('pointerdown', (event) => {
    const point = logical(event.clientX, event.clientY);
    pointer = point;
    unlock();
    const bin = binAt(point.x, point.y);
    if (bin >= 0) {
      actions.push({ type: 'select', ingredient: INGREDIENT_IDS[bin] });
      event.preventDefault();
      return;
    }
    for (const name of Object.keys(LAYOUT.stations)) {
      if (pointInRect(point.x, point.y, LAYOUT.stations[name])) {
        actions.push({ type: 'station', station: name });
        event.preventDefault();
        return;
      }
    }
    if (pointInRect(point.x, point.y, LAYOUT.serveButton)) {
      actions.push({ type: 'serve' });
      event.preventDefault();
      return;
    }
    clicks.push(point);
  });

  window.addEventListener('keydown', (event) => {
    if (INGREDIENT_KEYS.has(event.code)) {
      const index = Number(event.code.slice(5)) - 1;
      if (index < INGREDIENT_IDS.length) {
        actions.push({ type: 'select', ingredient: INGREDIENT_IDS[index] });
        unlock();
      }
    } else if (event.code === 'KeyB') {
      actions.push({ type: 'station', station: 'board' });
      unlock();
    } else if (event.code === 'KeyC' || event.code === 'KeyS') {
      actions.push({ type: 'station', station: 'stove' });
      unlock();
    } else if (event.code === 'Space' || event.code === 'Enter') {
      actions.push({ type: 'serve' });
      unlock();
    } else if (event.code === 'KeyM') {
      actions.push({ type: 'mute' });
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      actions.push({ type: 'pause' });
    } else return;
    event.preventDefault();
  });

  return {
    /** The logical hover state, or null when the pointer has not moved yet. */
    hover() {
      return hover;
    },
    /** Take every intent queued since the last call. */
    take() {
      const taken = actions.slice();
      actions.length = 0;
      clicks.length = 0;
      return taken;
    },
    pointer() {
      return pointer;
    },
  };
}
