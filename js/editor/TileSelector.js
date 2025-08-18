import { loadImage } from '../common/utils.js';

export class TileSelector {
  constructor(tileset, canvas, typeZoneManager = null) {
    this.tileset = tileset;
    this.canvas = canvas;
    this.tileSize = 16;
    this.selection = [];
    this.zoom = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.typeZoneManager = typeZoneManager;
    this.currentTool = 'tile'; // 'tile' ou 'typeZone'
    this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
  }

  getTileXYFromMouseEvent(e) {
    const rect = this.canvas.getBoundingClientRect();
    const rX = e.clientX - rect.left;
    const rY = e.clientY - rect.top;

    const x = Math.floor((rX - this.offsetX) / (this.tileSize * this.zoom));
    const y = Math.floor((rY - this.offsetY) / (this.tileSize * this.zoom));

    return { x, y };
  }

  addToSelection(element) {
    if (this.selection.some((el) => el.x === element.x && el.y === element.y)) return;
    this.selection.push(element);
    this.previewSelectedTiles();
  }

  handleWheel(e) {
    if (e.deltaY > 0) {
      this.zoom -= 1;
    } else {
      this.zoom += 1;
    }
    if (this.zoom < 1) {
      this.zoom = 1;
    }
    this.draw();
  }

  handleMouseDown(e) {
    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    
    const tileCoords = this.getTileXYFromMouseEvent(e);
    
    if (this.currentTool === 'typeZone' && this.typeZoneManager && this.typeZoneManager.isCreatingZone) {
      // Mode création de zone de type
      this.typeZoneManager.startCreatingZone(tileCoords.x, tileCoords.y);
    } else {
      // Mode sélection de tiles normal
      this.selection = [];
      this.addToSelection(tileCoords);
    }
    
    this.draw();
  }

  handleMouseLeave(e) {
    this.handleMouseUp(e);
  }

  previewSelectedTiles() {
    const previewCanvas = document.getElementById('tile-preview');
    const previewContext = previewCanvas.getContext('2d');
    previewContext.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    previewCanvas.width = Math.min(this.selection.length * 32, 16 * 32);
    previewCanvas.height = 32 * Math.ceil((32 * this.selection.length) / 528);
    previewContext.imageSmoothingEnabled = false;
    previewCanvas.style.width = `${previewCanvas.width}px`;
    previewCanvas.style.height = `${previewCanvas.height}px`;
    this.selection.forEach((tile, index) => {
      previewContext.drawImage(
        this.tileset.image,
        tile.x * this.tileSize,
        tile.y * this.tileSize,
        this.tileSize,
        this.tileSize,
        32 * (index % 16),
        32 * Math.floor(index / 16),
        32,
        32,
      );
    });
  }

handleMouseMove(e) {
    if (!this.isDragging) return;

    if (e.shiftKey) {
      // On arrondit les offsets pour éviter les problèmes de rendu de la grille
      this.offsetX = Math.round(this.offsetX + e.clientX - this.dragStartX);
      this.offsetY = Math.round(this.offsetY + e.clientY - this.dragStartY);
    } else {
      const tileCoords = this.getTileXYFromMouseEvent(e);
      
      if (this.currentTool === 'typeZone' && this.typeZoneManager && this.typeZoneManager.isCreatingZone) {
        // Mettre à jour la zone en cours de création
        this.typeZoneManager.updateCreatingZone(tileCoords.x, tileCoords.y);
      } else {
        // Mode sélection de tiles normal
        this.addToSelection(tileCoords);
      }
    }

    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.draw();
  }

  handleMouseUp() {
    if (this.currentTool === 'typeZone' && this.typeZoneManager && this.typeZoneManager.isCreatingZone && this.typeZoneManager.creatingZone) {
      // Finaliser la création de zone de type
      this.onZoneCreated && this.onZoneCreated();
    }
    
    this.isDragging = false;
    this.draw();
  }

  setTool(tool) {
    this.currentTool = tool;
  }

  setOnZoneCreatedCallback(callback) {
    this.onZoneCreated = callback;
  }

