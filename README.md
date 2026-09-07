# Sylva — Floresta viva

Uma floresta em tempo real no navegador: densa, tela cheia, sem UI de marketing — a
floresta *é* a experiência. Você entra e explora livremente entre árvores, samambaias,
musgo, troncos caídos e feixes de luz.

Feita com **Three.js 0.180** dentro de um app **OpenAI Sites** (vinext + Vite + React 19,
deploy em Cloudflare Workers).

## Rodando localmente

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build de produção (vinext build)
```

## Controles

| Ação | Tecla / gesto |
|---|---|
| Olhar | arrastar o mouse |
| Andar | `W` `A` `S` `D` |
| Subir / descer | `Q` / `E` |
| Acelerar | `Shift` |
| Toque | pad no canto inferior esquerdo |

## Como a cena é montada

Tudo é procedural, a partir de um PRNG com seed fixa (`app/forest.ts`):

- **Terreno** — heightfield senoidal, cores por vértice, uma textura de solo original.
- **Árvores** — 172 árvores, cada uma um único mesh mergeado; galhos por recursão de
  tubos (curva, afinamento e queda por gravidade), copa em folhas instanciadas.
- **Sub-bosque** — ~330k folhas de grama, 720 samambaias (3 variantes), ~530 arbustos,
  serrapilheira, musgo, flores, cogumelos — todos `InstancedMesh`.
- **Pedras** — 480 icosaedros deformados com shader de grão + musgo.
- **Atmosfera** — domo de céu em gradiente com disco de sol, `FogExp2`, 13 feixes de luz
  (blending aditivo), poeira em suspensão, vento por vertex-shader, sombras PCFSoft 4096
  (um único update estático).
- **Câmera** — voo livre com colisão contra o terreno.

## Histórico

1. Scaffold do projeto Sites (`@openai/create-sites`).
2. Cena da floresta (autoria no Codex / GPT-5).
3. Passo de iteração visual: copas naturais, sub-bosque iluminado, céu em gradiente.
