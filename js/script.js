import Character from './Character.js';
import { RandomNumberGenerator } from './RandomNumberGenerator.js';
import TileMap from './TileMap.js';
import { CELL_SIZE, SEED } from './constants.js';

const gridSize = 32;
const canvasWidth = CELL_SIZE * gridSize;
const canvasHeight = CELL_SIZE * gridSize;

const canvas = document.getElementById('canvas');
canvas.width = canvasWidth;
canvas.height = canvasHeight;

const context = canvas.getContext('2d');

const ranugen = new RandomNumberGenerator(SEED);
const character = new Character(Math.floor(gridSize / 2) - 1, Math.floor(gridSize / 2) - 1);
const tileMap = new TileMap(canvas, ranugen);

window.character = character;

Object.defineProperty(window, 'now', {
  get() {
    return (new Date()).getTime();
  },
});

Object.defineProperty(window, 'lastFrameTime', {
  get() {
    return window._lastFrameTime || window.now;
  },
  set(value) {
    this._lastFrameTime = value;
  },
});

const keyPressed = {};

function clear() {
  context.clearRect(0, 0, canvasWidth, canvasHeight);
}

function draw() {
  tileMap.draw(context);
  character.draw(context);
}

function animate() {
  clear();
  character.move(keyPressed);
  character.animate();
  draw();
  requestAnimationFrame(animate);
  window.lastFrameTime = window.now;
}

document.addEventListener('keydown', (e) => { keyPressed[e.key] = true; });
document.addEventListener('keyup', (e) => { keyPressed[e.key] = false; });

tileMap.populateGrid();
requestAnimationFrame(animate);
