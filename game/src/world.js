// Pure rules and state for Moonlit Mise: the pantry, the held ingredient, the two prep stations,
// the dish being assembled and the order rail. step(dt, actions) advances one fixed 1/60 s tick
// and returns event bit flags so main.js can play sounds and announce changes without the world
// knowing about screens or audio. No drawing or browser code lives here.

import { LAYOUT, PALETTE, PLAYER, SHIFT, STOVE } from './config.js';
import { INGREDIENTS, RECIPES, RECIPE_IDS, prepStation } from './recipes.js';
import { pick } from './random.js';

export const EVENT_CHOP = 1;
export const EVENT_COOK = 2;
export const EVENT_COOK_DONE = 4;
export const EVENT_PLATE = 8;
export const EVENT_SERVE = 16;
export const EVENT_MISS = 32;
export const EVENT_ERROR = 64;
export const EVENT_OVER = 128;
export const EVENT_WIN = 256;

/** Cook quality: 2 perfect, 1 acceptable, 0 undercooked or burnt. */
function cookQuality(fire) {
  if (fire >= STOVE.perfectMin && fire <= STOVE.perfectMax) return 2;
  if (fire >= STOVE.okMin && fire <= STOVE.okMax) return 1;
  return 0;
}

/** The bill adjustment each quality tier adds, on top of the recipe price and combo tip. */
const QUALITY_TIP = { 0: -2, 1: 1, 2: 2 };

/** Two small sets of ingredient ids match when they hold the same ids, in any order. */
function sameSet(left, right) {
  if (left.length !== right.length) return false;
  const a = left.slice().sort();
  const b = right.slice().sort();
  for (let index = 0; index < a.length; index += 1) if (a[index] !== b[index]) return false;
  return true;
}

