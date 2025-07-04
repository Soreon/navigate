import { TileSet } from '../common/TileSet.js';
import { DEBUG, GRASS_TILETYPE_WEIGHTS, NON_WALKABLE_TILES  } from '../common/constants.js';

export default class Map {
  constructor(widthInTiles, heightInTiles, canvas, ranugen, tileset) {
    this.ranugen = ranugen;
    this.canvas = canvas;
    this.tileset = tileset;
    this.gridWidth = widthInTiles;
    this.gridHeight = heightInTiles;
    this.grid = new Uint8Array(this.gridWidth * this.gridHeight);
  }

  isWalkable(x, y) {
    if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) {
      return false;
    }
    const tileId = this.grid[this.getGridIndex(x, y)];
    return !NON_WALKABLE_TILES.has(tileId);
  }

  populateGrid() {
    for (let i = 0; i < this.gridHeight; i += 1) {
      for (let j = 0; j < this.gridWidth; j += 1) {
        const index = this.getGridIndex(j, i);
        this.grid[index] = this.ranugen.weightedRandom(GRASS_TILETYPE_WEIGHTS);
      }
    }
  }

  getGridIndex(x, y) {
    return (y * this.gridWidth) + x;
  }

  drawTileBoundaries(context) {
    // Calculer la taille totale de la carte en pixels
    const mapPixelWidth = this.gridWidth * this.tileset.tileSize;
    const mapPixelHeight = this.gridHeight * this.tileset.tileSize;

    context.strokeStyle = 'black';
    context.lineWidth = 1;
    // décaler la grille d'un demi-pixel pour éviter l'anti-aliasing
    context.translate(-0.5, -0.5);

    // Dessiner les lignes horizontales sur toute la largeur de la carte
    // Note : On utilise <= pour dessiner aussi la toute dernière ligne
    for (let i = 0; i <= this.gridHeight; i += 1) {
      context.beginPath();
      context.moveTo(0, i * this.tileset.tileSize);
      context.lineTo(mapPixelWidth, i * this.tileset.tileSize);
      context.stroke();
    }

    // Dessiner les lignes verticales sur toute la hauteur de la carte
    for (let j = 0; j <= this.gridWidth; j += 1) {
      context.beginPath();
      context.moveTo(j * this.tileset.tileSize, 0);
      context.lineTo(j * this.tileset.tileSize, mapPixelHeight);
      context.stroke();
    }
    
    context.translate(0.5, 0.5);
  }

  draw(context) {
    for (let i = 0; i < this.gridHeight; i += 1) {
      for (let j = 0; j < this.gridWidth; j += 1) {
        const gridIndex = this.getGridIndex(j, i);
        const gridValue = this.grid[gridIndex];
        this.tileset.drawTileOnCanvas(context, j * this.tileset.tileSize, i * this.tileset.tileSize, gridValue);
      }
    }

    if (DEBUG) this.drawTileBoundaries(context);
  }
}
