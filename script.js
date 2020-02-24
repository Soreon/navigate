const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');

const canvasWidth = 2000;
const canvasHeight = 2000;

const tileSize = 16;

const gridWidth = 125;
const gridHeight = 125;
const grid = new Uint8Array(gridWidth * gridHeight);

const nbTilesInWidth = 94;
const nbTilesInHeight = 157;
const tileset = new Image(1504, 2519);
tileset.src = 'tileset.png';

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
    return { x: i % nbTilesInWidth, y: i / nbTilesInWidth | 0 }; 
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
            context.drawImage(tileset, tileCoordinates.x * tileSize, tileCoordinates.y * tileSize, tileSize, tileSize, i * tileSize, j * tileSize, tileSize, tileSize);
        }
    }
}

tileset.onload = () => {
    populateGrid();
    drawGrid();
};
