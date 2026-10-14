# Raízes de Solária

RPG isekai de fazenda e vila em pixel art 16x16, feito com Phaser 3 e os assets
[Sunnyside World](https://danieldiggle.itch.io/sunnyside) de danieldiggle. O design completo
está em `Roteiro de Design — RPG Isekai de Fazenda e Vila.md`.

## Rodando

Os assets do pack não vão para o git (a licença proíbe redistribuir). Coloque
`Sunnyside_World_ASSET_PACK_V2.1.zip` na raiz do projeto e rode:

```bash
npm install
npm run setup:assets   # extrai o pack, gera os sprites do projeto GameMaker e o mapa
npm run dev            # http://localhost:5173
```

`setup:assets` faz quatro coisas:

1. Extrai `Sunnyside_World_Assets/` para `assets/sunnyside/`, com os nomes do pack intactos.
2. Junta em tiras PNG (`assets/generated/gm/`) os ~470 sprites que só existem no projeto
   GameMaker do pack (barris, baús, poços, minérios, moinho, móveis, poeira...), com um manifesto
   de origem e velocidade de animação.
3. Converte a sala de exemplo do pack (a mesma da imagem de divulgação) para um mapa Tiled
   em `maps/vale_exemplo.json`, que abre no Tiled para edição.
4. Gera o Vale do Brotar do jogo, `maps/vale.json` (160x102 tiles): o mesmo vale sem o formato de
   ilhas (o mar vira campo e a costa de penhascos é aplainada), cercado de campos, bosques e mata
   fechada nas bordas, gravetos e pedras soltos e alguns animais no pasto. O gerador é
   `tools/build-vale.mjs` e é determinístico.

O setup também gera cópias dos tilesets com 1px de borda repetida (`assets/generated/*_extruded.png`),
que evitam linhas finas entre os tiles com a câmera em posição fracionária.

## Publicar na web

```bash
npm run deploy
```

Gera o build em `dist/` (só com os sprites que o jogo usa, uns 3 MB) e envia para a branch
`gh-pages`. Com o GitHub Pages apontando para essa branch, o jogo fica em
`https://ltravezani.github.io/Tiny-RPG-Isekai/`. O build roda localmente porque o pack não está
no repositório. O mesmo `dist/` compactado em .zip pode ser enviado ao itch.io como jogo HTML5.

## Controles

WASD ou setas para andar, Shift para correr, Espaço para a ação no tile à frente
(conversar, fazer carinho em animais, pegar gravetos e pedras, ler o quadro, arar, plantar,
regar, colher, vender na caixa), Q/E para trocar a semente,
Z para dormir e salvar. No quadro de missões, 1-3 troca uma diária (uma vez por dia).

## O que já existe

- Vale do Brotar contínuo, sem ilhas, com colisão de penhascos, água, prédios, árvores e objetos;
  pontes e escadas liberam a passagem.
- Vovó Tereza com diálogo que muda conforme a missão; ela entrega a enxada e o regador.
- Bruno, Lina, Irmã Clara e Dario (`src/data/villagers.json`) passeiam pela vila nos seus horários,
  mostram um balão quando você chega perto e têm falas que mudam com a afinidade (0 a 10 corações,
  sobe uma vez por dia conversando).
- Galinhas, vacas, ovelhas e porcos passeiam e ganham carinho; goblins da Murcha ficam alertas
  quando você se aproxima; gravetos e pedras no chão podem ser coletados e voltam em 3 dias.
- Luz do dia (amanhecer, pôr do sol, noite), clima diário (sol, nublado, chuva que rega a fazenda),
  vagalumes à noite e poeira ao correr.
- Quadro de Missões com 3 diárias por dia (`src/data/dailies.json`): sem tipos repetidos, pelo menos
  uma de fazenda, troca de uma por dia, bônus ao completar as 3 e baú semanal com 7 dias seguidos.
- Troca de paleta em tempo de carga (`src/systems/Palette.js`), usada no cabelo grisalho da Tereza
  e pronta para as variantes Murchas.
- Rafa (corpo + cabelo + ferramentas do pack), andar, correr e animações de trabalho.
- Fazenda na ilha noroeste: arar, semear, regar, crescer na troca de dia, colher e vender.
- Relógio de 14 minutos reais por dia (6h às 2h), estações de 28 dias, energia, desmaio às 2h.
- Missões orientadas a eventos (o começo do Ato 1) e salvamento em `localStorage` ao dormir.

## Estrutura

```
src/main.js            config do Phaser
src/config.js          zoom, área da fazenda, custos de energia
src/scenes/            Boot, Preload, Village, UI, VillageLife (NPCs e animais), Ambience (luz e clima)
src/systems/           EventBus, TimeSystem, FarmSystem, InventorySystem, QuestSystem,
                       DialogueSystem, WeatherSystem, SaveSystem, WorldGrid, Palette
src/entities/          Player, Villager, Animal, FarmPlot, QuestBoard
src/data/              crops.json, quests.json, dailies.json, dialogues.json, villagers.json
tools/                 setup-assets.mjs (preparação dos assets), build-vale.mjs (mapa amplo)
assets/sunnyside/      pack original (gerado, fora do git)
maps/                  mapas Tiled
```

## Créditos

Arte: Sunnyside World, por danieldiggle.
