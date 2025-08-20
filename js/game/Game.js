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
    this.mapGridSize = 100;
    this.walkableArea = 11;

    // 2. Récupération et configuration du canvas en plein écran
    this.canvas = document.getElementById('canvas');
    this.context = this.canvas.getContext('2d');
    
    // Configurer le canvas en plein écran
    this.setupFullscreenCanvas();
    
    // Écouter les redimensionnements de fenêtre
    window.addEventListener('resize', this.handleResize.bind(this));
    
    // 3. Initialisation de l'état du jeu
    this.lastFrameTime = 0;
    this.inputManager = new InputManager();
    this.camera = { x: 0, y: 0 }; // Caméra au coin haut-gauche

    // 4. Chargement des tilesets
    const characterTileset = new TileSet('../../image/character.png', 401, 234, 24, 6, 11);
    const mapTileset = new TileSet('../../image/tileset.png', 1504, 2519, 16, 157, 94);

    // 5. Création des instances principales du jeu
    this.ranugen = new RandomNumberGenerator(SEED);
    this.map = new Map(this.mapGridSize, this.mapGridSize, this.canvas, this.ranugen, mapTileset);

    // Position de départ du personnage dans le coin en haut à gauche
    const startX = 1; // Position X proche du bord gauche
    const startY = 1; // Position Y proche du bord haut
    this.character = new Character(startX, startY, characterTileset, this.map);
  }

  setupFullscreenCanvas() {
    // Padding fixe de 16px de chaque côté = 32px total
    const paddingSize = 32;
    
    // Obtenir les dimensions disponibles après soustraction du padding
    this.canvasWidth = window.innerWidth - paddingSize;
    this.canvasHeight = window.innerHeight - paddingSize;
    
    // S'assurer que les dimensions sont positives
    this.canvasWidth = Math.max(300, this.canvasWidth);
    this.canvasHeight = Math.max(300, this.canvasHeight);
    
    // Calculer le nombre de tiles visibles
    this.viewportGridSizeX = Math.ceil(this.canvasWidth / CELL_SIZE);
    this.viewportGridSizeY = Math.ceil(this.canvasHeight / CELL_SIZE);
    this.viewportGridSize = Math.max(this.viewportGridSizeX, this.viewportGridSizeY);
    
    // Configurer le canvas
    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;
    this.canvas.style.width = `${this.canvasWidth}px`;
    this.canvas.style.height = `${this.canvasHeight}px`;
    
    console.log(`Canvas setup: ${this.canvasWidth}x${this.canvasHeight} (${this.viewportGridSizeX}x${this.viewportGridSizeY} tiles) | Padding: 16px`);
  }

  handleResize() {
    this.setupFullscreenCanvas();
    // Redessiner immédiatement après le redimensionnement
    this.draw();
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
    this.map.draw(this.context, this.camera);
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

    this.context.strokeStyle = 'rgba(255, 0, 0, 0.8)';
    this.context.lineWidth = 2;
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
      <div><strong>🎮 GAME DEBUG</strong></div>
      <div>Screen: ${this.canvasWidth}×${this.canvasHeight}px</div>
      <div>Viewport: ${this.viewportGridSizeX}×${this.viewportGridSizeY} tiles</div>
      <div>Camera: (${Math.round(this.camera.x)}, ${Math.round(this.camera.y)})</div>
      <div>Map: ${this.map.isFromEditor ? 'FROM EDITOR' : 'PROCEDURAL'}</div>
      <hr style="margin: 8px 0; border: 1px solid #555;">
      <div><strong>👤 CHARACTER</strong></div>
      <div>Position: (${this.character.x}, ${this.character.y})</div>
      <div>Facing: ${this.character.facing}</div>
      <div>Moving: ${!!this.character.isMoving}</div>
      <div>Running: ${!!this.character.isRunning}</div>
      <div>On grid: ${this.character.moveOffsetX + this.character.moveOffsetY === 0}</div>
      <div>Offset: (${this.character.moveOffsetX.toFixed(2)}, ${this.character.moveOffsetY.toFixed(2)})</div>
    `;
  }
}
