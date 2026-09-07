// @ts-nocheck
// The one weapon class. It owns timing and ammo state and nothing visual:
// it never touches three.js. When it decides a shot happened it calls the
// hooks passed in by the controller (sound / muzzle / raycast / recoil live
// there). This is the pattern every weapon follows — behaviour is data
// (`configs.ts`) + these hooks, not a subclass per gun.

const DEG = Math.PI / 180;
const now = () => performance.now() / 1000;

export class Weapon {
  constructor(config, hooks = {}) {
    this.cfg = config;
    this.hooks = hooks;
    this.mag = config.mag;
    this.reserve = config.reserve;
    this.modeIndex = 0;
    this.bloom = 0;          // extra spread cone in degrees, decays over time
    this.reloading = false;
    this.reloadKind = null;  // 'mag' | 'shell'
    this._reloadAt = 0;      // completion time (mag) / next-shell time (shell)
    this._nextShot = 0;      // earliest time the next round may leave the barrel
    this._triggerHeld = false;
    this._semiLatch = false; // blocks auto-repeat for semi / pump
    this._burstLeft = 0;
  }

  get mode() { return this.cfg.modes[this.modeIndex]; }
  get spreadDeg() { return Math.min(this.cfg.spread.base + this.bloom, this.cfg.spread.max); }
  get canReload() {
    return !this.reloading && this.mag < this.cfg.mag && this.reserve > 0;
  }

  pressTrigger() {
    this._triggerHeld = true;
    // firing cancels a shell-by-shell reload once there's at least one round up
    if (this.reloading && this.cfg.shellReload && this.mag > 0) this._cancelReload();
    if (this.mode === 'burst' && this._burstLeft === 0 && !this.reloading) {
      this._burstLeft = this.cfg.burst;
    }
  }
  releaseTrigger() { this._triggerHeld = false; this._semiLatch = false; }

  reload() {
    if (!this.canReload) return;
    this.reloading = true;
    this.reloadKind = this.cfg.shellReload ? 'shell' : 'mag';
    this._reloadAt = now() + this.cfg.reloadTime;
    this.hooks.onReloadStart?.(this.reloadKind, this.cfg.reloadTime);
  }

  cycleMode() {
    if (this.cfg.modes.length < 2) return;
    this.modeIndex = (this.modeIndex + 1) % this.cfg.modes.length;
    this._burstLeft = 0;
    this.hooks.onModeChange?.(this.mode);
  }

  // called every frame by the controller
  update(dt, ctx) {
    const t = now();

    // spread cone recovers toward its base value
    if (this.bloom > 0) this.bloom = Math.max(0, this.bloom - this.cfg.spread.recover * dt);

    if (this.reloading) {
      if (t >= this._reloadAt) {
        if (this.reloadKind === 'shell') {
          this.mag += 1; this.reserve -= 1;
          this.hooks.onShellLoaded?.(this.mag);
          if (this.mag >= this.cfg.mag || this.reserve <= 0) this._finishReload();
          else this._reloadAt = t + this.cfg.reloadTime;
        } else {
          const take = Math.min(this.cfg.mag - this.mag, this.reserve);
          this.mag += take; this.reserve -= take;
          this._finishReload();
        }
      }
      return;
    }

    const wantsToFire =
      this._burstLeft > 0 ||
      (this._triggerHeld && (this.mode === 'auto' ||
        ((this.mode === 'semi' || this.mode === 'pump') && !this._semiLatch)));

    if (wantsToFire && t >= this._nextShot) this._fire(t, ctx);
  }

  _fire(t, ctx) {
    if (this.mag <= 0) {
      this.hooks.onDryFire?.();
      this._semiLatch = true;
      this._burstLeft = 0;
      this._nextShot = t + 0.18;
      return;
    }
    this.mag -= 1;
    this._nextShot = t + 60 / this.cfg.rpm;
    this._semiLatch = true;
    if (this._burstLeft > 0) this._burstLeft -= 1;

    const cone = this.spreadDeg * DEG;
    const pellets = this.cfg.pellets;
    for (let i = 0; i < pellets; i++) {
      // random offset inside the aim cone, biased toward the centre
      const a = Math.random() * Math.PI * 2;
      const r = cone * Math.sqrt(Math.random());
      this.hooks.onShot?.({
        yaw: Math.cos(a) * r,
        pitch: Math.sin(a) * r,
        damage: this.cfg.damage,
        falloff: this.cfg.falloff,
        index: i,
        pellets,
      });
    }
    this.bloom = Math.min(this.cfg.spread.max, this.bloom + this.cfg.spread.bloom);
    this.hooks.onFired?.({
      recoil: this.cfg.recoil,
      pellets,
      mag: this.mag,
      last: this.mag === 0,
    });
    if (this.mag === 0) this._burstLeft = 0;
  }

  _cancelReload() { this.reloading = false; this.reloadKind = null; this.hooks.onReloadEnd?.(true); }
  _finishReload() { this.reloading = false; this.reloadKind = null; this.hooks.onReloadEnd?.(false); }

  // snapshot for the HUD
  hud() {
    return {
      name: this.cfg.name,
      kind: this.cfg.kind,
      mode: this.mode,
      mag: this.mag,
      reserve: this.reserve,
      reloading: this.reloading,
      spreadDeg: this.spreadDeg,
    };
  }
}
