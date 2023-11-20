import { TileSet } from '../class/TileSet.js';
import {
  DOWN, LEFT, RIGHT, UP, WALK_SEQUENCE, RUN_SEQUENCE, CELL_SIZE, DEBUG,
} from '../constants.js';

const WALK_DURATION = 250;
const RUN_DURATION = 100;
const X_OFFSET = 7;
const Y_OFFSET = 5;

export default class Character {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.moveOffsetX = 0;
    this.moveOffsetY = 0;
    this.facing = DOWN;
    this.shouldFace = DOWN;
    this.isRunning = false;
    this.isWalking = false;
    this.isMoving = false;
    this.sequenceStep = 0;
    this.isEndingMoveCycle = false;
    this.tileset = new TileSet('../image/character.png', 401, 234, 24, 6, 11);
  }

  // Determine the direction the character should face when the arrow keys are pressed
  determineOrientation(keyPressed) {
    const {
      ArrowUp, ArrowRight, ArrowDown, ArrowLeft,
    } = keyPressed;

    // If no arrow key is pressed, the character should face the direction it was facing before
    // If more than one arrow key is pressed, the character should face the direction of the last pressed arrow key
    const sum = !!ArrowUp + !!ArrowRight + !!ArrowDown + !!ArrowLeft;
    if (sum === 0 || sum > 1) return;

    if (ArrowUp && this.moveOffsetX === 0) {
      this.facing = UP;
    } else if (ArrowRight && this.moveOffsetY === 0) {
      this.facing = RIGHT;
    } else if (ArrowDown && this.moveOffsetX === 0) {
      this.facing = DOWN;
    } else if (ArrowLeft && this.moveOffsetY === 0) {
      this.facing = LEFT;
    }

    if (ArrowUp) {
      this.shouldFace = UP;
    } else if (ArrowRight) {
      this.shouldFace = RIGHT;
    } else if (ArrowDown) {
      this.shouldFace = DOWN;
    } else if (ArrowLeft) {
      this.shouldFace = LEFT;
    }
  }

  moveWhenKeyIsPressed(keyPressed, Δx, Δy) {
    this.isMoving = true;

    this.determineOrientation(keyPressed);

    switch (this.facing) {
      case UP:
        if (this.moveOffsetX !== 0) {
          this.moveXUntilBeingOnGrid(Δx);
          break;
        }
        this.moveOffsetY -= Δy;
        if (this.moveOffsetY < -CELL_SIZE) {
          this.y -= 1;
          this.moveOffsetY += CELL_SIZE;
          this.facing = this.shouldFace;
        }
        break;
      case RIGHT:
        if (this.moveOffsetY !== 0) {
          this.moveYUntilBeingOnGrid(Δy);
          break;
        }
        this.moveOffsetX += Δx;
        if (this.moveOffsetX > CELL_SIZE) {
          this.x += 1;
          this.moveOffsetX -= CELL_SIZE;
          this.facing = this.shouldFace;
        }
        break;
      case DOWN:
        if (this.moveOffsetX !== 0) {
          this.moveXUntilBeingOnGrid(Δx);
          break;
        }
        this.moveOffsetY += Δy;
        if (this.moveOffsetY > CELL_SIZE) {
          this.y += 1;
          this.moveOffsetY -= CELL_SIZE;
          this.facing = this.shouldFace;
        }
        break;
      case LEFT:
        if (this.moveOffsetY !== 0) {
          this.moveYUntilBeingOnGrid(Δy);
          break;
        }
        this.moveOffsetX -= Δx;
        if (this.moveOffsetX < -CELL_SIZE) {
          this.x -= 1;
          this.moveOffsetX += CELL_SIZE;
          this.facing = this.shouldFace;
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
        this.facing = this.shouldFace;
      }
    } else {
      this.moveOffsetX = 0;
      this.isMoving = false;
      if (this.facing === RIGHT) {
        this.x += 1;
      } else if (this.facing === LEFT) {
        this.x -= 1;
      }
      this.facing = this.shouldFace;
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
        this.facing = this.shouldFace;
      }
    } else {
      this.moveOffsetY = 0;
      this.isMoving = false;
      if (this.facing === DOWN) {
        this.y += 1;
      } else if (this.facing === UP) {
        this.y -= 1;
      }
      this.facing = this.shouldFace;
    }
  }

  moveUntilBeingOnGrid(Δx, Δy) {
    this.moveXUntilBeingOnGrid(Δx);
    this.moveYUntilBeingOnGrid(Δy);
  }

  move(keyPressed) {
    const {
      ArrowUp, ArrowRight, ArrowDown, ArrowLeft, Shift,
    } = keyPressed;

    this.isRunning = Shift;
    this.arrowKeyPressed = ArrowUp || ArrowRight || ArrowDown || ArrowLeft;

    const { now, lastFrameTime } = window;

    // Calculate the distance the character should move based on the time elapsed since the last frame
    const Δt = now - lastFrameTime;
    const duration = this.isRunning ? RUN_DURATION : WALK_DURATION;
    const Δx = (CELL_SIZE / duration) * Δt;
    const Δy = (CELL_SIZE / duration) * Δt;

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

    const frameDuration = this.isRunning ? 120 : 150;
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

    // Draw the character's bouding box on the canvas
    if (DEBUG) {
      context.strokeStyle = 'red';
      context.translate(-0.5, -0.5);
      context.strokeRect(
        xOnMap,
        yOnMap,
        this.tileset.tileSize,
        this.tileset.tileSize,
      );
      context.translate(0.5, 0.5);
    }
  }
}
