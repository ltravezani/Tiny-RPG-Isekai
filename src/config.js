export const ZOOM = 3;
export const TILE = 16;

// Ordem de desenho: camadas de tiles usam o próprio índice; personagens, árvores e
// culturas são ordenados por Y a partir de DEPTH.ysort; nuvens ficam por cima de tudo.
export const DEPTH = { ysort: 1000, sky: 10000 };

// Fazenda, casas, portões e áreas de caça vêm da camada "poi" do mapa (tools/world/build-world.mjs).

export const MAX_ENERGY = 100;
export const ENERGY_COST = { till: 2, plant: 1, water: 1, harvest: 0 };
