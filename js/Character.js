import { TileSet } from './TileSet.js';
import {
  DOWN, LEFT, RIGHT, UP, WALK_SEQUENCE, RUN_SEQUENCE, CELL_SIZE,
} from './constants.js';

const MOVE_DURATION = 250;
const X_OFFSET = 7;
const Y_OFFSET = 5;

export default class Character {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.moveOffsetX = 0;
    this.moveOffsetY = 0;
    this.facing = DOWN;
    this.isRunning = false;
    this.isWalking = false;
    this.isMoving = false;
    this.sequenceStep = 0;
    this.tileset = new TileSet('../image/character.png', 401, 234, 24, 6, 11);
  }

  determineOrientation(keyPressed) {
    const {
      ArrowUp, ArrowRight, ArrowDown, ArrowLeft,
    } = keyPressed;

    if (ArrowUp && !ArrowRight && !ArrowDown && !ArrowLeft && this.facing !== UP) {
      this.facing = UP;
    } else if (ArrowRight && !ArrowUp && !ArrowDown && !ArrowLeft && this.facing !== RIGHT) {
      this.facing = RIGHT;
    } else if (ArrowDown && !ArrowUp && !ArrowRight && !ArrowLeft && this.facing !== DOWN) {
      this.facing = DOWN;
    } else if (ArrowLeft && !ArrowUp && !ArrowRight && !ArrowDown && this.facing !== LEFT) {
      this.facing = LEFT;
    }
  }

  moveWhenKeyIsPressed(keyPressed, Δx, Δy) {
    const { Shift } = keyPressed;

    this.isMoving = true;
    this.isRunning = Shift;

    this.determineOrientation(keyPressed);

    switch (this.facing) {
      case UP:
        if (this.moveOffsetX !== 0) break;
        this.moveOffsetY -= Δy;
        if (this.moveOffsetY < -CELL_SIZE) {
          this.y -= 1;
          this.moveOffsetY += CELL_SIZE;
        }
        break;
      case RIGHT:
        if (this.moveOffsetY !== 0) break;
        this.moveOffsetX += Δx;
        if (this.moveOffsetX > CELL_SIZE) {
          this.x += 1;
          this.moveOffsetX -= CELL_SIZE;
        }
        break;
      case DOWN:
        if (this.moveOffsetX !== 0) break;
        this.moveOffsetY += Δy;
        if (this.moveOffsetY > CELL_SIZE) {
          this.y += 1;
          this.moveOffsetY -= CELL_SIZE;
        }
        break;
      case LEFT:
        if (this.moveOffsetY !== 0) break;
        this.moveOffsetX -= Δx;
        if (this.moveOffsetX < -CELL_SIZE) {
          this.x -= 1;
          this.moveOffsetX += CELL_SIZE;
        }
        break;
      default: break;
    }
  }

  moveXUntilBeingOnGrid(Δx) {
    if (this.moveOffsetX === 0) return;

    if (Math.abs(this.moveOffsetX) < CELL_SIZE) {
      if (this.facing === RIGHT) {
        this.moveOffsetX += Δx;
      } else if (this.facing === LEFT) {
        this.moveOffsetX -= Δx;
      } else {
        this.moveOffsetX = 0;
        this.isMoving = false;
      }
    } else {
      this.moveOffsetX = 0;
      this.isMoving = false;
      if (this.facing === RIGHT) {
        this.x += 1;
      } else if (this.facing === LEFT) {
        this.x -= 1;
      }
    }
  }

  moveYUntilBeingOnGrid(Δy) {
    if (this.moveOffsetY === 0) return;

    if (Math.abs(this.moveOffsetY) < CELL_SIZE) {
      if (this.facing === DOWN) {
        this.moveOffsetY += Δy;
      } else if (this.facing === UP) {
        this.moveOffsetY -= Δy;
      } else {
        this.moveOffsetY = 0;
        this.isMoving = false;
      }
    } else {
      this.moveOffsetY = 0;
      this.isMoving = false;
      if (this.facing === DOWN) {
        this.y += 1;
      } else if (this.facing === UP) {
        this.y -= 1;
      }
    }
  }

  moveUntilBeingOnGrid(Δx, Δy) {
    this.moveXUntilBeingOnGrid(Δx);
    this.moveYUntilBeingOnGrid(Δy);
  }

  move(keyPressed) {
    const {
      ArrowUp, ArrowRight, ArrowDown, ArrowLeft,
    } = keyPressed;

    this.arrowKeyPressed = ArrowUp || ArrowRight || ArrowDown || ArrowLeft;

    const { now, lastFrameTime } = window;

    // Calculate the distance the character should move based on the time elapsed since the last frame
    const Δt = now - lastFrameTime;
    const Δx = (CELL_SIZE / MOVE_DURATION) * Δt;
    const Δy = (CELL_SIZE / MOVE_DURATION) * Δt;

    if (this.arrowKeyPressed) {
      this.moveWhenKeyIsPressed(keyPressed, Δx, Δy);
    } else {
      this.moveUntilBeingOnGrid(Δx, Δy);
    }
  }

  animate() {
    if (!this.isMoving) {
      this.sequenceStep = 0;
      return;
    }

    const sequence = this.isRunning ? RUN_SEQUENCE : WALK_SEQUENCE;

    const frameDuration  = this.isRunning ? 120 : 150;
    const { now } = window;
    const Δt = Math.round(now / frameDuration);
    const sequenceIndex = Δt % sequence.length;
    this.sequenceStep = sequence[sequenceIndex];
  }

  draw(context) {
    // Get the tile coordinates for the character's current facing direction
    const tileCoordinates = this.tileset.getTileCoordinates(this.facing);

    // Calculate the x and y coordinates of the character's sprite in the tileset image
    const xInTileset = tileCoordinates.column * this.tileset.tileSize;
    const yInTileset = (tileCoordinates.row + this.sequenceStep) * this.tileset.tileSize;

    // Calculate the x and y coordinates of the character's position on the canvas
    const xOnMap = (this.x * CELL_SIZE) - (this.tileset.tileSize / 2) + X_OFFSET + this.moveOffsetX;
    const yOnMap = (this.y * CELL_SIZE) - (this.tileset.tileSize / 2) + Y_OFFSET + this.moveOffsetY;

    // Draw the character's sprite on the canvas
    context.drawImage(
      this.tileset.image,     // The tileset image containing the character's sprite
      xInTileset,             // The x coordinate of the character's sprite in the tileset image
      yInTileset,             // The y coordinate of the character's sprite in the tileset image
      this.tileset.tileSize,  // The width of the character's sprite in the tileset image
      this.tileset.tileSize,  // The height of the character's sprite in the tileset image
      xOnMap,                 // The x coordinate of the character's position on the canvas
      yOnMap,                 // The y coordinate of the character's position on the canvas
      this.tileset.tileSize,  // The width of the character's sprite on the canvas
      this.tileset.tileSize,  // The height of the character's sprite on the canvas
    );
  }
}
