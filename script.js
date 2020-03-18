const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');

// Orientation
const DOWN = 0;
const LEFT = 1;
const UP = 2;
const RIGHT = 3;
const WALK_SEQUENCE = [1, 0, 5, 0];
const RUN_SEQUENCE = [2, 3, 4, 3];

const canvasWidth = 1000;
const canvasHeight = 1000;
canvas.width = canvasWidth;
canvas.height = canvasHeight;

const tileSize = 16;
const tilesetWidth = 94;
const tilesetHeight = 157;
const tileset = new Image(1504, 2519);
tileset.src = 'tileset.png';

const characterTileSize = 24;
const characterTilesetWidth = 11;
const characterTilesetHeight = 6;
const characterTileset = new Image(401, 234);
characterTileset.src = 'character.png';

let characterX = 10;
let characterY = 10;
let characterFacing = DOWN;
let isRunning = false;
let isWalking = false;
let isMoving = false;
let sequenceStep = 0;

const gridWidth = (canvasWidth / tileSize) | 0;
const gridHeight = (canvasHeight / tileSize) | 0;
const grid = new Uint8Array(gridWidth * gridHeight);

let keyPressed = [];

function weightedRandom(prob) {
    let i, sum = 0, tot = 0, r = Math.random();
    for (i in prob) tot += prob[i];
    for (i in prob) {
        sum += prob[i];
        if (r * tot <= sum) return i;
    }
}

function populateGrid() {
    for (let i = 0; i < gridHeight; i += 1) {
        for (let j = 0; j < gridWidth; j += 1) {
            let index = getGridIndex(j, i);
            grid[index] = weightedRandom({
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
                105: 4
            });
        }
    }
}

function getTileCoordinates(i) {
    return { x: i % tilesetWidth, y: i / tilesetWidth | 0 };
}

function getGridIndex(x, y) {
    return (y * gridWidth) + x;
}

function drawGrid() {
    for (let i = 0; i < gridHeight; i += 1) {
        for (let j = 0; j < gridWidth; j += 1) {
            let gridIndex = getGridIndex(j, i);
            let gridValue = grid[gridIndex];
            let tileCoordinates = getTileCoordinates(gridValue);
            let xInTileset = tileCoordinates.x * tileSize;
            let yInTileset = tileCoordinates.y * tileSize;
            let xOnMap = j * tileSize;
            let yOnMap = i * tileSize;
            context.drawImage(tileset, xInTileset, yInTileset, tileSize, tileSize, xOnMap, yOnMap, tileSize, tileSize);
        }
    }
}

function drawCharacter() {
    let tileCoordinates = getTileCoordinates(characterFacing);
    let xInTileset = tileCoordinates.x * characterTileSize;
    let yInTileset = (tileCoordinates.y + sequenceStep) * characterTileSize;
    let offset = (characterTileSize + tileSize) / 2;
    let xOnMap = (characterX * tileSize) - offset;
    let yOnMap = (characterY * tileSize) - offset - offset;
    context.drawImage(characterTileset, xInTileset, yInTileset, characterTileSize, characterTileSize, xOnMap, yOnMap, characterTileSize, characterTileSize);
}


function moveCharater() {
    isRunning = keyPressed[16];
    isMoving = false;

    if(keyPressed[37]) {
        characterFacing = LEFT;
        isMoving = true;
    }
    if(keyPressed[38]) {
        characterFacing = UP;
        isMoving = true;
    }
    if(keyPressed[39]) {
        characterFacing = RIGHT;
        isMoving = true;
    }
    if(keyPressed[40]) {
        characterFacing = DOWN;
        isMoving = true;
    }
}

function animateCharacter() {
    if (isMoving) {
        const tn = (new Date()).getTime();
        const speed = isRunning ? 120 : 150;
        const Δt = Math.floor(tn / speed);
        const sequence = isRunning ? RUN_SEQUENCE : WALK_SEQUENCE;
        const sequenceIndex = Δt % sequence.length;
        sequenceStep = sequence[sequenceIndex];
    } else {
        sequenceStep = 0;
    }
}

function clear() {
    context.clearRect(0, 0, canvasWidth, canvasHeight);
}

function draw() {
    drawGrid();
    drawCharacter();
}

function animate() {
    clear();
    moveCharater();
    animateCharacter();
    draw();
    requestAnimationFrame(animate);
}


document.addEventListener('keydown', (e) => { keyPressed[e.keyCode] = true; });
document.addEventListener('keyup', (e) => { keyPressed[e.keyCode] = false; });

populateGrid();
animate();