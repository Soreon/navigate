import { DEBUG } from '../constants.js';

export class EditorMap {
  constructor(widthInTiles, heightInTiles, canvas, ranugen, tileset) {
    // --- Propriétés de base ---
    this.canvas = canvas;
    this.tileset = tileset;
    this.gridWidth = widthInTiles;
    this.gridHeight = heightInTiles;
    this.ranugen = ranugen;

    // --- Structure de données des calques ---
    this.layers = [
      { name: 'Background', tiles: {} }, // Le calque 0 est le fond, non modifiable
    ];
    this.activeLayerIndex = 0; // Le calque actif par défaut

    // --- Propriétés des outils ---
    this.tool = 'brush';
    this.toolSize = 1;
    this.hoveredCell = null;

    // --- Initialisation ---
    this.load();
  }

  // --- Logique de rendu ---

  /**
   * Dessine la carte en gérant les calques de haut en bas.
   * @param {CanvasRenderingContext2D} context - Le contexte du canvas principal.
   * @param {object} camera - L'objet caméra {x, y}.
   */
  draw(context, camera) {
    const renderedPositions = new Set(); // Stocke les positions déjà dessinées (ex: "x10,y20")

    // On parcourt les calques du plus haut (fin du tableau) au plus bas (début du tableau)
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      for (const tileKey in layer.tiles) {
        // Si une tuile a déjà été dessinée à cette position par un calque supérieur, on l'ignore
        if (renderedPositions.has(tileKey)) {
          continue;
        }

        const [x, y] = tileKey.split(',').map(coord => parseInt(coord.slice(1)));
        const tileIndex = layer.tiles[tileKey];
        
        this.tileset.drawTileOnCanvas(context, x * this.tileset.tileSize, y * this.tileset.tileSize, tileIndex);
        
        // On ajoute la position au set pour qu'elle ne soit pas redessinée par un calque inférieur
        renderedPositions.add(tileKey);
      }
    }

