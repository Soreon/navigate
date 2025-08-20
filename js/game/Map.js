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
    this.editorLayers = null; // Layers depuis l'éditeur
    this.isFromEditor = false; // Flag pour savoir si on utilise les données éditeur
  }

  isWalkable(x, y) {
    if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) {
      return false;
    }
    const tileId = this.grid[this.getGridIndex(x, y)];
    return !NON_WALKABLE_TILES.has(tileId);
  }

  populateGrid() {
    console.log('=== GAME MAP LOADING DEBUG ===');
    
    // Essayer de charger une map depuis l'éditeur
    const savedGameMap = localStorage.getItem('gameMap');
    console.log('Raw localStorage data:', savedGameMap ? 'Found' : 'Not found');
    
    if (savedGameMap) {
      try {
        const gameData = JSON.parse(savedGameMap);
        console.log('Parsed gameData:', {
          hasLayers: !!gameData.layers,
          layerCount: gameData.layers ? gameData.layers.length : 0,
          timestamp: gameData.timestamp,
          gridWidth: gameData.gridWidth,
          gridHeight: gameData.gridHeight
        });
        
        if (gameData.layers && gameData.gridWidth === this.gridWidth && gameData.gridHeight === this.gridHeight) {
          // Charger les layers depuis l'éditeur
          this.editorLayers = gameData.layers;
          this.isFromEditor = true;
          
          console.log('✓ Map loaded from editor:', gameData.timestamp);
          console.log('Layers loaded:', this.editorLayers.length);
          return;
        } else {
          console.warn('Invalid editor data format');
        }
      } catch (e) {
        console.warn('Failed to parse map from editor:', e);
      }
    }
    
    // Génération procédurale par défaut si pas de map de l'éditeur
    console.log('Using procedural map generation');
    this.isFromEditor = false;
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

  drawTileBoundaries(context, camera) {
    // Style identique à l'éditeur
    const { tileSize } = this.tileset;
    const viewWidth = this.canvas.width;
    const viewHeight = this.canvas.height;

    // Calculer seulement les lignes visibles (optimisation comme l'éditeur)
    const startX = Math.floor(camera.x / tileSize);
    const endX = startX + Math.ceil(viewWidth / tileSize) + 1;
    const startY = Math.floor(camera.y / tileSize);
    const endY = startY + Math.ceil(viewHeight / tileSize) + 1;

    // Style identique à l'éditeur : gris clair avec transparence
    context.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    context.lineWidth = 1;
    context.translate(-0.5, -0.5); // Pour des lignes nettes

    // Dessiner les lignes horizontales visibles
    for (let i = startY; i <= Math.min(endY, this.gridHeight); i += 1) {
      context.beginPath();
      context.moveTo(startX * tileSize, i * tileSize);
      context.lineTo(Math.min(endX, this.gridWidth) * tileSize, i * tileSize);
      context.stroke();
    }

    // Dessiner les lignes verticales visibles
    for (let j = startX; j <= Math.min(endX, this.gridWidth); j += 1) {
      context.beginPath();
      context.moveTo(j * tileSize, startY * tileSize);
      context.lineTo(j * tileSize, Math.min(endY, this.gridHeight) * tileSize);
      context.stroke();
    }
    
    context.translate(0.5, 0.5);
  }

  draw(context, camera) {
    if (this.isFromEditor && this.editorLayers) {
      this.drawEditorLayers(context);
    } else {
      this.drawProceduralGrid(context);
    }

    if (DEBUG) this.drawTileBoundaries(context, camera);
  }

  drawEditorLayers(context) {
    // Dessiner layer par layer pour préserver la transparence
    for (const layer of this.editorLayers) {
      for (const [tileKey, tileIndex] of Object.entries(layer.tiles)) {
        const [x, y] = tileKey.split(',').map(coord => parseInt(coord.slice(1)));
        this.tileset.drawTileOnCanvas(
          context,
          x * this.tileset.tileSize,
          y * this.tileset.tileSize,
          tileIndex
        );
      }
    }
  }

  drawProceduralGrid(context) {
    for (let i = 0; i < this.gridHeight; i += 1) {
      for (let j = 0; j < this.gridWidth; j += 1) {
        const gridIndex = this.getGridIndex(j, i);
        const gridValue = this.grid[gridIndex];
        this.tileset.drawTileOnCanvas(context, j * this.tileset.tileSize, i * this.tileset.tileSize, gridValue);
      }
    }
  }
}
