// Small synthesized sound: every effect is a few oscillator blips, so the game ships no audio
// files and loads nothing. The AudioContext is created lazily on the first user gesture (browsers
// mute it otherwise), and every call is guarded, so a missing or blocked context never breaks play.

let context = null;
let master = null;
let muted = false;

function ensure() {
  if (context) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    context = new AudioContextClass();
    master = context.createGain();
    master.gain.value = 0.5;
    master.connect(context.destination);
  } catch {
    context = null;
  }
}

function tone(frequency, start, duration, type, gain) {
  if (!context || muted) return;
  try {
    const osc = context.createOscillator();
    const env = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, context.currentTime + start);
    env.gain.setValueAtTime(0.0001, context.currentTime + start);
    env.gain.exponentialRampToValueAtTime(gain, context.currentTime + start + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + start + duration);
    osc.connect(env);
    env.connect(master);
    osc.start(context.currentTime + start);
    osc.stop(context.currentTime + start + duration + 0.02);
  } catch {
    // A blocked or closed context is never an error the game cares about.
  }
}

function noise(duration, gain) {
  if (!context || muted) return;
  try {
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / length);
    const source = context.createBufferSource();
    const env = context.createGain();
    env.gain.value = gain;
    const filter = context.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 900;
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(env);
    env.connect(master);
    source.start();
  } catch {
    // Ignored, as above.
  }
}

/** Call from a pointer or key handler: browsers need a gesture before sound may start. */
export function unlock() {
  ensure();
  if (context && context.state === 'suspended') {
    context.resume().catch(() => {});
  }
}

export function setMuted(value) {
  muted = value;
}

export function chop() {
  ensure();
  tone(320, 0, 0.07, 'square', 0.16);
  tone(160, 0.015, 0.09, 'square', 0.12);
  noise(0.06, 0.12);
}

export function sizzle() {
  ensure();
  noise(0.5, 0.05);
}

export function plate() {
  ensure();
  tone(520, 0, 0.08, 'triangle', 0.18);
  tone(780, 0.05, 0.1, 'triangle', 0.14);
}

export function serve(perfect) {
  ensure();
  if (perfect) {
    tone(660, 0, 0.1, 'triangle', 0.2);
    tone(880, 0.08, 0.12, 'triangle', 0.2);
    tone(1320, 0.16, 0.2, 'triangle', 0.16);
  } else {
    tone(440, 0, 0.09, 'triangle', 0.18);
    tone(660, 0.07, 0.12, 'triangle', 0.16);
  }
}

export function error() {
  ensure();
  tone(140, 0, 0.14, 'sawtooth', 0.12);
}

export function miss() {
  ensure();
  tone(220, 0, 0.18, 'sawtooth', 0.12);
  tone(180, 0.12, 0.24, 'sawtooth', 0.1);
}

export function tick() {
  ensure();
  tone(880, 0, 0.05, 'square', 0.06);
}

export function fanfare() {
  ensure();
  tone(523, 0, 0.12, 'triangle', 0.16);
  tone(659, 0.11, 0.12, 'triangle', 0.16);
  tone(784, 0.22, 0.2, 'triangle', 0.18);
  tone(1047, 0.34, 0.32, 'triangle', 0.16);
}
