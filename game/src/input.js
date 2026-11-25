// Mouse and keyboard input. Pointer hits are translated into the one-shot intents world.step()
// understands (take / placeAt / plate / serve / removeLast), and the keyboard offers the same
// moves. Control intents (start/restart via confirm, pause) ride along in the same object for
// main.js; the world simply ignores fields it does not read. No rules live here.

import { FIELD, LAYOUT } from './config.js';
import { INGREDIENT_IDS } from './recipes.js';

function pointInRect(x, y, rect) {
  return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
}

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

/** The pantry bin (0..7) under a logical point, or -1 when the point is outside every bin. */
function binAt(x, y) {
  const pantry = LAYOUT.pantry;
  const cellW = (pantry.w - pantry.gap * (pantry.cols + 1)) / pantry.cols;
  const cellH = (pantry.h - pantry.gap * (pantry.rows + 1)) / pantry.rows;
  for (let index = 0; index < INGREDIENT_IDS.length; index += 1) {
    const col = Math.floor(index / pantry.rows);
    const row = index % pantry.rows;
    const bx = pantry.x + pantry.gap + col * (cellW + pantry.gap);
    const by = pantry.y + pantry.gap + row * (cellH + pantry.gap);
    if (x >= bx && x < bx + cellW && y >= by && y < by + cellH) return index;
  }
  return -1;
}

function emptyActions() {
  return { take: [], placeAt: [], plate: false, serve: false, removeLast: false, confirm: false, pause: false };
}

export function createInput(canvas) {
  let actions = emptyActions();

  function logical(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scale = rect.width / FIELD.width;
    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale,
    };
  }

  function stationAt(point) {
    for (const name of Object.keys(LAYOUT.stations)) {
      if (pointInRect(point.x, point.y, LAYOUT.stations[name])) return name;
    }
    return null;
  }

  window.addEventListener('pointerdown', (event) => {
    const point = logical(event.clientX, event.clientY);
    actions.confirm = true;
    const bin = binAt(point.x, point.y);
    if (bin >= 0) {
      actions.take.push(INGREDIENT_IDS[bin]);
      event.preventDefault();
      return;
    }
    const station = stationAt(point);
    if (station === 'board' || station === 'stove') {
      actions.placeAt.push(station);
      event.preventDefault();
      return;
    }
    if (station === 'pass' || pointInRect(point.x, point.y, LAYOUT.serveButton)) {
      actions.serve = true;
      event.preventDefault();
      return;
    }
    if (pointInRect(point.x, point.y, plateRect())) {
      actions.plate = true;
      event.preventDefault();
      return;
    }
    event.preventDefault();
  });

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const key = event.code;
    if (key.startsWith('Digit')) {
      const index = Number(key.slice(5)) - 1;
      if (index >= 0 && index < INGREDIENT_IDS.length) {
        actions.take.push(INGREDIENT_IDS[index]);
      } else {
        return;
      }
    } else if (key === 'KeyC') {
      actions.placeAt.push('board');
    } else if (key === 'KeyV') {
      actions.placeAt.push('stove');
    } else if (key === 'KeyP') {
      actions.plate = true;
    } else if (key === 'Space') {
      actions.serve = true;
      actions.confirm = true;
    } else if (key === 'Escape') {
      actions.pause = true;
    } else if (key === 'Backspace') {
      actions.removeLast = true;
    } else {
      return;
    }
    event.preventDefault();
  });

  return {
    /** Every intent queued since the last call, then the queue resets for the next frame. */
    takeActions() {
      const taken = actions;
      // A fresh bucket is used next frame; the returned object is handed straight to world.step().
      actions = emptyActions();
      return taken;
    },
  };
}
