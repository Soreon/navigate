import { TileSet } from '../class/TileSet.js';
import { DEBUG, GRASS_TILETYPE_WEIGHTS } from '../constants.js';

export default class Map {
  constructor(canvas, ranugen, tileset) {
    this.ranugen = ranugen;
    this.canvas = canvas;
    this.tileset = tileset;
    this.gridWidth = Math.ceil(canvas.width / this.tileset.tileSize);
    this.gridHeight = Math.ceil(canvas.height / this.tileset.tileSize);
    this.grid = new Uint8Array(this.gridWidth * this.gridHeight);
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
    // Draw a grid with lines to show the tile boundaries
    context.strokeStyle = 'black';
    context.lineWidth = 1;
    // offset the grid by half a pixel to avoid anti-aliasing
    context.translate(-0.5, -0.5);
    for (let i = 0; i < this.gridHeight; i += 1) {
      context.beginPath();
      context.moveTo(0, i * this.tileset.tileSize);
      context.lineTo(this.canvas.width, i * this.tileset.tileSize);
      context.stroke();
    }
    for (let j = 0; j < this.gridWidth; j += 1) {
      context.beginPath();
      context.moveTo(j * this.tileset.tileSize, 0);
      context.lineTo(j * this.tileset.tileSize, this.canvas.height);
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
