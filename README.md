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

`setup:assets` faz três coisas:

1. Extrai `Sunnyside_World_Assets/` para `assets/sunnyside/`, com os nomes do pack intactos.
2. Junta em tiras PNG (`assets/generated/gm/`) os ~470 sprites que só existem no projeto
   GameMaker do pack (barris, baús, poços, minérios, moinho, móveis, poeira...), com um manifesto
   de origem e velocidade de animação.
3. Converte a sala de exemplo do pack (a mesma da imagem de divulgação) para um mapa Tiled
   em `maps/vale_exemplo.json`, que abre no Tiled para edição.

## Controles

WASD ou setas para andar, Shift para correr, Espaço para a ação no tile à frente
(arar, plantar, regar, colher, vender na caixa), Q/E para trocar a semente, Z para dormir e salvar.

## O que já existe

- Vale do Brotar provisório: o mapa de exemplo do pack, com colisão de penhascos, água,
  prédios, árvores e objetos; pontes e escadas liberam a passagem.
- Rafa (corpo + cabelo + ferramentas do pack), andar, correr e animações de trabalho.
- Fazenda na ilha noroeste: arar, semear, regar, crescer na troca de dia, colher e vender.
- Relógio de 14 minutos reais por dia (6h às 2h), estações de 28 dias, energia, desmaio às 2h.
- Missões orientadas a eventos (as duas primeiras do Ato 1) e salvamento em `localStorage` ao dormir.

## Estrutura

```
src/main.js            config do Phaser
src/config.js          zoom, área da fazenda, custos de energia
src/scenes/            Boot, Preload, Village, UI
src/systems/           EventBus, TimeSystem, FarmSystem, InventorySystem, QuestSystem, SaveSystem, WorldGrid
src/entities/          Player, FarmPlot
src/data/              crops.json, quests.json
tools/setup-assets.mjs preparação dos assets
assets/sunnyside/      pack original (gerado, fora do git)
maps/                  mapas Tiled
```

## Créditos

Arte: Sunnyside World, por danieldiggle.
