const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');

// Orientation
const DOWN = 0;
const LEFT = 1;
const UP = 2;
const RIGHT = 3;
const WALK_SEQUENCE = [1, 3, 5, 3];
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
characterX = 10;
characterY = 10;
characterFacing = DOWN;
isRunning = false;
isWalking = false;
isMoving = false;

const gridWidth = (canvasWidth / tileSize) | 0;
const gridHeight = (canvasHeight / tileSize) | 0;
const grid = new Uint8Array(gridWidth * gridHeight);

let keyPressed = {
    up: false,
    right: false,
    down: false,
    left: false,
}

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
    let yInTileset = tileCoordinates.y * characterTileSize;
    let offset = (characterTileSize + tileSize) / 2;
    let xOnMap = (characterX * tileSize) - offset;
    let yOnMap = (characterY * tileSize) - offset - offset;
    context.drawImage(characterTileset, xInTileset, yInTileset, characterTileSize, characterTileSize, xOnMap, yOnMap, characterTileSize, characterTileSize);
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
    draw();
    if (isMoving) stepForward();
    requestAnimationFrame(animate);
}

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function stepForward() {
    const t = 100;
    setTimeout(() => {
        switch (characterFacing) {
            case LEFT:
                characterX -= 0.5;
                break;
            case UP:
                characterY -= 0.5;
                break;
            case RIGHT:
                characterX += 0.5;
                break;
            case DOWN:
                characterY += 0.5;
                break;
        }
        isMoving = false;
    }, 100);
}

document.addEventListener('keydown', async (e) => {
    isMoving = true;
    isRunning = e.shiftKey;
    switch (e.keyCode) {
        case 37:
            characterFacing = LEFT;
            keyPressed.left = true;
            break;
        case 38:
            characterFacing = UP;
            keyPressed.up = true;
            break;
        case 39:
            characterFacing = RIGHT;
            keyPressed.right = true;
            break;
        case 40:
            characterFacing = DOWN;
            keyPressed.down = true;
            break;
    }
});

document.addEventListener('keyup', async (e) => {
    switch (e.keyCode) {
        case 37: keyPressed.left = false; break;
        case 38: keyPressed.up = false; break;
        case 39: keyPressed.right = false; break;
        case 40: keyPressed.down = false; break;
    }
});

populateGrid();
animate();