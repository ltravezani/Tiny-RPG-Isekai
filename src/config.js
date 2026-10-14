export const ZOOM = 3;
export const TILE = 16;

// Ordem de desenho: camadas de tiles usam o próprio índice; personagens, árvores e
// culturas são ordenados por Y a partir de DEPTH.ysort; nuvens ficam por cima de tudo.
export const DEPTH = { ysort: 1000, sky: 10000 };

// Área da fazenda do Semeador no mapa de exemplo (ilha da fazenda, noroeste), em tiles.
export const FARM_ZONE = { x: 9, y: 8, w: 10, h: 7 };
export const SPAWN_TILE = { x: 13, y: 12 };
export const SELL_BOX_TILE = { x: 16, y: 14 };

export const MAX_ENERGY = 100;
export const ENERGY_COST = { till: 2, plant: 1, water: 1, harvest: 0 };
