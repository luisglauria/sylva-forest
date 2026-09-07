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
