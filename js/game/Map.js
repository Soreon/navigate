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
    if (this.isFromEditor && this.editorLayers) {
      this.drawEditorLayers(context);
    } else {
      this.drawProceduralGrid(context);
    }

    if (DEBUG) this.drawTileBoundaries(context);
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
