import { stage } from "./stage";

/**
 * Opt-in sound, synthesised in the browser: no audio files to download.
 * Nothing is created until the visitor switches sound on.
 *
 *   beds     rain, the Flow fan, the UV hum and the lift motor, mixed per frame
 *   one-shots  the click of a module seating, a soft chime for voice control
 */

type Beds = { rain: GainNode; fan: GainNode; uv: GainNode; motor: GainNode; fanTone: BiquadFilterNode };

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let beds: Beds | null = null;
let noiseBuffer: AudioBuffer | null = null;

function noise(c: AudioContext) {
  if (noiseBuffer) return noiseBuffer;
  const buffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buffer;
  return buffer;
}

function noiseBed(c: AudioContext, out: AudioNode, type: BiquadFilterType, freq: number, q: number) {
  const src = c.createBufferSource();
  src.buffer = noise(c);
  src.loop = true;
  const filter = c.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const gain = c.createGain();
  gain.gain.value = 0;
  src.connect(filter).connect(gain).connect(out);
  src.start();
  return { gain, filter };
}

function toneBed(c: AudioContext, out: AudioNode, freqs: number[], type: OscillatorType) {
  const gain = c.createGain();
  gain.gain.value = 0;
  for (const f of freqs) {
    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.value = f;
    osc.connect(gain);
    osc.start();
  }
  gain.connect(out);
  return gain;
}

function start() {
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  const c = new Ctor();
  ctx = c;
  master = c.createGain();
  master.gain.value = 0;
  master.connect(c.destination);

  const rain = noiseBed(c, master, "highpass", 1800, 0.4);
  const fan = noiseBed(c, master, "bandpass", 420, 0.7);
  beds = {
    rain: rain.gain,
    fan: fan.gain,
    fanTone: fan.filter,
    // two close sines beat slowly against each other
    uv: toneBed(c, master, [110, 111.5, 220.4], "sine"),
    motor: toneBed(c, master, [92, 184.6], "triangle"),
  };
}

export const sfx = {
  /** Switch sound on or off. Must be called from a user gesture the first time. */
  async enable(on: boolean) {
    stage.sound = on;
    if (on && !ctx) start();
    if (!ctx || !master) return;
    if (on && ctx.state === "suspended") await ctx.resume();
    master.gain.setTargetAtTime(on ? 0.9 : 0, ctx.currentTime, 0.15);
  },

  /** Per-frame mix. Levels are 0‥1. */
  mix(level: { rain: number; fan: number; gust: number; uv: number; motor: number }) {
    if (!ctx || !beds || !stage.sound) return;
    const now = ctx.currentTime;
    beds.rain.gain.setTargetAtTime(level.rain * 0.05, now, 0.2);
    beds.fan.gain.setTargetAtTime(level.fan * 0.16, now, 0.2);
    beds.fanTone.frequency.setTargetAtTime(360 + 260 * level.gust, now, 0.3);
    beds.uv.gain.setTargetAtTime(level.uv * 0.035, now, 0.3);
    beds.motor.gain.setTargetAtTime(Math.min(1, level.motor) * 0.03, now, 0.08);
  },

  /** A module seating in the frame. */
  click() {
    if (!ctx || !master || !stage.sound) return;
    const c = ctx;
    const now = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = noise(c);
    const filter = c.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 2400;
    filter.Q.value = 2.5;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    src.connect(filter).connect(gain).connect(master);
    src.start(now);
    src.stop(now + 0.08);

    // the body of the click: a short low knock
    const osc = c.createOscillator();
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.09);
    const body = c.createGain();
    body.gain.setValueAtTime(0.35, now);
    body.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(body).connect(master);
    osc.start(now);
    osc.stop(now + 0.14);
  },

  /** Acknowledgement when voice control hears a command. */
  chime() {
    if (!ctx || !master || !stage.sound) return;
    const c = ctx;
    const now = c.currentTime;
    [660, 990].forEach((f, i) => {
      const osc = c.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      const gain = c.createGain();
      const at = now + i * 0.11;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.12, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.5);
      osc.connect(gain).connect(master!);
      osc.start(at);
      osc.stop(at + 0.55);
    });
  },
};
