// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one) and the renderer paints what is there. The game
// moves between title, play and over screens. ?seed=N fixes the order pattern; ?shot=start|play|end
// stages that scene instead of running the loop, paints it twice and sets window.__shotReady.

import { SHIFT, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_CHOP, EVENT_COOK, EVENT_COOK_DONE, EVENT_ERROR, EVENT_MISS, EVENT_OVER, EVENT_PLATE, EVENT_SERVE } from './world.js';
import { createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const BEST_KEY = 'moonlit-mise-best';
const MAX_FRAME = 0.25;
const EMPTY_ACTIONS = { take: [], placeAt: [], plate: false, serve: false, removeLast: false };

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);
const timeParam = Number.parseFloat(params.get('t') ?? '');
const shotSeconds = Number.isFinite(timeParam) ? Math.max(0, timeParam) : undefined;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world, shotSeconds);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  const audio = createAudio();
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let paused = false;

  function announce(message) {
    status.textContent = message;
  }

  window.addEventListener('pointerdown', () => audio.unlock());
  window.addEventListener('keydown', () => audio.unlock());

  function startGame() {
    world.reset();
    world.state.phase = SCREEN_PLAY;
    screen = SCREEN_PLAY;
    paused = false;
    accumulator = 0;
    announce(`Shift started. Serve ${SHIFT.ordersToServe} orders.`);
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(world.state.won
      ? `Shift complete. Score ${world.state.score}. Best ${best}.`
      : `Out of hearts. Score ${world.state.score}. Best ${best}.`);
  }

  function playSounds(events) {
    if (events & EVENT_CHOP) audio.play('chop');
    if (events & EVENT_COOK) audio.play('cook');
    if (events & EVENT_COOK_DONE) audio.play('plate');
    if (events & EVENT_PLATE) audio.play('plate');
    if (events & EVENT_SERVE) audio.play('serve');
    if (events & EVENT_MISS) audio.play('miss');
    if (events & EVENT_ERROR) audio.play('miss');
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;

    const actions = input.takeActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      if (actions.confirm) startGame();
      accumulator = 0;
    } else if (actions.pause) {
      paused = !paused;
      announce(paused ? 'Paused.' : 'Playing.');
      accumulator = 0;
    } else if (!paused) {
      let pending = actions;
      while (accumulator >= STEP) {
        const events = world.step(STEP, pending);
        if (events) playSounds(events);
        pending = EMPTY_ACTIONS;
        accumulator -= STEP;
        if (events & EVENT_OVER) {
          endGame();
          break;
        }
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY && !paused) {
      paused = true;
      announce('Paused.');
    }
  });

  announce('Moonlit Mise. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
