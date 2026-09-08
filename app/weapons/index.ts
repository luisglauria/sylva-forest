// @ts-nocheck
// The controller: owns pointer lock and input, holds the Weapon instances, and
// wires each weapon's hooks to the raycast, the viewmodel, the effect pools and
// the synth. Everything below is glue — the behaviour lives in weapon.ts and
// the data lives in configs.ts.
import * as T from 'three';
import { WEAPONS } from './configs';
import { Weapon } from './weapon';
import { createWeaponAudio } from './audio';
import { createEffects } from './effects';
import { createViewmodel } from './viewmodel';

const BASE_FOV = 62;
const SENS = 0.0022;

export function createArsenal(forest, opts = {}) {
  const { scene, camera, canvas, shootables, controls } = forest;
  const onHud = opts.onHud || (() => {});

  scene.add(camera); // so the camera-parented viewmodel renders
  const audio = createWeaponAudio();
  const effects = createEffects(scene);
  const viewmodel = createViewmodel(camera);
  viewmodel.group.visible = false;

  let active = null;
  let activeIndex = -1;
  let engaged = false;
  let softLock = false; // engaged without a real pointer lock (iframes / older browsers)
  let ads = false;
  let hitId = 0;
  let lookDX = 0, lookDY = 0;
  const rec = { yaw: 0, pitch: 0 };
  const lastPos = camera.position.clone();

  const ray = new T.Raycaster();
  ray.far = 220;
  const _o = new T.Vector3();
  const _d = new T.Vector3();
  const _r = new T.Vector3();
  const _up = new T.Vector3(0, 1, 0);
  const _q = new T.Quaternion();
  const _muzzle = new T.Vector3();
  const _nrm = new T.Vector3();

  const weapons = WEAPONS.map((cfg) => new Weapon(cfg, {
    onShot: (s) => resolveShot(cfg, s),
    onFired: (f) => {
      viewmodel.recoil(f.recoil);
      viewmodel.flash();
      audio.shot(cfg);
      if (cfg.modes[0] === 'pump' && !f.last) audio.pump(cfg);
      const kp = f.recoil.up * (Math.PI / 180) * (ads ? 0.55 : 1);
      const ky = (Math.random() - 0.5) * f.recoil.side * 2 * (Math.PI / 180);
      controls.pitch += kp; controls.yaw += ky;
      rec.pitch += kp; rec.yaw += ky;
      pushHud();
    },
    onDryFire: () => audio.dry(),
    onReloadStart: (kind, time) => {
      kind === 'shell' ? audio.shell(cfg) : audio.magReload(cfg, time);
      viewmodel.reload(kind, time);
      pushHud();
    },
    onShellLoaded: () => { audio.shell(cfg); pushHud(); },
    onReloadEnd: () => { viewmodel.endReload(); pushHud(); },
    onModeChange: () => { audio.mode(); pushHud(); },
  }));

  function resolveShot(cfg, s) {
    camera.getWorldPosition(_o);
    camera.getWorldDirection(_d);
    _r.crossVectors(_d, _up).normalize();
    _q.setFromAxisAngle(_r, s.pitch); _d.applyQuaternion(_q);
    _q.setFromAxisAngle(_up, s.yaw); _d.applyQuaternion(_q);
    _d.normalize();

    ray.set(_o, _d);
    const hit = ray.intersectObjects(shootables, true)[0];
    viewmodel.muzzleWorld(_muzzle);

    if (hit) {
      if (hit.face) _nrm.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);
      else _nrm.copy(_d).negate();
      if (_nrm.dot(_d) > 0) _nrm.negate();
      const surface = hit.object.userData.surface || 'default';
      effects.impact(hit.point, _nrm, surface);
      effects.tracer(_muzzle, hit.point);
      // range falloff — no targets in the scene, but keep the model honest
      const f = s.falloff;
      const k = hit.distance <= f.start ? 1
        : hit.distance >= f.end ? f.min
        : 1 - (1 - f.min) * (hit.distance - f.start) / (f.end - f.start);
      lastDamage = Math.round(s.damage * k);
      if (s.index === 0) { hitId++; }
    } else {
      effects.tracer(_muzzle, _o.clone().addScaledVector(_d, 200));
    }
  }
  let lastDamage = 0;

  function equip(i) {
    if (i === activeIndex || i < 0 || i >= weapons.length) return;
    if (active) active.releaseTrigger();
    activeIndex = i;
    active = weapons[i];
    viewmodel.setWeapon(active.cfg);
    audio.mode();
    pushHud();
  }

  // --- engage / disengage ---
  // Pointer lock is the real path; if it is refused (e.g. the page is framed)
  // we fall back to a "soft lock": look still tracks mouse movement, the cursor
  // just stays visible and ESC leaves.
  function setEngaged(on, soft) {
    engaged = on;
    softLock = on && soft;
    controls.lookExternal = on;
    controls.grounded = on;
    viewmodel.group.visible = on;
    if (!on && active) { active.releaseTrigger(); ads = false; }
    pushHud();
  }
  function engage() {
    if (engaged) return;
    audio.resume();
    const p = canvas.requestPointerLock?.();
    if (p && typeof p.catch === 'function') p.catch(() => setEngaged(true, true));
    setTimeout(() => { if (!engaged) setEngaged(true, true); }, 250);
  }
  function onLockChange() {
    if (document.pointerLockElement === canvas) setEngaged(true, false);
    else if (!softLock) setEngaged(false, false);
  }
  function onMouseMove(e) {
    if (!engaged) return;
    const m = ads ? 0.55 : 1;
    controls.yaw -= e.movementX * SENS * m;
    controls.pitch -= e.movementY * SENS * m;
    lookDX += e.movementX * SENS;
    lookDY += e.movementY * SENS;
  }
  function onMouseDown(e) {
    if (!engaged) { engage(); return; }
    if (e.button === 0) active?.pressTrigger();
    if (e.button === 2) { ads = true; }
  }
  function onMouseUp(e) {
    if (e.button === 0) active?.releaseTrigger();
    if (e.button === 2) ads = false;
  }
  function onKeyDown(e) {
    if (e.code === 'Escape' && softLock) { setEngaged(false, false); return; }
    if (!engaged) return;
    if (e.code === 'KeyR') active?.reload();
    else if (e.code === 'KeyB') active?.cycleMode();
    else if (e.code === 'Digit1') equip(0);
    else if (e.code === 'Digit2') equip(1);
    else if (e.code === 'Digit3') equip(2);
  }
  const noCtx = (e) => e.preventDefault();

  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('contextmenu', noCtx);
  document.addEventListener('pointerlockchange', onLockChange);

  // --- per-frame ---
  function frameTick(dt) {
    const moveSpeed = engaged ? lastPos.distanceTo(camera.position) / Math.max(dt, 1e-4) : 0;
    lastPos.copy(camera.position);

    if (active) active.update(dt, null);
    viewmodel.setADS(ads);
    viewmodel.update(dt, { moveSpeed, lookDX, lookDY });
    lookDX = 0; lookDY = 0;
    effects.update(dt);

    // recoil settles back toward the original aim
    const decay = Math.exp(-dt * (active ? active.cfg.recoil.recover : 8));
    controls.pitch += rec.pitch * (decay - 1);
    controls.yaw += rec.yaw * (decay - 1);
    rec.pitch *= decay; rec.yaw *= decay;

    // ADS eases the FOV
    const targetFov = ads && active ? active.cfg.view.adsFov : BASE_FOV;
    if (Math.abs(camera.fov - targetFov) > 0.05) {
      camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 13);
      camera.updateProjectionMatrix();
    }

    maybePushHud();
  }
  const offFrame = forest.onFrame(frameTick);

  // --- HUD ---
  let hudSig = '';
  function snapshot() {
    const h = active ? active.hud() : { name: '—', kind: '', mode: '', mag: 0, reserve: 0, reloading: false, spreadDeg: 0 };
    return { ...h, engaged, ads, hitId, low: h.mag > 0 && h.mag / (active?.cfg.mag || 1) <= 0.3 };
  }
  function sig(s) {
    return [s.name, s.mode, s.mag, s.reserve, s.reloading, s.engaged, s.ads, s.hitId, Math.round(s.spreadDeg * 3)].join('|');
  }
  function pushHud() { const s = snapshot(); hudSig = sig(s); onHud(s); }
  function maybePushHud() { const s = snapshot(); const g = sig(s); if (g !== hudSig) { hudSig = g; onHud(s); } }

  equip(0);

  function dispose() {
    offFrame?.();
    canvas.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('keydown', onKeyDown);
    canvas.removeEventListener('contextmenu', noCtx);
    document.removeEventListener('pointerlockchange', onLockChange);
    if (document.pointerLockElement === canvas) document.exitPointerLock?.();
    effects.dispose();
    viewmodel.dispose();
    audio.dispose();
    controls.grounded = false;
    controls.lookExternal = false;
  }

  return { dispose, equip };
}
