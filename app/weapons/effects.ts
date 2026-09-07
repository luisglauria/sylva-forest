// @ts-nocheck
// World-space feedback for a bullet that lands: a one-frame tracer, a short
// spark/dust burst, and a lingering decal. Everything is pooled and allocated
// once — firing never creates geometry or materials.
import * as T from 'three';

const SURFACE_TINT = {
  soil: 0x6b5636, bark: 0x8a7351, wood: 0xb08a55, rock: 0xd9d2c2, default: 0xbfae86,
};

function decalTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grd.addColorStop(0, 'rgba(10,8,6,0.85)');
  grd.addColorStop(0.6, 'rgba(15,12,9,0.35)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  return tex;
}

export function createEffects(scene) {
  const group = new T.Group();
  group.name = 'weapon-fx';
  scene.add(group);

  // --- tracers: stretched additive quads ---
  const TRACERS = 16;
  const tracerGeo = new T.PlaneGeometry(1, 1);
  const tracerMat = new T.MeshBasicMaterial({
    color: 0xffe6b0, transparent: true, opacity: 0, blending: T.AdditiveBlending,
    depthWrite: false, fog: false, side: T.DoubleSide,
  });
  const tracers = [];
  for (let i = 0; i < TRACERS; i++) {
    const m = new T.Mesh(tracerGeo, tracerMat.clone());
    m.visible = false; m.frustumCulled = false;
    group.add(m);
    tracers.push({ m, life: 0 });
  }
  let tracerCursor = 0;
  const _mid = new T.Vector3();

  function tracer(from, to) {
    const s = tracers[tracerCursor++ % TRACERS];
    _mid.addVectors(from, to).multiplyScalar(0.5);
    s.m.position.copy(_mid);
    s.m.lookAt(to);
    const len = from.distanceTo(to);
    s.m.scale.set(0.03, len, 1);
    s.m.rotateX(Math.PI / 2);
    s.m.material.opacity = 0.9;
    s.m.visible = true;
    s.life = 0.055;
  }

  // --- sparks: one Points cloud per pool slot, positions integrated each frame ---
  const BURSTS = 28;
  const PER = 12;
  const bursts = [];
  for (let i = 0; i < BURSTS; i++) {
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(new Float32Array(PER * 3), 3));
    const mat = new T.PointsMaterial({
      size: 0.07, transparent: true, opacity: 0, depthWrite: false,
      blending: T.AdditiveBlending, fog: true, sizeAttenuation: true,
    });
    const pts = new T.Points(geo, mat);
    pts.visible = false; pts.frustumCulled = false;
    group.add(pts);
    bursts.push({ pts, vel: new Float32Array(PER * 3), origin: new T.Vector3(), life: 0, ttl: 0.36 });
  }
  let burstCursor = 0;
  const _n = new T.Vector3();
  const _t = new T.Vector3();
  const _b = new T.Vector3();

  function impact(point, normal, surface) {
    const s = bursts[burstCursor++ % BURSTS];
    s.origin.copy(point);
    s.pts.material.color.setHex(SURFACE_TINT[surface] || SURFACE_TINT.default);
    _n.copy(normal).normalize();
    // build a basis on the surface so debris flies out of it
    _t.set(_n.z, _n.x, -_n.y).normalize();
    _b.crossVectors(_n, _t).normalize();
    const pos = s.pts.geometry.attributes.position.array;
    for (let i = 0; i < PER; i++) {
      pos[i * 3] = point.x; pos[i * 3 + 1] = point.y; pos[i * 3 + 2] = point.z;
      const out = 1.6 + Math.random() * 3.2;
      const spin = (Math.random() - 0.5) * 2.2;
      const spin2 = (Math.random() - 0.5) * 2.2;
      s.vel[i * 3] = _n.x * out + _t.x * spin + _b.x * spin2;
      s.vel[i * 3 + 1] = _n.y * out + _t.y * spin + _b.y * spin2 + 0.4;
      s.vel[i * 3 + 2] = _n.z * out + _t.z * spin + _b.z * spin2;
    }
    s.pts.geometry.attributes.position.needsUpdate = true;
    s.pts.material.opacity = 1;
    s.pts.visible = true;
    s.life = s.ttl;
    decal(point, _n);
  }

  // --- decals: soft dark quads that fade over several seconds ---
  const DECALS = 24;
  const decalTex = decalTexture();
  const decalGeo = new T.PlaneGeometry(1, 1);
  const decals = [];
  for (let i = 0; i < DECALS; i++) {
    const m = new T.Mesh(decalGeo, new T.MeshBasicMaterial({
      map: decalTex, transparent: true, opacity: 0, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -4, fog: true,
    }));
    m.visible = false; m.frustumCulled = false;
    group.add(m);
    decals.push({ m, life: 0, ttl: 7 });
  }
  let decalCursor = 0;

  function decal(point, normal) {
    const d = decals[decalCursor++ % DECALS];
    d.m.position.copy(point).addScaledVector(normal, 0.012);
    d.m.lookAt(_mid.copy(point).add(normal));
    d.m.rotateZ(Math.random() * Math.PI * 2);
    d.m.scale.setScalar(0.14 + Math.random() * 0.1);
    d.m.material.opacity = 0.9;
    d.m.visible = true;
    d.life = d.ttl;
  }

  function update(dt) {
    for (const s of tracers) {
      if (s.life <= 0) continue;
      s.life -= dt;
      s.m.material.opacity = Math.max(0, s.life / 0.055) * 0.9;
      if (s.life <= 0) s.m.visible = false;
    }
    for (const s of bursts) {
      if (s.life <= 0) continue;
      s.life -= dt;
      const pos = s.pts.geometry.attributes.position.array;
      for (let i = 0; i < PER; i++) {
        s.vel[i * 3 + 1] -= 9.5 * dt;
        pos[i * 3] += s.vel[i * 3] * dt;
        pos[i * 3 + 1] += s.vel[i * 3 + 1] * dt;
        pos[i * 3 + 2] += s.vel[i * 3 + 2] * dt;
      }
      s.pts.geometry.attributes.position.needsUpdate = true;
      s.pts.material.opacity = Math.max(0, s.life / s.ttl);
      if (s.life <= 0) s.pts.visible = false;
    }
    for (const d of decals) {
      if (d.life <= 0) continue;
      d.life -= dt;
      d.m.material.opacity = Math.min(0.9, d.life) * (d.life < 1 ? d.life : 1);
      if (d.life <= 0) d.m.visible = false;
    }
  }

  function dispose() {
    scene.remove(group);
    group.traverse((o) => {
      o.geometry?.dispose?.();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.map?.dispose?.(); m.dispose(); });
    });
  }

  return { tracer, impact, update, dispose };
}
