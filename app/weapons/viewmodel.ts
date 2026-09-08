// @ts-nocheck
// The gun on screen. Blockout geometry (no art assets), lit by one short-range
// light so it reads the same wherever the player faces. All motion is
// procedural springs: idle sway from mouse motion, walk bob, a recoil impulse
// per shot, an ADS blend, and a reload dip. `muzzleWorld()` is where tracers
// and the flash originate.
import * as T from 'three';

const GUNMETAL = new T.MeshStandardMaterial({ color: 0x22262c, roughness: 0.55, metalness: 0.65, fog: false });
const POLYMER = new T.MeshStandardMaterial({ color: 0x14130f, roughness: 0.9, metalness: 0.1, fog: false });

const box = (w, h, d, mat, x = 0, y = 0, z = 0, rx = 0) => {
  const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.rotation.x = rx;
  return m;
};

function blockout(id) {
  const g = new T.Group();
  let muzzle;
  if (id === 'pistol') {
    g.add(box(0.045, 0.055, 0.20, GUNMETAL, 0, 0.012, -0.02));
    g.add(box(0.024, 0.024, 0.05, GUNMETAL, 0, 0.012, -0.13));
    g.add(box(0.042, 0.11, 0.05, POLYMER, 0, -0.075, 0.055, 0.34));
    g.add(box(0.02, 0.02, 0.02, GUNMETAL, 0, 0.042, -0.08));
    muzzle = new T.Vector3(0, 0.012, -0.15);
  } else if (id === 'shotgun') {
    g.add(box(0.06, 0.07, 0.30, GUNMETAL, 0, 0, 0));
    g.add(box(0.03, 0.03, 0.42, GUNMETAL, 0, 0.016, -0.34));
    g.add(box(0.026, 0.026, 0.34, GUNMETAL, 0, -0.022, -0.30));
    g.add(box(0.052, 0.05, 0.11, POLYMER, 0, -0.02, -0.20));
    g.add(box(0.05, 0.07, 0.18, POLYMER, 0, -0.006, 0.23));
    g.add(box(0.04, 0.09, 0.04, POLYMER, 0, -0.065, 0.075, 0.32));
    muzzle = new T.Vector3(0, 0.016, -0.56);
  } else {
    g.add(box(0.058, 0.07, 0.34, GUNMETAL, 0, 0, 0));
    g.add(box(0.028, 0.028, 0.30, GUNMETAL, 0, 0.012, -0.30));
    g.add(box(0.05, 0.05, 0.18, POLYMER, 0, 0, -0.16));
    g.add(box(0.045, 0.13, 0.05, POLYMER, 0, -0.092, 0.02, 0.12));
    g.add(box(0.05, 0.06, 0.14, POLYMER, 0, 0, 0.225));
    g.add(box(0.04, 0.09, 0.04, POLYMER, 0, -0.07, 0.085, 0.3));
    g.add(box(0.016, 0.03, 0.02, GUNMETAL, 0, 0.052, 0));
    muzzle = new T.Vector3(0, 0.012, -0.46);
  }
  return { g, muzzle };
}

function flashTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const grd = x.createRadialGradient(32, 32, 1, 32, 32, 30);
  grd.addColorStop(0, 'rgba(255,247,224,1)');
  grd.addColorStop(0.4, 'rgba(255,214,140,0.7)');
  grd.addColorStop(1, 'rgba(255,180,80,0)');
  x.fillStyle = grd; x.fillRect(0, 0, 64, 64);
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  return t;
}

