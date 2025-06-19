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

  update(commands, Δt) {
    this.isRunning = commands.isRunning;

    // 1. Mémoriser l'intention du joueur si une touche est pressée
    if (commands.move) {
      this.shouldFace = this.getDirectionFromString(commands.move);
    }
    
    // 2. Décider de l'action en fonction de l'état actuel (aligné sur la grille ou non)
    if (this.isOnGrid()) {
      // Si on est sur une case...
      this.isMoving = false; // On est à l'arrêt par défaut
      if (commands.move) {
        // ...mais qu'une touche est pressée, on commence un nouveau mouvement.
        this.facing = this.shouldFace;
        this.isMoving = true;
      }
    } else {
      // Si on est déjà en mouvement entre deux cases, on continue.
      this.isMoving = true;
    }

    // 3. Exécuter le mouvement si nécessaire
    if (this.isMoving) {
      const duration = this.isRunning ? RUN_DURATION : WALK_DURATION;
      const step = (CELL_SIZE / duration) * Δt;
      this.moveInDirection(this.facing, step);
    }
  }

  moveInDirection(direction, step) {
    // Bouge le personnage et déclenche la mise à jour de la grille si une case est franchie
    switch (direction) {
      case UP:    this.moveOffsetY -= step; break;
      case DOWN:  this.moveOffsetY += step; break;
      case LEFT:  this.moveOffsetX -= step; break;
      case RIGHT: this.moveOffsetX += step; break;
      default: break;
    }
    this.updateGridPositionAfterMove();
  }

  updateGridPositionAfterMove() {
    // Vérifie si un cycle de mouvement est terminé (une case entière a été parcourue)
    if (Math.abs(this.moveOffsetX) >= CELL_SIZE) {
      this.x += Math.sign(this.moveOffsetX);
      this.moveOffsetX = 0;
    }
    if (Math.abs(this.moveOffsetY) >= CELL_SIZE) {
      this.y += Math.sign(this.moveOffsetY);
      this.moveOffsetY = 0;
    }
  }

  isOnGrid() {
    // Le personnage est considéré "sur la grille" uniquement si ses offsets sont à zéro.
    return this.moveOffsetX === 0 && this.moveOffsetY === 0;
  }

  getDirectionFromString(string) {
    const dirMap = { UP, DOWN, LEFT, RIGHT };
    return dirMap[string];
  }

  animate(now) {
    if (!this.isMoving) {
      this.sequenceStep = 0;
      return;
    }

    const sequence = this.isRunning ? RUN_SEQUENCE : WALK_SEQUENCE;

    const frameDuration = this.isRunning ? 120 : 150;

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
