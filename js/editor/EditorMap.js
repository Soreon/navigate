import { DEBUG } from '../common/constants.js';

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
    // On parcourt les calques du plus bas (début du tableau) au plus haut (fin du tableau)
    // pour que les calques supérieurs se dessinent par-dessus les inférieurs
    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      for (const tileKey in layer.tiles) {
        const [x, y] = tileKey.split(',').map(coord => parseInt(coord.slice(1)));
        const tileIndex = layer.tiles[tileKey];
        
        // Dessiner toutes les tiles, la transparence sera gérée naturellement par le canvas
        this.tileset.drawTileOnCanvas(context, x * this.tileset.tileSize, y * this.tileset.tileSize, tileIndex);
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

  renameLayer(layerIndex, newName) {
    // On ne peut pas renommer le calque Background
    if (layerIndex === 0) return;

    const layer = this.layers[layerIndex];
    if (layer && newName.trim()) {
      layer.name = newName.trim();
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

  save(actionDescription = 'Edit') {
    const MAX_HISTORY_ENTRIES = 50; // Limite à 50 entrées dans l'historique
    
    let historyString = localStorage.getItem('history');
    if (!historyString) {
        historyString = '[]';
    }

    let history;
    try {
        history = JSON.parse(historyString);
        if (!Array.isArray(history)) {
            history = [];
        }
    } catch (e) {
        history = [];
    }

    const data = {
      layers: this.layers,
      current: true,
      timestamp: new Date().toLocaleTimeString(),
      action: actionDescription,
    };
    const currentIndex = history.findIndex((entry) => entry.current);
    history = history.slice(0, currentIndex + 1);
    if(history[currentIndex]) history[currentIndex].current = false;

    history.forEach((entry) => entry.current = false);
    history.push(data);
    
    // Rotation de l'historique : supprimer les entrées les plus anciennes si on dépasse la limite
    if (history.length > MAX_HISTORY_ENTRIES) {
      const excessEntries = history.length - MAX_HISTORY_ENTRIES;
      history = history.slice(excessEntries);
    }
    
    try {
      localStorage.setItem('history', JSON.stringify(history));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        // Si on manque encore d'espace, réduire davantage l'historique
        console.warn('localStorage quota exceeded, reducing history size');
        const reducedHistory = history.slice(-Math.floor(MAX_HISTORY_ENTRIES / 2));
        try {
          localStorage.setItem('history', JSON.stringify(reducedHistory));
        } catch (e2) {
          console.error('Cannot save history, localStorage full:', e2);
          // En dernier recours, vider l'historique
          localStorage.removeItem('history');
        }
      } else {
        console.error('Error saving history:', e);
      }
    }
  }

  load() {
    const savedHistory = localStorage.getItem('history');
    if (!savedHistory) return;
    try {
        const history = JSON.parse(savedHistory);
        if (!Array.isArray(history)) return;

        const data = history.find((entry) => entry.current) || history[history.length - 1];
        if (!data || !Array.isArray(data.layers)) return;
        
        this.layers = data.layers;
    } catch (e) {
        // If history is corrupted, we do nothing and stick to the default layers.
    }
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

  /**
   * Récupère l'historique complet pour affichage
   */
  getHistory() {
    const savedHistory = localStorage.getItem('history');
    if (!savedHistory) return [];
    
    try {
        const history = JSON.parse(savedHistory);
        return Array.isArray(history) ? history : [];
    } catch (e) {
        return [];
    }
  }

  /**
   * Navigue vers un état spécifique de l'historique
   */
  navigateToHistoryStep(stepIndex) {
    let history = this.getHistory();
    if (stepIndex >= 0 && stepIndex < history.length) {
        // Marquer tous les états comme non-courants
        history.forEach(entry => entry.current = false);
        // Marquer le nouvel état comme courant
        history[stepIndex].current = true;
        // Charger les layers de cet état
        this.layers = history[stepIndex].layers;
        // Sauvegarder les changements
        localStorage.setItem('history', JSON.stringify(history));
        return true;
    }
    return false;
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
