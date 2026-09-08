// Data-driven weapon table. Every weapon in the arsenal is one plain object here;
// `weapon.ts` reads these fields and nothing else, so adding a gun means adding a
// row — no new class. Numbers are tuned by ear against well-known shooters
// (Counter-Strike / Battlefield / Call of Duty / Doom), not a real ballistics model.
//
// damage      base damage per bullet, before range falloff
// pellets     bullets fired per trigger pull (1 = normal, >1 = buckshot)
// mag         rounds per magazine
// reserve     rounds carried outside the magazine
// rpm         cyclic rate, rounds/minute (gates the fire loop)
// reloadTime  seconds; for shellReload it is the time per single shell
// shellReload true = reload one shell at a time, interruptible by firing (pump/lever guns)
// modes       allowed fire modes, cycled with B — 'auto' | 'semi' | 'burst' | 'pump'
// burst       shots per burst when the active mode is 'burst'
// spread      aim-cone in degrees: base + bloom per shot, capped at max, recovers max*... per s
// recoil      view kick: up/side degrees per shot, punch = viewmodel shove, recover per s
// falloff     damage scaling by distance in metres: full <= start, min multiplier >= end
// audio       procedural voice: pitch multiplier and low-end body amount
// view        viewmodel placement: hip offset [x,y,z], ADS offset, ADS fov

export const WEAPONS = [
  {
    id: 'ar',
    name: 'AR-15',
    kind: 'Fuzil de assalto',
    damage: 25,
    pellets: 1,
    mag: 30,
    reserve: 150,
    rpm: 750,
    reloadTime: 2.4,
    shellReload: false,
    modes: ['auto', 'semi'],
    burst: 3,
    spread: { base: 0.55, bloom: 0.5, max: 4.2, recover: 9 },
    recoil: { up: 1.25, side: 0.5, punch: 0.16, recover: 8, kickback: 0.05 },
    falloff: { start: 30, end: 70, min: 0.45 },
    audio: { pitch: 1.0, body: 0.9 },
    view: { pos: [0.15, -0.14, -0.40], adsPos: [0.0, -0.085, -0.28], adsFov: 52 },
  },
  {
    id: 'pistol',
    name: 'M1911',
    kind: 'Pistola',
    damage: 34,
    pellets: 1,
    mag: 7,
    reserve: 63,
    rpm: 430,
    reloadTime: 1.9,
    shellReload: false,
    modes: ['semi'],
    burst: 3,
    spread: { base: 0.5, bloom: 0.85, max: 3.4, recover: 12 },
    recoil: { up: 2.0, side: 0.7, punch: 0.22, recover: 10, kickback: 0.06 },
    falloff: { start: 18, end: 45, min: 0.4 },
    audio: { pitch: 1.35, body: 0.6 },
    view: { pos: [0.13, -0.13, -0.34], adsPos: [0.0, -0.08, -0.25], adsFov: 58 },
  },
  {
    id: 'shotgun',
    name: 'M870',
    kind: 'Escopeta pump',
    damage: 11,
    pellets: 8,
    mag: 6,
    reserve: 40,
    rpm: 75,
    reloadTime: 0.55,
    shellReload: true,
    modes: ['pump'],
    burst: 3,
    spread: { base: 3.1, bloom: 0.15, max: 5.5, recover: 6 },
    recoil: { up: 3.4, side: 0.6, punch: 0.42, recover: 6, kickback: 0.12 },
    falloff: { start: 8, end: 26, min: 0.15 },
    audio: { pitch: 0.82, body: 1.35 },
    view: { pos: [0.15, -0.15, -0.42], adsPos: [0.03, -0.11, -0.32], adsFov: 62 },
  },
];

export const byId = (id) => WEAPONS.find((w) => w.id === id) || WEAPONS[0];
