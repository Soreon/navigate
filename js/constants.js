export const DOWN = 0;
export const LEFT = 1;
export const UP = 2;
export const RIGHT = 3;
export const WALK_SEQUENCE = [1, 0, 5, 0];
export const RUN_SEQUENCE = [2, 3, 4, 3];
export const START_TIME = (new Date()).getTime();
export const CELL_SIZE = 16;
export const SEED = 0x2F6E2B1;
export const GRASS_TILETYPE_WEIGHTS = {
  1: 300,
  2: 300,
  3: 100,
  4: 100,
  5: 120,
  94: 4,
  95: 4,
  96: 4,
  97: 4,
  98: 4,
  99: 4,
  100: 4,
  101: 4,
  102: 4,
  103: 4,
  104: 4,
  105: 4,
};
export const NON_WALKABLE_TILES = new Set([
]);
export const DEBUG = true;
