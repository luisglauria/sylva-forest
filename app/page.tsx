'use client';
import { useEffect, useRef, useState } from 'react';
export default function Home() {
 const host=useRef<HTMLDivElement>(null);const [ready,setReady]=useState(false);const [error,setError]=useState('');
 useEffect(()=>{let dispose:(()=>void)|undefined,gone=false;import('./forest').then(({createForest})=>{if(!gone&&host.current)dispose=createForest(host.current,()=>setReady(true));}).catch(()=>setError('Não foi possível iniciar a floresta. Recarregue em um navegador com WebGL.'));return()=>{gone=true;dispose?.();};},[]);
 return <main aria-label="Floresta com exploração livre"><div ref={host} className="forest"/>{!ready&&<div className="loading" role="status">{error||'Entrando na floresta…'}</div>}{ready&&<div className="hint">Arraste para olhar · WASD para explorar · Q/E para voar · Shift para acelerar</div>}<div id="touch-pad" aria-label="Arraste para caminhar"/></main>;
}
