// The game's rules and state, with no drawing and no browser in it: the pantry, the held
// ingredient, the cutting board, the stove, the active dish and the order rail. act() applies one
// player intent; step() advances one fixed step. Both return event flags so the caller can react
// (sound, announcements, screen changes) without the world knowing about screens or audio.

import { FIELD, LAYOUT, PLAYER, SHIFT, STEP, STOVE } from './config.js';
import { INGREDIENTS, INGREDIENT_IDS, PREP_CHOP, PREP_COOK, RECIPES, RECIPE_IDS } from './recipes.js';
import { pick } from './random.js';

export const EVENT_CHOP = 1;
export const EVENT_COOK_START = 2;
export const EVENT_COOK_GOOD = 4;
export const EVENT_PLATE = 8;
export const EVENT_SERVE = 16;
export const EVENT_SERVE_PERFECT = 32;
export const EVENT_ERROR = 64;
export const EVENT_MISS = 128;
export const EVENT_OVER = 256;
export const EVENT_WIN = 512;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/** Cook quality from a lift position: 2 perfect, 1 acceptable, 0 undercooked or burnt. */
function cookQuality(progress) {
  if (progress >= STOVE.perfectMin && progress <= STOVE.perfectMax) return 2;
  if (progress >= STOVE.okMin && progress <= STOVE.okMax) return 1;
  return 0;
}

