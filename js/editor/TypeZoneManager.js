export class TypeZoneManager {
  constructor() {
    this.zones = [];
    this.selectedZone = null;
    this.isCreatingZone = false;
    this.creatingZone = null;
    this.load();
  }

  /**
   * Crée une nouvelle zone de type
   * @param {number} startX - Coordonnée X de départ (en tiles)
   * @param {number} startY - Coordonnée Y de départ (en tiles)
   * @param {number} endX - Coordonnée X de fin (en tiles)
   * @param {number} endY - Coordonnée Y de fin (en tiles)
   * @param {string} name - Nom de la zone
   * @param {string} category - Catégorie de la zone (path, object, building, tree, etc.)
   * @returns {object} La zone créée
   */
  createZone(startX, startY, endX, endY, name, category = 'custom') {
    // S'assurer que startX/Y sont les coordonnées les plus petites
    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);
    const minY = Math.min(startY, endY);
    const maxY = Math.max(startY, endY);

    const zone = {
      id: this.generateId(),
      name: name,
      category: category,
      bounds: {
        startX: minX,
        startY: minY,
        endX: maxX,
        endY: maxY,
        width: maxX - minX + 1,
        height: maxY - minY + 1
      },
      tiles: this.extractTilesFromBounds(minX, minY, maxX, maxY),
      created: new Date().toISOString()
    };

    this.zones.push(zone);
    this.save();
    return zone;
  }

  /**
   * Extrait les tiles de la zone définie par les coordonnées (coordonnées tileset)
   * @param {number} startX 
   * @param {number} startY 
   * @param {number} endX 
   * @param {number} endY 
   * @returns {Array} Liste des coordonnées de tiles dans la zone
   */
  extractTilesFromBounds(startX, startY, endX, endY) {
    const tiles = [];
    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        tiles.push({ x, y });
      }
    }
    return tiles;
  }

  /**
   * Commence la création d'une nouvelle zone
   * @param {number} startX 
   * @param {number} startY 
   */
  startCreatingZone(startX, startY) {
    this.isCreatingZone = true;
    this.creatingZone = {
      startX,
      startY,
      currentX: startX,
      currentY: startY
    };
  }

  /**
   * Met à jour la zone en cours de création
   * @param {number} currentX 
   * @param {number} currentY 
   */
  updateCreatingZone(currentX, currentY) {
    if (this.isCreatingZone && this.creatingZone) {
      this.creatingZone.currentX = currentX;
      this.creatingZone.currentY = currentY;
    }
  }

  /**
   * Termine la création d'une zone
   * @param {string} name 
   * @param {string} category 
   * @returns {object|null} La zone créée ou null si annulée
   */
  finishCreatingZone(name, category = 'custom') {
    if (!this.isCreatingZone || !this.creatingZone) {
      return null;
    }

    const zone = this.createZone(
      this.creatingZone.startX,
      this.creatingZone.startY,
      this.creatingZone.currentX,
      this.creatingZone.currentY,
      name,
      category
    );

    this.cancelCreatingZone();
    return zone;
  }

  /**
   * Annule la création d'une zone
   */
  cancelCreatingZone() {
    this.isCreatingZone = false;
    this.creatingZone = null;
  }

  /**
   * Supprime une zone par son ID
   * @param {string} zoneId 
   * @returns {boolean} True si la zone a été supprimée
   */
  deleteZone(zoneId) {
    const index = this.zones.findIndex(zone => zone.id === zoneId);
    if (index !== -1) {
      this.zones.splice(index, 1);
      if (this.selectedZone && this.selectedZone.id === zoneId) {
        this.selectedZone = null;
      }
      this.save();
      return true;
    }
    return false;
  }

  /**
   * Renomme une zone
   * @param {string} zoneId 
   * @param {string} newName 
   * @returns {boolean} True si renommée avec succès
   */
  renameZone(zoneId, newName) {
    const zone = this.zones.find(z => z.id === zoneId);
    if (zone && newName.trim()) {
      zone.name = newName.trim();
      this.save();
      return true;
    }
    return false;
  }

  /**
   * Sélectionne une zone
   * @param {string} zoneId 
   */
  selectZone(zoneId) {
    this.selectedZone = this.zones.find(zone => zone.id === zoneId) || null;
  }

  /**
   * Désélectionne la zone courante
   */
  deselectZone() {
    this.selectedZone = null;
  }

  /**
   * Retourne les zones d'une catégorie spécifique
   * @param {string} category 
   * @returns {Array} Liste des zones de la catégorie
   */
  getZonesByCategory(category) {
    return this.zones.filter(zone => zone.category === category);
  }

  /**
   * Retourne toutes les catégories disponibles
   * @returns {Array} Liste des catégories uniques
   */
  getCategories() {
    const categories = [...new Set(this.zones.map(zone => zone.category))];
    return categories.sort();
  }

  /**
   * Dessine les zones sur le canvas tileset
   * @param {CanvasRenderingContext2D} context 
   * @param {number} tileSize 
   * @param {number} zoom 
   * @param {number} offsetX 
   * @param {number} offsetY 
   */
  draw(context, tileSize, zoom = 1, offsetX = 0, offsetY = 0) {
    const scaledTileSize = tileSize * zoom;
    
    // Calculer les limites visibles pour éviter de dessiner les zones hors écran
    const canvasWidth = context.canvas.width;
    const canvasHeight = context.canvas.height;
    const visibleMinX = (-offsetX) / scaledTileSize;
    const visibleMaxX = (canvasWidth - offsetX) / scaledTileSize;
    const visibleMinY = (-offsetY) / scaledTileSize;
    const visibleMaxY = (canvasHeight - offsetY) / scaledTileSize;

    // Dessiner seulement les zones visibles
    this.zones.forEach(zone => {
      // Test de visibilité simple
      if (zone.bounds.endX >= visibleMinX && zone.bounds.startX <= visibleMaxX &&
          zone.bounds.endY >= visibleMinY && zone.bounds.startY <= visibleMaxY) {
        this.drawZone(context, zone, tileSize, zoom, offsetX, offsetY, false);
      }
    });

    // Dessiner la zone sélectionnée avec un style différent
    if (this.selectedZone) {
      this.drawZone(context, this.selectedZone, tileSize, zoom, offsetX, offsetY, true);
    }

    // Dessiner la zone en cours de création
    if (this.isCreatingZone && this.creatingZone) {
      this.drawCreatingZone(context, tileSize, zoom, offsetX, offsetY);
    }
  }

  /**
   * Dessine une zone spécifique
   * @param {CanvasRenderingContext2D} context 
   * @param {object} zone 
   * @param {number} tileSize 
   * @param {number} zoom 
   * @param {number} offsetX 
   * @param {number} offsetY 
   * @param {boolean} isSelected 
   */
  drawZone(context, zone, tileSize, zoom, offsetX, offsetY, isSelected = false) {
    const scaledTileSize = tileSize * zoom;
    const x = zone.bounds.startX * scaledTileSize + offsetX;
    const y = zone.bounds.startY * scaledTileSize + offsetY;
    const width = zone.bounds.width * scaledTileSize;
    const height = zone.bounds.height * scaledTileSize;

    context.save();
    
    if (isSelected) {
      // Style pour la zone sélectionnée
      context.strokeStyle = 'rgba(255, 100, 100, 0.8)';
      context.fillStyle = 'rgba(255, 100, 100, 0.1)';
      context.lineWidth = 3;
    } else {
      // Style pour les zones normales
      context.strokeStyle = 'rgba(255, 0, 255, 0.6)';
      context.fillStyle = 'rgba(255, 0, 255, 0.05)';
      context.lineWidth = 2;
    }

    // Dessiner le rectangle
    context.fillRect(x, y, width, height);
    context.strokeRect(x, y, width, height);

    // Dessiner le nom de la zone (seulement si assez grand)
    if (width > 50 && height > 20) {
      context.fillStyle = isSelected ? 'rgba(255, 100, 100, 0.9)' : 'rgba(255, 0, 255, 0.9)';
      context.font = `${Math.min(12 * zoom, 16)}px Arial`;
      context.fillText(zone.name, x + 5, y + 15 * zoom);
    }
    
    context.restore();
  }

  /**
   * Dessine la zone en cours de création
   * @param {CanvasRenderingContext2D} context 
   * @param {number} tileSize 
   * @param {number} zoom 
   * @param {number} offsetX 
   * @param {number} offsetY 
   */
  drawCreatingZone(context, tileSize, zoom, offsetX, offsetY) {
    if (!this.creatingZone) return;

    const scaledTileSize = tileSize * zoom;
    const startX = Math.min(this.creatingZone.startX, this.creatingZone.currentX) * scaledTileSize + offsetX;
    const startY = Math.min(this.creatingZone.startY, this.creatingZone.currentY) * scaledTileSize + offsetY;
    const width = Math.abs(this.creatingZone.currentX - this.creatingZone.startX + 1) * scaledTileSize;
    const height = Math.abs(this.creatingZone.currentY - this.creatingZone.startY + 1) * scaledTileSize;

    context.save();
    context.strokeStyle = 'rgba(255, 255, 0, 0.8)';
    context.fillStyle = 'rgba(255, 255, 0, 0.1)';
    context.lineWidth = 2;
    context.setLineDash([5, 5]);

    context.fillRect(startX, startY, width, height);
    context.strokeRect(startX, startY, width, height);
    
    context.restore();
  }

  /**
   * Génère un ID unique pour une zone
   * @returns {string} ID unique
   */
  generateId() {
    return 'zone_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Sauvegarde les zones dans localStorage
   */
  save() {
    try {
      const data = {
        zones: this.zones,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem('typeZones', JSON.stringify(data));
    } catch (e) {
      console.error('Erreur lors de la sauvegarde des zones de type:', e);
    }
  }

  /**
   * Charge les zones depuis localStorage
   */
  load() {
    try {
      const savedData = localStorage.getItem('typeZones');
      if (savedData) {
        const data = JSON.parse(savedData);
        if (data.zones && Array.isArray(data.zones)) {
          this.zones = data.zones;
        }
      }
    } catch (e) {
      console.error('Erreur lors du chargement des zones de type:', e);
      this.zones = [];
    }
  }

  /**
   * Exporte toutes les zones au format JSON
   * @returns {string} JSON des zones
   */
  exportZones() {
    return JSON.stringify({
      zones: this.zones,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    }, null, 2);
  }

  /**
   * Importe des zones depuis un JSON
   * @param {string} jsonData 
   * @returns {boolean} True si l'import a réussi
   */
  importZones(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      if (data.zones && Array.isArray(data.zones)) {
        this.zones = data.zones;
        this.save();
        return true;
      }
    } catch (e) {
      console.error('Erreur lors de l\'import des zones:', e);
    }
    return false;
  }
}