// Tiny synthesized sound: every effect is a few oscillator blips and a noise burst, so the game
// ships no audio files and loads nothing over the network. The AudioContext is created lazily on
// the first user gesture, and every call is guarded, so a missing or blocked context never breaks
// play. createAudio() returns a play(name) interface consumed by main.js.

export function createAudio() {
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
    if (!context || !master || muted) return;
    try {
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, context.currentTime + start);
      envelope.gain.setValueAtTime(0.0001, context.currentTime + start);
      envelope.gain.exponentialRampToValueAtTime(gain, context.currentTime + start + 0.008);
      envelope.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + start + duration);
      oscillator.connect(envelope);
      envelope.connect(master);
      oscillator.start(context.currentTime + start);
      oscillator.stop(context.currentTime + start + duration + 0.02);
    } catch {
      // A closed or blocked context is never an error the game cares about.
    }
  }

  function noise(duration, gain, filterFrequency) {
    if (!context || !master || muted) return;
    try {
      const length = Math.max(1, Math.floor(context.sampleRate * duration));
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let index = 0; index < length; index += 1) {
        data[index] = (Math.random() * 2 - 1) * (1 - index / length);
      }
      const source = context.createBufferSource();
      const envelope = context.createGain();
      const filter = context.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = filterFrequency;
      envelope.gain.value = gain;
      source.buffer = buffer;
      source.connect(filter);
      filter.connect(envelope);
      envelope.connect(master);
      source.start();
    } catch {
      // Ignored, as above.
    }
  }

  /** Play one named effect: chop, cook, plate, serve or miss. Unknown names are silent. */
  function play(name) {
    ensure();
    if (!context) return;
    switch (name) {
      case 'chop':
        noise(0.06, 0.14, 900);
        tone(300, 0, 0.07, 'square', 0.14);
        tone(150, 0.015, 0.09, 'square', 0.1);
        break;
      case 'cook':
        noise(0.45, 0.06, 1200);
        tone(210, 0, 0.3, 'sawtooth', 0.05);
        break;
      case 'plate':
        tone(520, 0, 0.08, 'triangle', 0.18);
        tone(780, 0.05, 0.1, 'triangle', 0.14);
        break;
      case 'serve':
        tone(660, 0, 0.1, 'triangle', 0.2);
        tone(880, 0.08, 0.12, 'triangle', 0.2);
        tone(1320, 0.16, 0.2, 'triangle', 0.16);
        break;
      case 'miss':
        tone(220, 0, 0.18, 'sawtooth', 0.12);
        tone(180, 0.12, 0.24, 'sawtooth', 0.1);
        break;
      default:
        break;
    }
  }

  /** Call from a pointer or key handler: browsers need a gesture before sound may start. */
  function unlock() {
    ensure();
    if (context && context.state === 'suspended') {
      context.resume().catch(() => {});
    }
  }

  function setMuted(value) {
    muted = value;
  }

  return { play, unlock, setMuted };
}