export function createWorld(random) {
  const state = {
    elapsed: 0,
    level: 1,
    score: 0,
    combo: 0,
    bestCombo: 0,
    hearts: SHIFT.hearts,
    served: 0,
    over: false,
    won: false,
    held: null,
    selected: null,
    activeOrderId: null,
    nextOrderId: 1,
    orderTimer: 1.4,
    lastServeAt: -Infinity,
    orders: [],
    stove: { active: false, ingredient: null, progress: 0, phase: 'idle' },
    particles: [],
    floating: [],
    shake: 0,
    flash: 0,
    announcements: [],
  };

  function activeOrder() {
    for (let index = 0; index < state.orders.length; index += 1) {
      if (state.orders[index].id === state.activeOrderId) return state.orders[index];
    }
    return null;
  }

  function chooseActive() {
    for (let index = 0; index < state.orders.length; index += 1) {
      if (!state.orders[index].served && !state.orders[index].expired) {
        state.activeOrderId = state.orders[index].id;
        return;
      }
    }
    state.activeOrderId = null;
  }

  function pushFloating(text, x, y, color) {
    state.floating.push({ text, x, y, color, age: 0 });
  }

  function burst(x, y, color, count) {
    for (let index = 0; index < count; index += 1) {
      const angle = random() * Math.PI * 2;
      const speed = 40 + random() * 140;
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        age: 0,
        life: 0.4 + random() * 0.5,
        color,
        size: 2 + random() * 3,
      });
    }
  }

  function spawnOrder() {
    const recipeId = pick(random, RECIPE_IDS);
    const recipe = RECIPES[recipeId];
    const patienceScale = Math.pow(SHIFT.patienceScalePerLevel, state.level - 1);
    const order = {
      id: state.nextOrderId,
      recipeId,
      patience: recipe.patience * patienceScale,
      patienceMax: recipe.patience * patienceScale,
      remaining: recipe.ingredients.slice(),
      dish: {},
      assembled: false,
      served: false,
      expired: false,
    };
    state.nextOrderId += 1;
    state.orders.push(order);
    if (state.activeOrderId === null) state.activeOrderId = order.id;
    if (state.orders.length > 3) {
      // The rail holds three tickets; the oldest beyond that is dropped as a missed order.
      let oldestIndex = -1;
      let oldestPatience = Infinity;
      for (let index = 0; index < state.orders.length; index += 1) {
        const candidate = state.orders[index];
        if (!candidate.served && !candidate.expired && candidate.patience < oldestPatience) {
          oldestPatience = candidate.patience;
          oldestIndex = index;
        }
      }
      if (oldestIndex >= 0) missOrder(state.orders[oldestIndex]);
    }
  }

  function addIngredient(ingredient, quality) {
    const order = activeOrder();
    if (!order) return false;
    const index = order.remaining.indexOf(ingredient);
    if (index < 0) {
      // The dish already has it (or it was never part of it): tolerate and keep the item.
      state.shake = 0.25;
      return false;
    }
    order.remaining.splice(index, 1);
    order.dish[ingredient] = quality;
    if (order.remaining.length === 0) {
      order.assembled = true;
    }
    return true;
  }

  function serveOrder(order) {
    const recipe = RECIPES[order.recipeId];
    const timeFactor = clamp(order.patience / order.patienceMax, 0, 1);
    let qualitySum = 0;
    let qualityCount = 0;
    for (const ingredient of recipe.ingredients) {
      const quality = ingredient in order.dish ? order.dish[ingredient] : 1;
      qualitySum += quality;
      qualityCount += 1;
    }
    const quality = qualityCount > 0 ? qualitySum / qualityCount : 1;
    const perfect = quality >= 1.9;
    const tip = Math.round(recipe.price * (0.15 + 0.5 * timeFactor) + quality * 3);
    const now = state.elapsed;
    state.combo = now - state.lastServeAt <= PLAYER.comboWindow ? state.combo + 1 : 1;
    state.lastServeAt = now;
    if (state.combo > state.bestCombo) state.bestCombo = state.combo;
    const multiplier = 1 + Math.min(state.combo - 1, 5) * 0.12;
    const gained = Math.round((recipe.price + tip) * multiplier);
    state.score += gained;
    state.served += 1;
    order.served = true;
    const pass = LAYOUT.stations.pass;
    pushFloating(`+${gained}`, pass.x + pass.w / 2, pass.y - 8, '#f6e7bd');
    if (state.combo > 1) pushFloating(`COMBO x${state.combo}`, pass.x + pass.w / 2, pass.y - 40, '#eab56a');
    burst(pass.x + pass.w / 2, pass.y + 90, '#eab56a', 18);
    if (state.served >= SHIFT.ordersToServe) {
      state.won = true;
      state.over = true;
      return perfect ? (EVENT_SERVE | EVENT_SERVE_PERFECT | EVENT_WIN) : (EVENT_SERVE | EVENT_WIN);
    }
    if (state.activeOrderId === order.id) chooseActive();
    return perfect ? (EVENT_SERVE | EVENT_SERVE_PERFECT) : EVENT_SERVE;
  }

  function missOrder(order) {
    order.expired = true;
    state.hearts -= 1;
    state.combo = 0;
    const rail = LAYOUT.orders;
    pushFloating('MISSED', rail.x + rail.w / 2, rail.y + rail.h + 18, '#e5694f');
    burst(rail.x + rail.w / 2, rail.y + 40, '#e5694f', 10);
    if (state.activeOrderId === order.id) chooseActive();
    if (state.hearts <= 0) {
      state.over = true;
      state.won = false;
    }
  }

  function startCook() {
    state.stove.active = true;
    state.stove.ingredient = state.held;
    state.stove.progress = 0;
    state.stove.phase = 'cooking';
    state.held = null;
  }

  function liftCook() {
    const quality = cookQuality(state.stove.progress);
    const ingredient = state.stove.ingredient;
    state.stove.active = false;
    state.stove.ingredient = null;
    state.stove.progress = 0;
    state.stove.phase = 'idle';
    if (addIngredient(ingredient, quality)) {
      const stove = LAYOUT.stations.stove;
      if (quality === 2) {
        burst(stove.x + stove.w / 2, stove.y + 70, '#8fd69a', 14);
        pushFloating('PERFECT', stove.x + stove.w / 2, stove.y + 24, '#8fd69a');
      } else if (quality === 0) {
        pushFloating('BURNT', stove.x + stove.w / 2, stove.y + 24, '#d6493f');
        state.shake = 0.2;
      }
      return quality >= 1 ? EVENT_COOK_GOOD : EVENT_COOK_START;
    }
    return EVENT_ERROR;
  }

  /**
   * Apply one intent. Returns event flags; 0 when the intent changed nothing visible.
   */
  function act(intent) {
    if (state.over) return 0;
    if (intent.type === 'select') {
      state.selected = intent.ingredient;
      state.held = intent.ingredient;
      return 0;
    }
    if (intent.type === 'station') {
      if (intent.station === 'stove' && state.stove.active) return liftCook();
      if (state.held === null) {
        state.shake = 0.15;
        return EVENT_ERROR;
      }
      const prep = INGREDIENTS[state.held].prep;
      if (intent.station === 'board' && prep === PREP_CHOP) {
        const board = LAYOUT.stations.board;
        const ingredient = state.held;
        state.held = null;
        if (addIngredient(ingredient, 2)) {
          burst(board.x + board.w / 2, board.y + 90, '#c9e6a8', 12);
          return EVENT_CHOP;
        }
        return EVENT_ERROR;
      }
      if (intent.station === 'stove' && prep === PREP_COOK) {
        startCook();
        return EVENT_COOK_START;
      }
      state.shake = 0.2;
      return EVENT_ERROR;
    }
    if (intent.type === 'serve') {
      const order = activeOrder();
      if (!order) return EVENT_ERROR;
      if (order.assembled) return serveOrder(order);
      state.shake = 0.15;
      return EVENT_ERROR;
    }
    return 0;
  }

  /** One fixed step. Returns event flags for things that happened during the tick. */
  function step(dt) {
    let events = 0;
    if (state.over) return events;

    state.elapsed += dt;
    state.level = Math.min(8, 1 + Math.floor(state.elapsed / 18));

    state.orderTimer -= dt;
    if (state.orderTimer <= 0) {
      spawnOrder();
      const interval = Math.max(SHIFT.orderIntervalMin, SHIFT.orderInterval * Math.pow(SHIFT.orderIntervalScale, state.level - 1));
      state.orderTimer += interval;
    }

    for (let index = state.orders.length - 1; index >= 0; index -= 1) {
      const order = state.orders[index];
      if (order.served || order.expired) continue;
      order.patience -= dt;
      if (order.patience <= 0) {
        missOrder(order);
        events |= EVENT_MISS;
      }
    }
    state.orders = state.orders.filter((order) => !order.served && !order.expired);

    if (state.stove.active) {
      state.stove.progress += dt / STOVE.cookSeconds;
      if (state.stove.progress >= 1) {
        events |= liftCook();
      }
    }

    for (let index = state.particles.length - 1; index >= 0; index -= 1) {
      const particle = state.particles[index];
      particle.age += dt;
      if (particle.age >= particle.life) {
        state.particles.splice(index, 1);
        continue;
      }
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 320 * dt;
    }
    for (let index = state.floating.length - 1; index >= 0; index -= 1) {
      const item = state.floating[index];
      item.age += dt;
      item.y -= 46 * dt;
      if (item.age >= 1.1) state.floating.splice(index, 1);
    }
    state.shake = Math.max(0, state.shake - dt * 2.2);
    state.flash = Math.max(0, state.flash - dt * 3);

    if (state.over && !state.won) events |= EVENT_OVER;
    return events;
  }

  function reset() {
    state.elapsed = 0;
    state.level = 1;
    state.score = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.hearts = SHIFT.hearts;
    state.served = 0;
    state.over = false;
    state.won = false;
    state.held = null;
    state.selected = null;
    state.activeOrderId = null;
    state.nextOrderId = 1;
    state.orderTimer = 1.4;
    state.lastServeAt = -Infinity;
    state.orders = [];
    state.stove = { active: false, ingredient: null, progress: 0, phase: 'idle' };
    state.particles = [];
    state.floating = [];
    state.shake = 0;
    state.flash = 0;
  }

  reset();
  return { state, reset, step, act };
}