  drawGrid(context) {
    context.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    context.lineWidth = 1;

    for (let i = 0; i <= this.tileset.rows; i += 1) {
      context.beginPath();
      const y = (i * this.tileSize * this.zoom) + this.offsetY;
      context.moveTo(this.offsetX, y);
      context.lineTo(this.tileset.image.width * this.zoom + this.offsetX, y);
      context.stroke();
    }
    for (let j = 0; j <= this.tileset.columns; j += 1) {
      context.beginPath();
      const x = (j * this.tileSize * this.zoom) + this.offsetX;
      context.moveTo(x, this.offsetY);
      context.lineTo(x, this.tileset.image.height * this.zoom + this.offsetY);
      context.stroke();
    }
  }

  drawSelection(context) {
    if (!this.selection || this.selection.length === 0) return;

    context.strokeStyle = 'rgba(255, 0, 0, 0.8)';
    context.lineWidth = 1;

    const scaledTileSize = this.tileSize * this.zoom;

    this.selection.forEach((tile) => {
      // On calcule la position de base de la tuile, en tenant compte du zoom ET du décalage
      const x = (tile.x * scaledTileSize) + this.offsetX;
      const y = (tile.y * scaledTileSize) + this.offsetY;

      // La logique suivante dessine uniquement les BORDURES extérieures de la sélection

      // Dessine le côté GAUCHE s'il n'y a pas de tuile sélectionnée à gauche
      if (!this.selection.find((el) => el.x === tile.x - 1 && el.y === tile.y)) {
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x, y + scaledTileSize);
        context.stroke();
      }
      // Dessine le côté DROIT s'il n'y a pas de tuile sélectionnée à droite
      if (!this.selection.find((el) => el.x === tile.x + 1 && el.y === tile.y)) {
        context.beginPath();
        context.moveTo(x + scaledTileSize, y);
        context.lineTo(x + scaledTileSize, y + scaledTileSize);
        context.stroke();
      }
      // Dessine le côté HAUT s'il n'y a pas de tuile sélectionnée au-dessus
      if (!this.selection.find((el) => el.x === tile.x && el.y === tile.y - 1)) {
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x + scaledTileSize, y);
        context.stroke();
      }
      // Dessine le côté BAS s'il n'y a pas de tuile sélectionnée en dessous
      if (!this.selection.find((el) => el.x === tile.x && el.y === tile.y + 1)) {
        context.beginPath();
        context.moveTo(x, y + scaledTileSize);
        context.lineTo(x + scaledTileSize, y + scaledTileSize);
        context.stroke();
      }
    });
  }

  async draw(context = this.canvas.getContext('2d')) {
    const tilesetImage = this.tileset.image;
    await loadImage(tilesetImage);

    // Ajuste la taille du canvas pour remplir son conteneur parent.
    // Cela évite que le canvas ne grandisse indéfiniment et ne casse la mise en page.
    const parent = this.canvas.parentElement;
    if (this.canvas.width !== parent.clientWidth) {
      this.canvas.width = parent.clientWidth;
    }
    if (this.canvas.height !== parent.clientHeight) {
      this.canvas.height = parent.clientHeight;
    }

    // Le redimensionnement du canevas réinitialise son contexte, on le ré-applique ici.
    context = this.canvas.getContext('2d');
    context.imageSmoothingEnabled = false; // Important pour garder le pixel art net

    context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Dessine l'image du tileset avec le zoom et le décalage (pan)
    context.drawImage(
        tilesetImage,
        this.offsetX,
        this.offsetY,
        tilesetImage.width * this.zoom,
        tilesetImage.height * this.zoom
    );

    context.translate(-0.5, -0.5);
    // dessine un rectangle rouge autour de la tuile sélectionnée
    this.drawSelection(context);

    // dessine une grille sur le tileset
    this.drawGrid(context);
    
    // Dessiner les zones de type selon l'outil actif
    if (this.typeZoneManager && this.currentTool === 'typeZone') {
      this.typeZoneManager.draw(context, this.tileSize, this.zoom, this.offsetX, this.offsetY);
    } else if (this.typeZoneManager && this.currentTool === 'tree') {
      this.typeZoneManager.drawTreeZones(context, this.tileSize, this.zoom, this.offsetX, this.offsetY);
    } else if (this.typeZoneManager && this.currentTool === 'path') {
      this.typeZoneManager.drawPathZones(context, this.tileSize, this.zoom, this.offsetX, this.offsetY);
    }
    
    context.translate(0.5, 0.5);
  }
}
