// @ts-nocheck
// Every weapon sound is synthesised with the Web Audio API — there are no
// audio files in this project. A shot is a filtered noise burst + a sub thump
// + a short reverb tail; mechanical sounds are tiny band-passed noise clicks.
// Per-weapon `audio.pitch` / `audio.body` shift the voice (pistol tight and
// high, shotgun low and heavy). The context is created on the first user
// gesture (controller calls resume() when the player clicks to engage).

export function createWeaponAudio() {
  let ctx = null;
  let master = null;
  let verb = null;
  let noise = null;

  function ensure() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);

    // short generated "outdoor" tail so shots don't sound bone dry
    verb = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 0.32);
    const imp = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = imp.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    verb.buffer = imp;
    const verbGain = ctx.createGain();
    verbGain.gain.value = 0.28;
    verb.connect(verbGain).connect(master);
    verb._send = verbGain;

    const nlen = ctx.sampleRate;
    noise = ctx.createBuffer(1, nlen, ctx.sampleRate);
    const nd = noise.getChannelData(0);
    for (let i = 0; i < nlen; i++) nd[i] = Math.random() * 2 - 1;
  }

  const src = (rate = 1) => {
    const s = ctx.createBufferSource();
    s.buffer = noise;
    s.playbackRate.value = rate;
    s.loop = true;
    return s;
  };
  const ramp = (param, t, peak, atk, dec) => {
    param.setValueAtTime(0.0001, t);
    param.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + atk);
    param.exponentialRampToValueAtTime(0.0001, t + atk + dec);
  };

  function resume() {
    ensure();
    if (ctx.state === 'suspended') ctx.resume();
  }

  function shot(cfg) {
    if (!ctx) return;
    const p = cfg.audio.pitch, body = cfg.audio.body;
    const t = ctx.currentTime;
    const jitter = 0.94 + Math.random() * 0.12;

    // main body: noise through a fast-closing lowpass
    const n = src(jitter * p);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(6500 * p, t);
    lp.frequency.exponentialRampToValueAtTime(600, t + 0.09);
    lp.Q.value = 1.1;
    const ng = ctx.createGain();
    ramp(ng.gain, t, 0.9, 0.001, 0.09 / p);
    n.connect(lp).connect(ng);
    ng.connect(master);
    ng.connect(verb);

    // crack: bright highpass snap
    const c = src(1.3);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 3500;
    const cg = ctx.createGain();
    ramp(cg.gain, t, 0.35, 0.0005, 0.03);
    c.connect(hp).connect(cg).connect(master);

    // sub thump
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(95 * p, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    const og = ctx.createGain();
    ramp(og.gain, t, 0.6 * body, 0.002, 0.14);
    o.connect(og).connect(master);

    n.start(t); c.start(t); o.start(t);
    n.stop(t + 0.2); c.stop(t + 0.06); o.stop(t + 0.2);
  }

  function click(freq, q, peak, dec, rate = 1, delay = 0) {
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const n = src(rate);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = q;
    const g = ctx.createGain();
    ramp(g.gain, t, peak, 0.0005, dec);
    n.connect(bp).connect(g).connect(master);
    n.start(t); n.stop(t + dec + 0.02);
  }

  const dry = () => click(2600, 6, 0.22, 0.02, 1.2);
  const mode = () => click(1800, 8, 0.16, 0.02, 1);
  const shell = (cfg) => click(1200 * cfg.audio.pitch, 5, 0.3, 0.03);
  const pump = (cfg) => { click(900, 6, 0.28, 0.04, 1, 0); click(1300, 7, 0.24, 0.035, 1, 0.14); };

  function magReload(cfg, time) {
    click(1400, 5, 0.26, 0.03, 1, 0.10);          // mag out
    click(900, 6, 0.34, 0.045, 0.9, time * 0.55);  // mag seated
    click(2100, 7, 0.3, 0.03, 1.1, time * 0.82);   // charging handle
  }

  function dispose() { ctx?.close?.(); ctx = null; }

  return { resume, shot, dry, mode, shell, pump, magReload, dispose };
}
