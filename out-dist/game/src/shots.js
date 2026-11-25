// The screenshot scenes behind ?shot=start|play|end. Each one plays the real rules forward from
// world.reset(), steered by a simple greedy autopilot (finish the current order's ingredients in
// recipe order, prep them at the correct station, plate, then serve), so the frame is what a
// short game really looks like and the same seed always gives the same frame.

import { STEP, STOVE } from './config.js';
import { INGREDIENTS, prepStation } from './recipes.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 35;
const END_LIMIT_SECONDS = 90;

function sameSet(left, right) {
  if (left.length !== right.length) return false;
  const a = left.slice().sort();
  const b = right.slice().sort();
  for (let index = 0; index < a.length; index += 1) if (a[index] !== b[index]) return false;
  return true;
}

/** One step of intent for the autopilot, decided from the current world state. */
function autopilotActions(state) {
  const actions = { take: [], placeAt: [], plate: false, serve: false, removeLast: false };
  const order = state.orders[0];
  if (!order) return actions;
  const stove = state.stations.stove;
  const plate = state.boardPlate;

  // Finish a cooking item as soon as it enters the perfect window.
  if (stove.active) {
    if (stove.fire >= STOVE.perfectMin) actions.placeAt.push('stove');
    return actions;
  }
  if (state.hand !== null) {
    actions.placeAt.push(prepStation(INGREDIENTS[state.hand].prep));
    return actions;
  }
  if (plate.prepped.length > 0) {
    actions.plate = true;
    return actions;
  }
  if (sameSet(plate.raw, order.recipe.ingredients)) {
    actions.serve = true;
    return actions;
  }
  const missing = order.recipe.ingredients.find(
    (id) => !plate.raw.includes(id) && !plate.prepped.includes(id),
  );
  if (missing) {
    actions.take.push(missing);
    return actions;
  }
  return actions;
}

function run(world, seconds) {
  const steps = Math.round(seconds / STEP);
  for (let index = 0; index < steps; index += 1) {
    if (world.state.over) break;
    world.step(STEP, autopilotActions(world.state));
  }
}

/** Set `world` to the named scene and return the screen to draw over it plus the best to show. */
export function stageShot(name, world, seconds) {
  world.reset();
  if (name === 'play') {
    run(world, seconds ?? PLAY_SECONDS);
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'end') {
    run(world, seconds ?? END_LIMIT_SECONDS);
    return { screen: world.state.over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  run(world, seconds ?? START_SECONDS);
  return { screen: SCREEN_TITLE, best: 0 };
}
