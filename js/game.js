import Character from './class/Character.js';
import { RandomNumberGenerator } from './class/RandomNumberGenerator.js';
import Map from './class/Map.js';
import { CELL_SIZE, DEBUG, SEED } from './constants.js';

const gridSize = 33;
const canvasWidth = CELL_SIZE * gridSize;
const canvasHeight = CELL_SIZE * gridSize;
const walkableArea = 11;

const canvas = document.getElementById('canvas');
canvas.width = canvasWidth;
canvas.height = canvasHeight;
canvas.style.width = `${canvasWidth}px`;
canvas.style.height = `${canvasHeight}px`;

const context = canvas.getContext('2d');

const ranugen = new RandomNumberGenerator(SEED);
const character = new Character(Math.floor(gridSize / 2), Math.floor(gridSize / 2));
const map = new Map(canvas, ranugen);

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

function drawWalkingSpace() {
  const x1 = (gridSize / 2) - (walkableArea / 2);
  const y1 = (gridSize / 2) - (walkableArea / 2);

  context.strokeStyle = 'red';
  context.translate(-0.5, -0.5);
  context.strokeRect(
    x1 * CELL_SIZE,
    y1 * CELL_SIZE,
    walkableArea * CELL_SIZE,
    walkableArea * CELL_SIZE,
    );
  context.translate(0.5, 0.5);
}

function draw() {
  map.draw(context);
  character.draw(context);
  if (DEBUG) drawWalkingSpace();
}

function renderDebugInfo() {
  const debugPanel = document.getElementById('debug-panel');

  debugPanel.innerHTML = `
    <div>Character position: (${character.x}, ${character.y})</div>
    <div>Character facing: ${character.facing}</div>
    <div>Character should face: ${character.shouldFace}</div>
    <div>Character is moving: ${!!character.isMoving}</div>
    <div>Character is running: ${!!character.isRunning}</div>
    <div>Character is on grid: ${character.moveOffsetX + character.moveOffsetY === 0}</div>
    <div>Character move offset: (${character.moveOffsetX}, ${character.moveOffsetY})</div>
    `;
}

function animate() {
  clear();
  character.move(keyPressed);
  character.animate();
  draw();
  if (DEBUG) renderDebugInfo();
  requestAnimationFrame(animate);
  window.lastFrameTime = window.now;
}

document.addEventListener('keydown', (e) => { keyPressed[e.key] = true; });
document.addEventListener('keyup', (e) => { keyPressed[e.key] = false; });

map.populateGrid();
requestAnimationFrame(animate);