    // Le reste du dessin (grille, curseur) se fait par-dessus tous les calques
    if (DEBUG) {
      this.drawTileBoundaries(context, camera);
    }
    this.drawHoveredTile(context);
  }

  reorderLayer(oldIndex, newIndex) {
    // On empêche de déplacer ou de déposer sur le calque Background (index 0)
    if (oldIndex === 0 || newIndex === 0) return;
    if (newIndex >= 0 && newIndex < this.layers.length) {
      // 1. On retire l'élément de sa position d'origine
      const [item] = this.layers.splice(oldIndex, 1);
      // 2. On le réinsère à sa nouvelle position
      this.layers.splice(newIndex, 0, item);
    }
  }

  // --- Nouvelles méthodes de gestion des calques ---

  addLayer(name = `Layer ${this.layers.length}`) {
    this.layers.push({ name, tiles: {} });
    // On définit le nouveau calque comme étant l'actif
    this.activeLayerIndex = this.layers.length - 1;
  }

  setActiveLayer(index) {
    if (index >= 0 && index < this.layers.length) {
      this.activeLayerIndex = index;
    }
  }

  // --- Méthodes de manipulation des tuiles ---

  setTile(x, y, tileIndex) {
    const activeLayer = this.layers[this.activeLayerIndex];
    if (activeLayer) {
      activeLayer.tiles[`x${x},y${y}`] = tileIndex;
    }
  }

  removeTile(x, y) {
    const activeLayer = this.layers[this.activeLayerIndex];
    if (activeLayer) {
      delete activeLayer.tiles[`x${x},y${y}`];
    }
  }

  // --- Historique et Sauvegarde ---

  clear() {
    // La méthode clear efface uniquement le contenu du calque actif (sauf le background)
    if (this.layers[this.activeLayerIndex]) {
      this.layers[this.activeLayerIndex].tiles = {};
      this.save();
    }
  }

  save() {
    let history = JSON.parse(localStorage.getItem('history'));
    if (!history) {
      localStorage.setItem('history', '[]');
      history = [];
    }
    const data = {
      layers: this.layers,
      current: true,
    };
    const currentIndex = history.findIndex((entry) => entry.current);
    history = history.slice(0, currentIndex + 1);
    if(history[currentIndex]) history[currentIndex].current = false;

    history.forEach((entry) => entry.current = false);
    history.push(data);
    localStorage.setItem('history', JSON.stringify(history));
  }

  load() {
    const savedHistory = localStorage.getItem('history');
    if (!savedHistory) return;
    const history = JSON.parse(savedHistory);
    const data = history.find((entry) => entry.current) || history[history.length - 1];
    if (!data) return;
    this.layers = data.layers;
  }

  undo() {
    let history = JSON.parse(localStorage.getItem('history'));
    if (!history || history.length < 2) return;
    
    const currentStateIndex = history.findIndex((entry) => entry.current);
    if (currentStateIndex > 0) {
        const previousState = history[currentStateIndex - 1];
        history[currentStateIndex].current = false;
        previousState.current = true;
        this.layers = previousState.layers;
        localStorage.setItem('history', JSON.stringify(history));
    }
  }
  
  redo() {
    let history = JSON.parse(localStorage.getItem('history'));
    if (!history) return;

    const currentStateIndex = history.findIndex((entry) => entry.current);
    if (currentStateIndex < history.length - 1) {
        const nextState = history[currentStateIndex + 1];
        history[currentStateIndex].current = false;
        nextState.current = true;
        this.layers = nextState.layers;
        localStorage.setItem('history', JSON.stringify(history));
    }
  }

  // --- Méthodes des outils ---

  getGridCoordinates(mouseX, mouseY, camera) {
    return {
      x: Math.floor((mouseX + camera.x) / this.tileset.tileSize),
      y: Math.floor((mouseY + camera.y) / this.tileset.tileSize),
    };
  }

  drawHoveredTile(context) {
    if (!this.hoveredCell) return;
    
    const tileSize = this.tileset.tileSize * this.toolSize;
    const offset = (this.tileset.tileSize - tileSize) / 2;

    context.strokeStyle = 'rgba(255, 0, 0, 0.8)';
    context.lineWidth = 2;
    context.strokeRect(
      this.hoveredCell.x * this.tileset.tileSize + offset,
      this.hoveredCell.y * this.tileset.tileSize + offset,
      tileSize,
      tileSize
    );
  }

  brush(x, y, tileIndex) {
    const halfToolSize = Math.floor(this.toolSize / 2);
    const startX = x - halfToolSize;
    const startY = y - halfToolSize;

    for (let i = 0; i < this.toolSize; i++) {
      for (let j = 0; j < this.toolSize; j++) {
        this.setTile(startX + i, startY + j, tileIndex);
      }
    }
  }

  getTile(x, y) {
    const layer = this.layers[this.activeLayerIndex];
    if (!layer) return undefined;
    return layer.tiles[`x${x},y${y}`];
  }

  fill(startX, startY, newTileIndex, camera) {
    const targetTileIndex = this.getTile(startX, startY);

    if (targetTileIndex === newTileIndex) return;

    // --- CAS 1 : Clic sur une zone vide ---
    if (targetTileIndex === undefined) {
      // On remplit toutes les cases VIDES de la zone VISIBLE
      const { tileSize } = this.tileset;
      const viewWidth = this.canvas.width;
      const viewHeight = this.canvas.height;

      // On calcule les limites de la grille visible à l'écran
      const startGridX = Math.floor(camera.x / tileSize);
      const endGridX = startGridX + Math.ceil(viewWidth / tileSize);
      const startGridY = Math.floor(camera.y / tileSize);
      const endGridY = startGridY + Math.ceil(viewHeight / tileSize);

      // On parcourt chaque case de la zone visible
      for (let j = startGridX; j <= endGridX; j++) {
        for (let i = startGridY; i <= endGridY; i++) {
          // On ne remplit que si la case est effectivement vide
          if (this.getTile(j, i) === undefined) {
            this.setTile(j, i, newTileIndex);
          }
        }
      }
    } 
    // --- CAS 2 : Clic sur une tuile existante (Flood Fill) ---
    else {
      const queue = [[startX, startY]];
      const visited = new Set([`x${startX},y${startY}`]);

      while (queue.length > 0) {
        const [x, y] = queue.shift();
        this.setTile(x, y, newTileIndex);

        const neighbors = [[x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]];
        for (const [nx, ny] of neighbors) {
          const neighborKey = `x${nx},y${ny}`;
          if (!visited.has(neighborKey)) {
            visited.add(neighborKey);
            const neighborTile = this.getTile(nx, ny);
            if (neighborTile === targetTileIndex) {
              queue.push([nx, ny]);
            }
          }
        }
      }
    }
  }

  useTool(mouseX, mouseY, tileIndex, camera) {
    const { x, y } = this.getGridCoordinates(mouseX, mouseY, camera);

    switch (this.tool) {
      case 'brush':
        if (tileIndex !== null) this.brush(x, y, tileIndex);
        break;
      case 'erase':
        this.removeTile(x, y);
        break;
      case 'fill':
        // Pour le remplissage, une tuile doit être sélectionnée
        if (tileIndex !== null) this.fill(x, y, tileIndex, camera);
        break;
      default:
        break;
    }
  }
  
  /**
   * Dessine la grille de manière optimisée en ne dessinant que les lignes visibles dans la caméra.
   */
  drawTileBoundaries(context, camera) {
    const { tileSize } = this.tileset;
    const viewWidth = this.canvas.width;
    const viewHeight = this.canvas.height;

    const startX = Math.floor(camera.x / tileSize);
    const endX = startX + Math.ceil(viewWidth / tileSize) + 1; // +1 pour être sûr de couvrir le bord
    const startY = Math.floor(camera.y / tileSize);
    const endY = startY + Math.ceil(viewHeight / tileSize) + 1; // +1 pour être sûr de couvrir le bord

    context.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    context.lineWidth = 1;
    context.translate(-0.5, -0.5); // Pour des lignes nettes

    // Lignes horizontales
    for (let i = startY; i <= endY; i += 1) {
        context.beginPath();
        context.moveTo(startX * tileSize, i * tileSize);
        context.lineTo(endX * tileSize, i * tileSize);
        context.stroke();
    }

    // Lignes verticales
    for (let j = startX; j <= endX; j += 1) {
        context.beginPath();
        context.moveTo(j * tileSize, startY * tileSize);
        context.lineTo(j * tileSize, endY * tileSize);
        context.stroke();
    }
    
    context.translate(0.5, 0.5);
  }
}