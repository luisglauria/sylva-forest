'use client';
import { useEffect, useRef, useState } from 'react';

type Hud = {
  name: string; kind: string; mode: string; mag: number; reserve: number;
  reloading: boolean; spreadDeg: number; engaged: boolean; ads: boolean;
  hitId: number; low: boolean;
};

export default function Home() {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [hud, setHud] = useState<Hud | null>(null);

  useEffect(() => {
    let dispose: (() => void) | undefined;
    let gone = false;
    (async () => {
      const { createForest } = await import('./forest');
      if (gone || !host.current) return;
      const forest = createForest(host.current, () => setReady(true));
      const { createArsenal } = await import('./weapons');
      if (gone) { forest.dispose(); return; }
      const arsenal = createArsenal(forest, { onHud: setHud });
      dispose = () => { arsenal.dispose(); forest.dispose(); };
    })().catch(() => setError('Não foi possível iniciar a floresta. Recarregue em um navegador com WebGL.'));
    return () => { gone = true; dispose?.(); };
  }, []);

  const gap = hud ? Math.round(5 + Math.min(hud.spreadDeg, 6) * 3.4) : 8;

  return (
    <main aria-label="Floresta com exploração livre e arma">
      <div ref={host} className="forest" />
      {!ready && <div className="loading" role="status">{error || 'Entrando na floresta…'}</div>}

      {ready && hud?.engaged && (
        <>
          <div className="xhair" style={{ ['--gap' as string]: `${gap}px` } as React.CSSProperties} aria-hidden>
            <span /><span /><span /><span />
          </div>
          {hud.hitId > 0 && (
            <div key={hud.hitId} className="hitmark" aria-hidden>
              <span /><span /><span /><span />
            </div>
          )}
        </>
      )}

      {ready && hud && (
        <div className="hud" aria-live="polite">
          {hud.engaged
            ? <p className="hint">WASD mover · Espaço pular · clique dispara · botão direito mira · R recarrega · 1/2/3 troca arma · B modo de tiro · ESC solta o mouse</p>
            : <p className="engage">Clique para engatar a arma · <span>ESC</span> volta a explorar</p>}
          <div className="ammo">
            <span className="wname">{hud.name} <em>{hud.kind}</em></span>
            <span className="rounds">
              <b className={hud.reloading ? 'dim' : hud.low ? 'low' : ''}>{hud.mag}</b> / {hud.reserve}
            </span>
            <span className="tags">
              <span className="mode-chip">{hud.mode}</span>
              {hud.ads && <span className="mode-chip">mira</span>}
              {hud.reloading && <span className="reload-warn">recarregando…</span>}
              {!hud.reloading && hud.low && <span className="reload-warn">R</span>}
            </span>
          </div>
        </div>
      )}

      <div id="touch-pad" aria-label="Arraste para caminhar" />
    </main>
  );
}
