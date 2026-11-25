// A small seeded random number generator (mulberry32). The same seed gives the same shift, so
// the screenshot scenes and any replay are repeatable and each frame is a real game state.

export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick one element of an array with `random()`; empty arrays are the caller's responsibility. */
export function pick(random, list) {
  return list[Math.floor(random() * list.length)];
}
