# Sylva — Floresta viva

Uma floresta em tempo real no navegador: densa, tela cheia, sem UI de marketing — a
floresta *é* a experiência. Você entra e explora livremente entre árvores, samambaias,
musgo, troncos caídos e feixes de luz.

Feita com **Three.js 0.180** dentro de um app **OpenAI Sites** (vinext + Vite + React 19,
deploy em Cloudflare Workers).

## Rodando no seu PC

### Pré-requisitos

- **Node.js 22.13 ou superior** (traz o `npm` junto)
- **Git**
- Um navegador com WebGL 2 (Chrome, Firefox, Safari ou Edge recentes)
- GPU dedicada recomendada — a cena tem centenas de milhares de instâncias

Confira o que já tem instalado:

```bash
node -v   # precisa ser >= 22.13
git --version
```

### 1. Instalar o Node (se precisar)

**macOS**

```bash
# com Homebrew (https://brew.sh)
brew install node

# ou com nvm (permite várias versões)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install 22
```

**Linux**

```bash
# com nvm (recomendado, não precisa de sudo)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install 22

# ou pelo repositório NodeSource (Debian/Ubuntu)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Fedora
sudo dnf install nodejs
```

**Windows**

```powershell
# com winget (Windows 10/11)
winget install OpenJS.NodeJS.LTS

# ou com nvm-windows: https://github.com/coreybutler/nvm-windows/releases
nvm install 22
nvm use 22
```

Também dá para baixar o instalador direto em <https://nodejs.org>.

### 2. Clonar e rodar

Os comandos abaixo são iguais nos três sistemas. No Windows use **PowerShell** ou o
**Git Bash**; no macOS/Linux, o terminal padrão.

```bash
git clone https://github.com/luisglauria/sylva-forest.git
cd sylva-forest

npm install        # instala as dependências (~1–2 min na primeira vez)
npm run dev        # sobe o servidor de desenvolvimento
```

Abra <http://localhost:3000> no navegador. O `npm run dev` recarrega sozinho quando você
edita os arquivos.

### 3. Build de produção (opcional)

```bash
npm run build      # gera o bundle em dist/ (vinext build)
npm run start      # serve o build localmente via Wrangler
```

### Problemas comuns

- **`node: command not found`** depois de instalar via nvm — feche e reabra o terminal,
  ou rode `nvm use 22`.
- **Tela preta / "não foi possível iniciar a floresta"** — o navegador não tem WebGL 2
  ativo ou está usando GPU integrada sem aceleração. Teste em outro navegador.
- **Windows: erro de `execution policy` ao rodar scripts** — abra o PowerShell e rode
  `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
- **Porta 3000 ocupada** — rode `npm run dev -- -p 4000` e acesse a porta nova.

## Controles

**Explorando** (padrão):

| Ação | Tecla / gesto |
|---|---|
| Olhar | arrastar o mouse |
| Andar | `W` `A` `S` `D` |
| Subir / descer | `Q` / `E` |
| Acelerar | `Shift` |
| Toque | pad no canto inferior esquerdo |

**Com a arma** — clique na tela para engatar (trava o ponteiro); `ESC` volta a explorar:

| Ação | Tecla / gesto |
|---|---|
| Mirar a câmera | mouse |
| Andar / pular | `W` `A` `S` `D` / `Espaço` |
| Disparar | botão esquerdo |
| Mira de ferro (ADS) | botão direito |
| Recarregar | `R` |
| Trocar de arma | `1` `2` `3` |
| Modo de tiro | `B` |

Só no desktop — no celular a trava de ponteiro não existe e você fica só com a exploração.

## Camada de combate (`app/weapons/`)

Um FPS leve sobre a floresta, feito sem nenhum asset — geometria blockout, sons
sintetizados no navegador (Web Audio) e toda animação por código.

| Arquivo | Papel |
|---|---|
| `configs.ts` | O arsenal inteiro como dados: dano, pente, cadência, recarga, spread, recuo, falloff. Uma arma = uma linha. |
| `weapon.ts` | A única classe `Weapon`. Máquina de estados (disparo/recarga), cadência, munição, modos auto/semi/burst/pump, recarga por pente ou cartucho a cartucho. Não toca em three.js — emite eventos pelos *ganchos*. |
| `viewmodel.ts` | A arma na tela: blockout (AR / pistola / escopeta), balanço, passo, recuo por mola, ADS, mergulho de recarga, fogo do cano. |
| `effects.ts` | Pools de traçantes, faíscas/poeira de impacto e decalques — alocados uma vez. |
| `audio.ts` | Tiro = rajada de ruído com passa-baixa fechando + estampido + grave, com cauda por convolver. Recarga/pump/clique = ruído passa-banda curto. |
| `index.ts` | `createArsenal(forest)`: trava de ponteiro + input, junta os ganchos de cada arma ao raycast, ao viewmodel, aos efeitos, ao som e ao recuo de câmera. |

**Adicionar uma arma:** acrescente um objeto em `WEAPONS` (`configs.ts`) com um `id` novo
e ajuste os números. Se quiser um blockout diferente, adicione um ramo em `blockout()`
no `viewmodel.ts`. Nenhuma subclasse.

Alvos ainda não existem — o raycast só acerta cenário (troncos, chão, pedras, galhos
caídos), o que já gera impacto, decalque e marcador de acerto.

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
- **Câmera** — voo livre com colisão contra o terreno; ao engatar a arma, vira um
  jogador preso ao chão com gravidade e pulo.

## Histórico

1. Scaffold do projeto Sites (`@openai/create-sites`).
2. Cena da floresta (autoria no Codex / GPT-5).
3. Passo de iteração visual: copas naturais, sub-bosque iluminado, céu em gradiente.
4. Camada de combate: sistema de armas data-driven, viewmodel e efeitos procedurais,
   áudio sintetizado, HUD.
