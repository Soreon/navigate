import Character from './Character.js';
import InputManager from '../common/InputManager.js';
import { RandomNumberGenerator } from '../common/RandomNumberGenerator.js';
import Map from './Map.js';
import { TileSet } from '../common/TileSet.js';
import { CELL_SIZE, DEBUG, SEED } from '../common/constants.js';

// La classe Game est maintenant définie dans son propre module.
export default class Game {
  constructor() {
    // 1. Initialisation des paramètres du jeu
    this.viewportGridSize = 33;
    this.mapGridSize = 100;

    this.canvasWidth = CELL_SIZE * this.viewportGridSize;
    this.canvasHeight = CELL_SIZE * this.viewportGridSize;
    this.walkableArea = 11;

    // 2. Récupération et configuration du canvas
    this.canvas = document.getElementById('canvas');
    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;
    this.canvas.style.width = `${this.canvasWidth}px`;
    this.canvas.style.height = `${this.canvasHeight}px`;
    this.context = this.canvas.getContext('2d');
    
    // 3. Initialisation de l'état du jeu
    this.lastFrameTime = 0;
    this.inputManager = new InputManager();
    this.camera = { x: 0, y: 0 };

    // 4. Chargement des tilesets
    const characterTileset = new TileSet('../../image/character.png', 401, 234, 24, 6, 11);
    const mapTileset = new TileSet('../../image/tileset.png', 1504, 2519, 16, 157, 94);

    // 5. Création des instances principales du jeu
    this.ranugen = new RandomNumberGenerator(SEED);
    this.map = new Map(this.mapGridSize, this.mapGridSize, this.canvas, this.ranugen, mapTileset);

    const startX = Math.floor(this.viewportGridSize / 2);
    const startY = Math.floor(this.viewportGridSize / 2);
    this.character = new Character(startX, startY, characterTileset, this.map);
  }

  start() {
    this.map.populateGrid();
    this.lastFrameTime = Date.now();
    requestAnimationFrame(this.animate.bind(this));
  }

  animate() {
    const now = Date.now();
    const Δt = now - this.lastFrameTime;

    const commands = this.inputManager.getCommands();

    this.clear();

    this.character.update(commands, Δt);
    this.character.animate(now);

    this._updateCamera();

    this.draw();
    if (DEBUG) this.renderDebugInfo();

    this.lastFrameTime = now;
    requestAnimationFrame(this.animate.bind(this));
  }
  
  draw() {
    // On sauvegarde l'état du contexte (pour ne pas affecter le debug-panel par ex.)
    this.context.save();

    // On décale tout le "monde" de la position de la caméra
    // Si la caméra est à (100, 50), tout sera dessiné 100px à gauche et 50px en haut
    this.context.translate(-this.camera.x, -this.camera.y);

    // Ces méthodes dessinent maintenant dans le monde "décalé"
    this.map.draw(this.context);
    this.character.draw(this.context);
    
    // Le debug est dessiné par-dessus, sans être affecté par la translation
    if (DEBUG) this.drawWalkingSpace();
    
    // On restaure le contexte à son état d'origine
    this.context.restore();
  }
  
  clear() {
    this.context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
  }
  
  drawWalkingSpace() {
    const deadZoneWidth = this.walkableArea * CELL_SIZE;
    const deadZoneHeight = this.walkableArea * CELL_SIZE;
    const x1 = this.camera.x + (this.canvasWidth - deadZoneWidth) / 2;
    const y1 = this.camera.y + (this.canvasHeight - deadZoneHeight) / 2;

    this.context.strokeStyle = 'red';
    this.context.translate(-0.5, -0.5);
    this.context.strokeRect(x1, y1, deadZoneWidth, deadZoneHeight);
    this.context.translate(0.5, 0.5);
  }

  _updateCamera() {
    // Position absolue du personnage en pixels sur la grande carte
    const charAbsX = this.character.x * CELL_SIZE + this.character.moveOffsetX;
    const charAbsY = this.character.y * CELL_SIZE + this.character.moveOffsetY;

    // Définition de la "zone morte" (le rectangle rouge) visible à l'écran
    const deadZoneWidth = this.walkableArea * CELL_SIZE;
    const deadZoneHeight = this.walkableArea * CELL_SIZE;

    // Bords de la zone morte par rapport au coin supérieur gauche de la caméra
    const deadZoneX1 = this.camera.x + (this.canvasWidth - deadZoneWidth) / 2;
    const deadZoneX2 = deadZoneX1 + deadZoneWidth;
    const deadZoneY1 = this.camera.y + (this.canvasHeight - deadZoneHeight) / 2;
    const deadZoneY2 = deadZoneY1 + deadZoneHeight;

    // Ajustement de la caméra sur l'axe X
    if (charAbsX < deadZoneX1) {
        this.camera.x = charAbsX - (this.canvasWidth - deadZoneWidth) / 2;
    } else if ((charAbsX + CELL_SIZE) > deadZoneX2) {
        this.camera.x = (charAbsX + CELL_SIZE) - (this.canvasWidth - deadZoneWidth) / 2 - deadZoneWidth;
    }

    // Ajustement de la caméra sur l'axe Y
    if (charAbsY < deadZoneY1) {
        this.camera.y = charAbsY - (this.canvasHeight - deadZoneHeight) / 2;
    } else if ((charAbsY + CELL_SIZE) > deadZoneY2) {
        this.camera.y = (charAbsY + CELL_SIZE) - (this.canvasHeight - deadZoneHeight) / 2 - deadZoneHeight;
    }

    // "Clamping" : Empêcher la caméra de sortir des limites de la carte
    const mapPixelWidth = this.map.gridWidth * CELL_SIZE;
    const mapPixelHeight = this.map.gridHeight * CELL_SIZE;

    this.camera.x = Math.max(0, Math.min(this.camera.x, mapPixelWidth - this.canvasWidth));
    this.camera.y = Math.max(0, Math.min(this.camera.y, mapPixelHeight - this.canvasHeight));
    }

  renderDebugInfo() {
    const debugPanel = document.getElementById('debug-panel');
    debugPanel.innerHTML = `
      <div>Character position: (${this.character.x}, ${this.character.y})</div>
      <div>Character facing: ${this.character.facing}</div>
      <div>Character should face: ${this.character.shouldFace}</div>
      <div>Character is moving: ${!!this.character.isMoving}</div>
      <div>Character is running: ${!!this.character.isRunning}</div>
      <div>Character is on grid: ${this.character.moveOffsetX + this.character.moveOffsetY === 0}</div>
      <div>Character move offset: (${this.character.moveOffsetX.toFixed(2)}, ${this.character.moveOffsetY.toFixed(2)})</div>
    `;
  }
}
