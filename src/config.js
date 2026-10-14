export const ZOOM = 3;
export const TILE = 16;

// Ordem de desenho: camadas de tiles usam o próprio índice; personagens, árvores e
// culturas são ordenados por Y a partir de DEPTH.ysort; nuvens ficam por cima de tudo.
export const DEPTH = { ysort: 1000, sky: 10000 };

// Área da fazenda do Semeador em maps/vale.json (antiga ilha da fazenda, noroeste), em tiles.
export const FARM_ZONE = { x: 40, y: 32, w: 19, h: 10 };
export const SPAWN_TILE = { x: 53, y: 38 };
export const SELL_BOX_TILE = { x: 56, y: 40 };
export const QUEST_BOARD_TILE = { x: 59, y: 41 };

export const MAX_ENERGY = 100;
export const ENERGY_COST = { till: 2, plant: 1, water: 1, harvest: 0 };
