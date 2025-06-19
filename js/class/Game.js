// js/class/Game.js

import Character from './Character.js';
import InputManager from './InputManager.js';
import { RandomNumberGenerator } from './RandomNumberGenerator.js';
import Map from './Map.js';
import { TileSet } from './TileSet.js';
import { CELL_SIZE, DEBUG, SEED } from '../constants.js';

// La classe Game est maintenant définie dans son propre module.
export default class Game {
  constructor() {
    // 1. Initialisation des paramètres du jeu
    this.gridSize = 33;
    this.canvasWidth = CELL_SIZE * this.gridSize;
    this.canvasHeight = CELL_SIZE * this.gridSize;
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

    // 4. Chargement des tilesets
    const characterTileset = new TileSet('../image/character.png', 401, 234, 24, 6, 11);
    const mapTileset = new TileSet('../image/tileset.png', 1504, 2519, 16, 157, 94);

    // 5. Création des instances principales du jeu
    this.ranugen = new RandomNumberGenerator(SEED);
    this.map = new Map(this.canvas, this.ranugen, mapTileset);
    const startX = Math.floor(this.gridSize / 2);
    const startY = Math.floor(this.gridSize / 2);
    this.character = new Character(startX, startY, characterTileset);
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

    this.draw();
    if (DEBUG) this.renderDebugInfo();

    this.lastFrameTime = now;
    requestAnimationFrame(this.animate.bind(this));
  }
  
  draw() {
    this.map.draw(this.context);
    this.character.draw(this.context);
    if (DEBUG) this.drawWalkingSpace();
  }
  
  clear() {
    this.context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
  }
  
  drawWalkingSpace() {
    const x1 = (this.gridSize / 2) - (this.walkableArea / 2);
    const y1 = (this.gridSize / 2) - (this.walkableArea / 2);

    this.context.strokeStyle = 'red';
    this.context.translate(-0.5, -0.5);
    this.context.strokeRect(
      x1 * CELL_SIZE,
      y1 * CELL_SIZE,
      this.walkableArea * CELL_SIZE,
      this.walkableArea * CELL_SIZE,
    );
    this.context.translate(0.5, 0.5);
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