export function createViewmodel(camera) {
  const group = new T.Group();
  group.renderOrder = 10;
  camera.add(group);

  const light = new T.PointLight(0xfff0da, 2.6, 1.4, 2);
  light.position.set(0.15, 0.1, 0.1);
  group.add(light);

  // muzzle flash: two crossed additive quads + a punchy short-range light,
  // re-parented onto the gun mesh in setWeapon()
  const flashTex = flashTexture();
  const flashMat = new T.MeshBasicMaterial({ map: flashTex, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false, side: T.DoubleSide });
  const flashA = new T.Mesh(new T.PlaneGeometry(0.22, 0.22), flashMat);
  const flashB = new T.Mesh(new T.PlaneGeometry(0.22, 0.22), flashMat);
  flashB.rotation.z = Math.PI / 2;
  const flashGroup = new T.Group();
  flashGroup.add(flashA, flashB);
  flashGroup.visible = false;
  const flashLight = new T.PointLight(0xffca88, 0, 5, 2);

  let blk = null;
  const hipPos = new T.Vector3(0.2, -0.17, -0.42);
  const adsPos = new T.Vector3(0, -0.1, -0.3);
  const muzzleLocal = new T.Vector3(0, 0, -0.46);

  function setWeapon(cfg) {
    if (blk) { group.remove(blk.g); blk.g.traverse((o) => o.geometry?.dispose?.()); }
    blk = blockout(cfg.id);
    // push the model forward so the stock never crowds the lens, and trim it a touch
    blk.g.position.set(-0.02, 0.015, -0.28);
    blk.g.scale.setScalar(0.72);
    group.add(blk.g);
    // muzzle flash rides with the gun mesh so it stays at the barrel tip
    blk.g.add(flashGroup, flashLight);
    flashGroup.position.copy(blk.muzzle);
    flashLight.position.copy(blk.muzzle);
    hipPos.fromArray(cfg.view.pos);
    adsPos.fromArray(cfg.view.adsPos);
    muzzleLocal.copy(blk.muzzle);
  }

  // spring state
  const sway = new T.Vector3();
  const bob = new T.Vector3();
  const rPos = new T.Vector3();
  const rVelPos = new T.Vector3();
  const rRot = new T.Vector3();
  const rVelRot = new T.Vector3();
  let adsT = 0, targetADS = 0, bobPhase = 0, flashLife = 0;
  let reloadUntil = 0, reloadDur = 0, reloadShell = false, clock = 0;

  const _p = new T.Vector3();

  function recoil(rc) {
    rVelPos.z += rc.punch * 3.4;
    rVelPos.y += rc.punch * 1.4;
    rVelRot.x += rc.up * 0.06;
    rVelRot.y += (Math.random() - 0.5) * rc.side * 0.08;
    rVelRot.z += (Math.random() - 0.5) * rc.side * 0.05;
  }
  function reload(kind, time) {
    reloadShell = kind === 'shell';
    reloadDur = reloadShell ? 0.4 : time;
    reloadUntil = clock + (reloadShell ? 9 : time); // shell: keep the motion running until cancelled
  }
  function endReload() { reloadUntil = 0; }
  function setADS(on) { targetADS = on ? 1 : 0; }
  function flash() {
    flashGroup.visible = true;
    flashGroup.rotation.z = Math.random() * Math.PI;
    const s = 0.7 + Math.random() * 0.7;
    flashGroup.scale.setScalar(s);
    flashLight.intensity = 5;
    flashLife = 0.045;
  }
  function muzzleWorld(out) {
    camera.updateMatrixWorld();
    group.updateMatrixWorld();
    return out.copy(muzzleLocal).applyMatrix4(blk ? blk.g.matrixWorld : group.matrixWorld);
  }

  function update(dt, ctx) {
    clock += dt;
    const { moveSpeed = 0, lookDX = 0, lookDY = 0 } = ctx;

    // ADS blend
    adsT += (targetADS - adsT) * Math.min(1, dt * 13);

    // sway follows mouse motion then settles back
    _p.set(-lookDX * 0.9, lookDY * 0.9, 0).clampLength(0, 0.05);
    sway.lerp(_p, 1 - Math.exp(-dt * 9));

    // walk bob, muted while aiming
    const spd = Math.min(1, moveSpeed / 6) * (1 - adsT * 0.85);
    bobPhase += dt * (7 + moveSpeed * 1.6);
    bob.set(Math.cos(bobPhase) * 0.007 * spd, -Math.abs(Math.sin(bobPhase)) * 0.009 * spd, 0);

    // recoil spring (critically damped return to rest)
    for (const [pos, vel, k] of [[rPos, rVelPos, 150], [rRot, rVelRot, 170]]) {
      vel.addScaledVector(pos, -k * dt);
      vel.multiplyScalar(Math.exp(-dt * 16));
      pos.addScaledVector(vel, dt);
    }

    // reload dip
    let dipY = 0, dipRotX = 0, dipRotZ = 0;
    if (reloadUntil > clock) {
      const phase = reloadShell
        ? Math.abs(Math.sin(clock * Math.PI / 0.4))
        : Math.sin(Math.PI * (1 - (reloadUntil - clock) / reloadDur));
      dipY = -0.11 * phase;
      dipRotX = 0.5 * phase;
      dipRotZ = 0.35 * phase;
    }

    // flash decay
    if (flashLife > 0) {
      flashLife -= dt;
      flashLight.intensity = Math.max(0, flashLife / 0.045) * 5;
      if (flashLife <= 0) flashGroup.visible = false;
    }

    _p.copy(hipPos).lerp(adsPos, adsT).add(sway).add(bob).add(rPos);
    _p.y += dipY;
    group.position.copy(_p);
    group.rotation.set(
      rRot.x + dipRotX - sway.y * 2,
      rRot.y + sway.x * 2,
      rRot.z + dipRotZ + sway.x * 1.2,
    );
  }

  function dispose() {
    camera.remove(group);
    flashTex.dispose();
    group.traverse((o) => {
      o.geometry?.dispose?.();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
    });
  }

  return { group, setWeapon, recoil, reload, endReload, setADS, flash, muzzleWorld, update, dispose };
}