export function createWorld(random) {
  const state = {
    phase: 'title',
    paused: false,
    over: false,
    won: false,
    elapsed: 0,
    level: 1,
    score: 0,
    combo: 0,
    bestCombo: 0,
    comboTimer: 0,
    hearts: SHIFT.hearts,
    served: 0,
    hand: null,
    boardPlate: { prepped: [], raw: [] },
    qualities: {},
    stations: {
      board: { active: false, progress: 0 },
      stove: { active: false, ingredient: null, fire: 0 },
    },
    orders: [],
    orderTimer: 0,
    timeLeft: 0,
    flashGood: 0,
    flashBad: 0,
    shake: 0,
    floating: [],
    particles: [],
  };

  function activeOrder() {
    return state.orders.length > 0 ? state.orders[0] : null;
  }

  function refreshTimeLeft() {
    const order = activeOrder();
    state.timeLeft = order ? order.patience : 0;
  }

  function orderInterval() {
    return Math.max(
      SHIFT.orderIntervalMin,
      SHIFT.orderInterval * Math.pow(SHIFT.orderIntervalScale, state.level - 1),
    );
  }

  function spawnOrder() {
    if (state.orders.length >= LAYOUT.orders.slots) return false;
    const recipeId = pick(random, RECIPE_IDS);
    const recipe = RECIPES[recipeId];
    const patienceScale = Math.pow(SHIFT.patienceScalePerLevel, state.level - 1);
    const patience = recipe.patience * patienceScale;
    state.orders.push({ recipeId, recipe, patience, patienceMax: patience });
    refreshTimeLeft();
    return true;
  }

  function pushFloating(text, x, y, color) {
    state.floating.push({ text, x, y, color, age: 0 });
  }

  function burst(x, y, color, count) {
    for (let index = 0; index < count; index += 1) {
      const angle = random() * Math.PI * 2;
      const speed = 50 + random() * 130;
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        age: 0,
        life: 0.35 + random() * 0.45,
        color,
        size: 2 + random() * 3,
      });
    }
  }

  function stationCenter(name) {
    const rect = LAYOUT.stations[name];
    return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
  }

  function finishCook() {
    const stove = state.stations.stove;
    const ingredient = stove.ingredient;
    const quality = cookQuality(stove.fire);
    stove.active = false;
    stove.ingredient = null;
    stove.fire = 0;
    if (ingredient !== null) {
      state.qualities[ingredient] = quality;
      state.boardPlate.prepped.push(ingredient);
      const center = stationCenter('stove');
      if (quality === 2) {
        pushFloating('PERFECT', center.x, center.y - 20, PALETTE.good);
        burst(center.x, center.y + 40, PALETTE.good, 10);
      } else if (quality === 1) {
        pushFloating('OK', center.x, center.y - 20, PALETTE.copperLight);
      } else {
        pushFloating('BURNT', center.x, center.y - 20, PALETTE.warn);
        state.flashBad = 0.6;
        state.shake = 0.18;
      }
    }
    return EVENT_COOK_DONE;
  }

  function placeAt(station) {
    if (station === 'board') {
      if (state.hand === null) return EVENT_ERROR;
      if (prepStation(INGREDIENTS[state.hand].prep) !== 'board') return EVENT_ERROR;
      const ingredient = state.hand;
      state.hand = null;
      state.qualities[ingredient] = 2;
      state.boardPlate.prepped.push(ingredient);
      state.stations.board.active = true;
      state.stations.board.progress = 1;
      const center = stationCenter('board');
      burst(center.x, center.y + 60, PALETTE.good, 8);
      return EVENT_CHOP;
    }
    if (station === 'stove') {
      if (state.stations.stove.active) return finishCook();
      if (state.hand === null) return EVENT_ERROR;
      if (prepStation(INGREDIENTS[state.hand].prep) !== 'stove') return EVENT_ERROR;
      state.stations.stove.active = true;
      state.stations.stove.ingredient = state.hand;
      state.stations.stove.fire = 0;
      state.hand = null;
      return EVENT_COOK;
    }
    return EVENT_ERROR;
  }

  function plateDish() {
    if (state.boardPlate.prepped.length === 0) return EVENT_ERROR;
    for (const ingredient of state.boardPlate.prepped) state.boardPlate.raw.push(ingredient);
    state.boardPlate.prepped.length = 0;
    const center = stationCenter('pass');
    pushFloating('PLATED', center.x, center.y - 34, PALETTE.ink);
    return EVENT_PLATE;
  }

  function dishQualityBonus(recipe) {
    let bonus = 0;
    for (const ingredient of recipe.ingredients) {
      const quality = ingredient in state.qualities ? state.qualities[ingredient] : 2;
      bonus += QUALITY_TIP[quality];
    }
    return bonus;
  }

  function serveDish() {
    const raw = state.boardPlate.raw;
    if (raw.length === 0) return EVENT_ERROR;
    let matched = -1;
    for (let index = 0; index < state.orders.length; index += 1) {
      if (sameSet(raw, state.orders[index].recipe.ingredients)) {
        matched = index;
        break;
      }
    }
    if (matched === -1) {
      state.flashBad = 0.5;
      state.shake = 0.15;
      return EVENT_ERROR;
    }

    const order = state.orders[matched];
    const recipe = order.recipe;
    const tip = state.combo;
    const gained = Math.max(1, recipe.price + tip + dishQualityBonus(recipe));
    state.score += gained;
    state.combo += 1;
    if (state.combo > state.bestCombo) state.bestCombo = state.combo;
    state.comboTimer = PLAYER.comboWindow;
    state.served += 1;
    state.orders.splice(matched, 1);
    state.boardPlate = { prepped: [], raw: [] };
    state.qualities = {};
    state.flashGood = 1;

    const center = stationCenter('pass');
    pushFloating(`+${gained}`, center.x, center.y - 18, PALETTE.ink);
    if (state.combo > 1) pushFloating(`COMBO x${state.combo}`, center.x, center.y - 52, PALETTE.copperLight);
    burst(center.x, center.y + 70, PALETTE.copperLight, 16);
    refreshTimeLeft();
    return EVENT_SERVE;
  }

  function removeLast() {
    if (state.boardPlate.raw.length > 0) {
      state.boardPlate.raw.pop();
      return EVENT_PLATE;
    }
    if (state.boardPlate.prepped.length > 0) {
      const ingredient = state.boardPlate.prepped.pop();
      delete state.qualities[ingredient];
      return EVENT_PLATE;
    }
    return EVENT_ERROR;
  }

  function applyActions(actions) {
    let events = 0;
    if (!actions) return events;
    if (actions.removeLast) events |= removeLast();
    if (Array.isArray(actions.take)) {
      for (const ingredient of actions.take) {
        if (state.hand === null && INGREDIENTS[ingredient]) state.hand = ingredient;
      }
    }
    if (Array.isArray(actions.placeAt)) {
      for (const station of actions.placeAt) events |= placeAt(station);
    }
    if (actions.plate) events |= plateDish();
    if (actions.serve) events |= serveDish();
    return events;
  }

  function missOrder(order) {
    state.hearts -= 1;
    state.combo = 0;
    state.comboTimer = 0;
    state.flashBad = 1;
    state.shake = 0.2;
    const rect = LAYOUT.orders;
    pushFloating('MISSED', rect.x + rect.w / 2, rect.y + rect.h + 14, PALETTE.warn);
    burst(rect.x + rect.w / 2, rect.y + rect.h / 2, PALETTE.warn, 10);
    refreshTimeLeft();
  }

  /** One fixed step. `actions` is the one-shot intent from input, or an empty object. */
  function step(dt, actions) {
    let events = 0;
    if (state.over) return events;

    state.elapsed += dt;
    state.level = 1 + Math.floor(state.elapsed / SHIFT.orderInterval);
    events |= applyActions(actions);

    for (let index = state.orders.length - 1; index >= 0; index -= 1) {
      const order = state.orders[index];
      order.patience -= dt;
      if (order.patience <= 0) {
        missOrder(order);
        state.orders.splice(index, 1);
        events |= EVENT_MISS;
      }
    }

    state.orderTimer -= dt;
    if (state.orderTimer <= 0) {
      spawnOrder();
      state.orderTimer += orderInterval();
    }

    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) {
        state.combo = 0;
        state.comboTimer = 0;
      }
    }

    if (state.stations.stove.active) {
      state.stations.stove.fire += dt / STOVE.cookSeconds;
      if (state.stations.stove.fire >= 1) events |= finishCook();
    }

    if (state.stations.board.progress > 0) {
      state.stations.board.progress = Math.max(0, state.stations.board.progress - dt * 3.2);
      if (state.stations.board.progress === 0) state.stations.board.active = false;
    }

    state.flashGood = Math.max(0, state.flashGood - dt * 2.2);
    state.flashBad = Math.max(0, state.flashBad - dt * 2.2);
    state.shake = Math.max(0, state.shake - dt * 2.4);

    for (let index = state.particles.length - 1; index >= 0; index -= 1) {
      const particle = state.particles[index];
      particle.age += dt;
      if (particle.age >= particle.life) {
        state.particles.splice(index, 1);
        continue;
      }
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 300 * dt;
    }
    for (let index = state.floating.length - 1; index >= 0; index -= 1) {
      const item = state.floating[index];
      item.age += dt;
      item.y -= 42 * dt;
      if (item.age >= 1.15) state.floating.splice(index, 1);
    }

    refreshTimeLeft();
    if (!state.over && (state.served >= SHIFT.ordersToServe || state.hearts <= 0)) {
      state.over = true;
      state.phase = 'over';
      state.won = state.served >= SHIFT.ordersToServe;
      events |= EVENT_OVER;
      if (state.won) events |= EVENT_WIN;
    }
    return events;
  }

  function reset() {
    state.phase = 'title';
    state.paused = false;
    state.over = false;
    state.won = false;
    state.elapsed = 0;
    state.level = 1;
    state.score = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.comboTimer = 0;
    state.hearts = SHIFT.hearts;
    state.served = 0;
    state.hand = null;
    state.boardPlate = { prepped: [], raw: [] };
    state.qualities = {};
    state.stations = {
      board: { active: false, progress: 0 },
      stove: { active: false, ingredient: null, fire: 0 },
    };
    state.orders = [];
    state.orderTimer = 0;
    state.timeLeft = 0;
    state.flashGood = 0;
    state.flashBad = 0;
    state.shake = 0;
    state.floating = [];
    state.particles = [];
    spawnOrder();
    state.orderTimer = orderInterval();
  }

  reset();
  return { state, reset, step };
}
