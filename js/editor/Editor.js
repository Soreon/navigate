import { EditorMap } from './EditorMap.js';
import { TileSet } from '../common/TileSet.js';
import { TileSelector } from './TileSelector.js';
import { TypeZoneManager } from './TypeZoneManager.js';
import { PathTileCalculator } from './PathTileCalculator.js';
import { RandomNumberGenerator } from '../common/RandomNumberGenerator.js';
import { SEED } from '../common/constants.js';

export default class Editor {
  constructor() {
    // --- Initialisation des canvas ---
    this.canvas = document.getElementById('canvas');
    this.context = this.canvas.getContext('2d');
    this.canvas.width = 800;
    this.canvas.height = 800;
    this.context.imageSmoothingEnabled = false;
    
    // S'assurer que le canvas a un fond transparent
    this.canvas.style.backgroundColor = 'transparent';

    this.tilesCanvas = document.getElementById('tiles');

    this.toolButtons = {
      brush: document.querySelector('#tool'),
      fill: document.querySelector('#fill'),
      erase: document.querySelector('#erase'),
      typeZone: document.querySelector('#type-zone-tool'),
      tree: document.querySelector('#tree-tool'),
      path: document.querySelector('#path-tool'),
      water: document.querySelector('#water-tool'),
    };

    // --- Création des instances principales ---
    const mapTileset = new TileSet('../../image/tileset.png', 1504, 2519, 16, 157, 94);
    this.ranugen = new RandomNumberGenerator(SEED);
    this.map = new EditorMap(100, 100, this.canvas, this.ranugen, mapTileset);
    this.typeZoneManager = new TypeZoneManager();
    this.pathTileCalculator = new PathTileCalculator();
    this.tileSelector = new TileSelector(this.map.tileset, this.tilesCanvas, this.typeZoneManager);
    
    // Configurer le callback pour les changements de sélection
    this.tileSelector.setOnSelectionChangeCallback(() => {
      if (this.map.tool === 'fill') {
        this.updateFillPanel();
      }
    });
    
    // --- Initialisation de la caméra et de l'UI ---
    this.camera = { x: 0, y: 0 };
    this.selectedTreeZone = null;
    this.selectedPathZone = null;
    this.selectedWaterZone = null;
    this.mousePosition = { x: 0, y: 0 }; // Position de la souris sur le canvas principal
    this.isMouseOverCanvas = false; // Pour savoir si la souris est sur le canvas
    this.pathDrawing = []; // Points du chemin en cours de dessin
    this.pathClickStartPosition = null; // Position du clic initial pour détecter clic vs drag
    this.waterStartPosition = null; // Position de début du rectangle d'eau
    this.waterCurrentPosition = null; // Position actuelle de la souris pour l'aperçu du rectangle
    this.fillProbability = 100; // Probabilité de fill (1-100%)
    
    this.renderLayerList(); // Premier rendu de l'interface des calques
    this.renderTypeZonePanel(); // Premier rendu du panneau des zones de type
    this.renderTreePanel(); // Premier rendu du panneau des arbres
    this.renderPathPanel(); // Premier rendu du panneau des chemins
    this.renderWaterPanel(); // Premier rendu du panneau de l'eau
    this.tileSelector.setOnZoneCreatedCallback(() => this.showZoneNamingDialog());
    this._setupEventListeners();
    
    // --- Démarrage de la boucle de dessin ---
    this.animate();
    this.tileSelector.draw(); // Premier dessin du sélecteur de tuiles
  }

  setActiveToolButton(activeToolName) {
    // On retire la classe active de tous les boutons
    for (const toolName in this.toolButtons) {
      if (this.toolButtons[toolName]) {
        this.toolButtons[toolName].classList.remove('active-tool');
      }
    }
    // On ajoute la classe au bouton qui vient d'être activé
    if (this.toolButtons[activeToolName]) {
      this.toolButtons[activeToolName].classList.add('active-tool');
    }
  }

  /**
   * Met à jour l'affichage du panneau des zones de type.
   */
  renderTypeZonePanel() {
    const categorySelect = document.getElementById('category-select');
    const zoneList = document.getElementById('zone-list');
    
    // Mettre à jour les catégories
    const categories = this.typeZoneManager.getCategories();
    const currentValue = categorySelect.value;
    
    categorySelect.innerHTML = '<option value="all">All Categories</option>';
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      categorySelect.appendChild(option);
    });
    
    // Restaurer la sélection si elle existe toujours
    if (categories.includes(currentValue)) {
      categorySelect.value = currentValue;
    }
    
    // Mettre à jour la liste des zones
    this.renderZoneList();
  }

  /**
   * Met à jour l'affichage du panneau des chemins.
   */
  renderPathPanel() {
    const pathList = document.getElementById('path-list');
    const noPathsMessage = document.getElementById('no-paths-message');
    
    // Récupérer les zones de type "path"
    const pathZones = this.typeZoneManager.getZonesByCategory('path');
    
    pathList.innerHTML = '';
    
    if (pathZones.length === 0) {
      pathList.style.display = 'none';
      noPathsMessage.style.display = 'block';
      return;
    }
    
    pathList.style.display = 'block';
    noPathsMessage.style.display = 'none';
    
    pathZones.forEach(zone => {
      const li = document.createElement('li');
      li.dataset.zoneId = zone.id;
      
      if (this.selectedPathZone && this.selectedPathZone.id === zone.id) {
        li.classList.add('selected');
      }
      
      const pathInfo = document.createElement('div');
      pathInfo.className = 'path-info';
      
      const pathName = document.createElement('div');
      pathName.className = 'path-name';
      pathName.textContent = zone.name;
      
      const pathDetails = document.createElement('div');
      pathDetails.className = 'path-details';
      pathDetails.textContent = `${zone.bounds.width}×${zone.bounds.height} tiles`;
      
      pathInfo.appendChild(pathName);
      pathInfo.appendChild(pathDetails);
      li.appendChild(pathInfo);
      
      pathList.appendChild(li);
    });
  }

  /**
   * Met à jour l'affichage du panneau des arbres.
   */
  renderTreePanel() {
    const treeList = document.getElementById('tree-list');
    const noTreesMessage = document.getElementById('no-trees-message');
    
    // Récupérer les zones de type "tree"
    const treeZones = this.typeZoneManager.getZonesByCategory('tree');
    
    treeList.innerHTML = '';
    
    if (treeZones.length === 0) {
      treeList.style.display = 'none';
      noTreesMessage.style.display = 'block';
      return;
    }
    
    treeList.style.display = 'block';
    noTreesMessage.style.display = 'none';
    
    treeZones.forEach(zone => {
      const li = document.createElement('li');
      li.dataset.zoneId = zone.id;
      
      if (this.selectedTreeZone && this.selectedTreeZone.id === zone.id) {
        li.classList.add('selected');
      }
      
      const treeInfo = document.createElement('div');
      treeInfo.className = 'tree-info';
      
      const treeName = document.createElement('div');
      treeName.className = 'tree-name';
      treeName.textContent = zone.name;
      
      const treeDetails = document.createElement('div');
      treeDetails.className = 'tree-details';
      treeDetails.textContent = `${zone.bounds.width}×${zone.bounds.height} tiles`;
      
      treeInfo.appendChild(treeName);
      treeInfo.appendChild(treeDetails);
      li.appendChild(treeInfo);
      
      treeList.appendChild(li);
    });
  }

  /**
   * Met à jour l'affichage de la liste des zones.
   */
  renderZoneList() {
    const categorySelect = document.getElementById('category-select');
    const zoneList = document.getElementById('zone-list');
    const deleteButton = document.getElementById('delete-selected-zone');
    
    const selectedCategory = categorySelect.value;
    const zones = selectedCategory === 'all' 
      ? this.typeZoneManager.zones 
      : this.typeZoneManager.getZonesByCategory(selectedCategory);
    
    zoneList.innerHTML = '';
    
    zones.forEach(zone => {
      const li = document.createElement('li');
      li.dataset.zoneId = zone.id;
      
      if (this.typeZoneManager.selectedZone && this.typeZoneManager.selectedZone.id === zone.id) {
        li.classList.add('selected');
        deleteButton.disabled = false;
      }
      
      const zoneInfo = document.createElement('div');
      zoneInfo.className = 'zone-info';
      
      const zoneName = document.createElement('div');
      zoneName.className = 'zone-name';
      zoneName.textContent = zone.name;
      
      const zoneDetails = document.createElement('div');
      zoneDetails.className = 'zone-details';
      zoneDetails.textContent = `${zone.bounds.width}×${zone.bounds.height} tiles`;
      
      zoneInfo.appendChild(zoneName);
      zoneInfo.appendChild(zoneDetails);
      
      const zoneCategory = document.createElement('span');
      zoneCategory.className = 'zone-category';
      zoneCategory.textContent = zone.category;
      
      li.appendChild(zoneInfo);
      li.appendChild(zoneCategory);
      
      zoneList.appendChild(li);
    });
    
    if (!this.typeZoneManager.selectedZone) {
      deleteButton.disabled = true;
    }
  }

  /**
   * Met à jour l'affichage de la liste des calques dans l'interface utilisateur.
   */
  renderLayerList() {
    const layerList = document.getElementById('layer-list');
    layerList.innerHTML = '';

    // On parcourt la liste à l'envers pour afficher le dernier calque en haut
    for (let i = this.map.layers.length - 1; i >= 0; i--) {
      const layer = this.map.layers[i];
      const li = document.createElement('li');
      li.dataset.index = i;

      // Le calque Background (index 0) n'est pas déplaçable et n'a pas de bouton de visibilité
      if (i > 0) {
        li.draggable = true;
        const handle = document.createElement('i');
        handle.className = 'fa-solid fa-grip-vertical drag-handle';
        li.appendChild(handle);
        
        // Bouton de visibilité (œil)
        const visibilityBtn = document.createElement('i');
        visibilityBtn.className = layer.visible 
          ? 'fa-solid fa-eye visibility-btn visible' 
          : 'fa-solid fa-eye-slash visibility-btn hidden';
        visibilityBtn.dataset.layerIndex = i;
        visibilityBtn.title = layer.visible ? 'Hide layer' : 'Show layer';
        li.appendChild(visibilityBtn);
      }

      const name = document.createElement('span');
      name.textContent = layer.name;
      li.appendChild(name);
      
      if (i === this.map.activeLayerIndex) {
        li.classList.add('active');
      }
      layerList.appendChild(li);
    }
  }

  /**
   * Met en place tous les écouteurs d'événements pour l'éditeur.
   */
  _setupEventListeners() {
    let isCameraDragging = false;
    let isDrawing = false;
    let dragStartX = 0;
    let dragStartY = 0;

    const useCurrentTool = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      if (this.map.tool === 'tree') {
        if (this.selectedTreeZone) {
          this.placeTree(mouseX, mouseY);
        }
      } else if (this.map.tool === 'path') {
        // En mode chemin, on se contente d'ajouter un point.
        // La mise à jour se fait dans l'écouteur mousemove.
        if (this.selectedPathZone) {
          const gridCoords = this.map.getGridCoordinates(mouseX, mouseY, this.camera);
          this.addPointToPath(gridCoords.x, gridCoords.y);
        }
      } else if (this.map.tool === 'water') {
        // En mode eau, on ne fait rien dans useCurrentTool car on gère tout dans mousedown/mouseup
      } else {
        // Autres outils
        if (this.tileSelector.selection.length === 0 && this.map.tool !== 'erase') return;
        
        // Pour l'outil fill, on passe toutes les tiles sélectionnées; pour les autres, seulement la première
        let tileIndices;
        if (this.map.tool === 'fill' && this.tileSelector.selection.length > 0) {
          // Pour fill, envoyer toutes les tiles sélectionnées
          tileIndices = this.tileSelector.selection.map(tile => 
            this.tileSelector.tileset.getTileIndex(tile.x, tile.y)
          );
        } else {
          // Pour les autres outils, utiliser seulement la première tile
          const firstSelectedTile = this.tileSelector.selection[0];
          tileIndices = firstSelectedTile ? this.tileSelector.tileset.getTileIndex(firstSelectedTile.x, firstSelectedTile.y) : null;
        }
        
        if (tileIndices !== null || this.map.tool === 'erase') {
          this.map.useTool(mouseX, mouseY, tileIndices, this.camera, this.fillProbability);
        }
      }
    };

    // --- Événements de la souris sur le canvas principal (LOGIQUE RESTAURÉE) ---
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 2 || (e.button === 0 && e.ctrlKey)) {
        isCameraDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
      } else if (e.button === 0) {
        isDrawing = true;
        
        if (this.map.tool === 'path') {
          const rect = this.canvas.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          const gridCoords = this.map.getGridCoordinates(mouseX, mouseY, this.camera);
          this.pathClickStartPosition = { x: gridCoords.x, y: gridCoords.y };
          
          // On ajoute le premier point et on lance une première mise à jour
          this.addPointToPath(gridCoords.x, gridCoords.y);
          this.updatePathAndNeighbors(); // Mise à jour initiale
        } else if (this.map.tool === 'water') {
          const rect = this.canvas.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          const gridCoords = this.map.getGridCoordinates(mouseX, mouseY, this.camera);
          
          // Commencer le dessin du rectangle
          this.waterStartPosition = { x: gridCoords.x, y: gridCoords.y };
          this.waterCurrentPosition = { x: gridCoords.x, y: gridCoords.y };
        } else {
            useCurrentTool(e);
        }
      }
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mousePosition.x = e.clientX - rect.left;
      this.mousePosition.y = e.clientY - rect.top;
      
      if (isCameraDragging) {
        this.camera.x -= e.clientX - dragStartX;
        this.camera.y -= e.clientY - dragStartY;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
      } else if (isDrawing) {
        if (this.map.tool === 'path') {
          // **LA MODIFICATION CLÉ EST ICI**
          // On ajoute le nouveau point puis on met à jour le visuel en direct.
          const gridCoords = this.map.getGridCoordinates(this.mousePosition.x, this.mousePosition.y, this.camera);
          this.addPointToPath(gridCoords.x, gridCoords.y);
          this.updatePathAndNeighbors(); // Mise à jour en temps réel
        } else if (this.map.tool === 'water') {
          // Mettre à jour la position actuelle pour l'aperçu du rectangle
          const gridCoords = this.map.getGridCoordinates(this.mousePosition.x, this.mousePosition.y, this.camera);
          this.waterCurrentPosition = { x: gridCoords.x, y: gridCoords.y };
        } else {
          useCurrentTool(e);
        }
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (isDrawing) {
        isDrawing = false;
        
        if (this.map.tool === 'path') {
          if (this.pathClickStartPosition) {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const gridCoords = this.map.getGridCoordinates(mouseX, mouseY, this.camera);
            
            const isClick = (gridCoords.x === this.pathClickStartPosition.x && 
                           gridCoords.y === this.pathClickStartPosition.y);
            
            // Si c'était un simple clic, on place juste une tile mais on applique les transitions
            if (isClick && this.pathDrawing.length <= 1) {
              // Placer une seule tile C07 à la position cliquée
              this.placeTileFromPathZone(gridCoords.x, gridCoords.y, 6); // C07
              // Appliquer les transitions autour de cette tile
              this.applyTransitionsAroundPoint(gridCoords.x, gridCoords.y, new Set([`${gridCoords.x},${gridCoords.y}`]));
              this.map.save('Place Path Tile');
              this.renderHistoryPanel();
            } else {
              // Sinon, on finalise simplement le chemin déjà dessiné
              this.finishPath();
            }
            this.pathClickStartPosition = null;
          } else {
            this.finishPath();
          }
        } else if (this.map.tool === 'water') {
          if (this.waterStartPosition && this.waterCurrentPosition) {
            // Finaliser le rectangle d'eau
            this.drawWaterRectangle();
            this.waterStartPosition = null;
            this.waterCurrentPosition = null;
          }
        } else if (this.map.tool !== 'tree') {
          // Ne pas sauvegarder pour l'outil tree car placeTree() le fait déjà
          this.map.save();
          this.renderHistoryPanel();
        }
      }
      if (isCameraDragging) {
        isCameraDragging = false;
      }
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Événements pour tracker si la souris est sur le canvas
    this.canvas.addEventListener('mouseenter', () => {
      this.isMouseOverCanvas = true;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.isMouseOverCanvas = false;
    });

    // --- Événements de l'interface des calques ---
    document.getElementById('add-layer').addEventListener('click', () => {
      this.map.addLayer();
      this.map.save('Add Layer');
      this.renderLayerList();
      this.renderHistoryPanel();
    });

    const layerList = document.getElementById('layer-list');

    layerList.addEventListener('click', (e) => {
      // Gérer les clics sur les boutons de visibilité
      if (e.target.classList.contains('visibility-btn')) {
        e.stopPropagation(); // Empêcher la sélection du calque
        const layerIndex = parseInt(e.target.dataset.layerIndex, 10);
        this.map.toggleLayerVisibility(layerIndex);
        this.renderLayerList(); // Mettre à jour l'affichage
        this.draw(); // Redessiner la carte
        return;
      }

      // On annule tout minuteur précédent au cas où l'utilisateur clique rapidement plusieurs fois
      clearTimeout(this.clickTimer);

      const li = e.target.closest('li');
      if (li) {
        // On lance un minuteur. L'action ne sera exécutée qu'après 250ms
        this.clickTimer = setTimeout(() => {
          const index = parseInt(li.dataset.index, 10);
          this.map.setActiveLayer(index);
          this.renderLayerList();
        }, 250); // Un délai de 200-300ms est standard
      }
    });
    
    // Logique du glisser-déposer pour les calques
    let dragStartIndex;
    layerList.addEventListener('dragstart', (e) => {
      if (e.target.tagName === 'LI' && e.target.draggable) {
        dragStartIndex = parseInt(e.target.dataset.index, 10);
        setTimeout(() => e.target.classList.add('dragging'), 0);
      }
    });

    layerList.addEventListener('dragend', (e) => {
      if (e.target.tagName === 'LI') {
        e.target.classList.remove('dragging');
      }
    });

    layerList.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    layerList.addEventListener('drop', (e) => {
      e.preventDefault();
      const draggingElement = layerList.querySelector('.dragging');
      if (!draggingElement) return;

      const dropTarget = e.target.closest('li');
      if (dropTarget && dropTarget !== draggingElement) {
          const dropIndex = parseInt(dropTarget.dataset.index, 10);

          // On ne peut pas déposer sur le calque Background
          if (dropIndex !== 0) {
              // IMPORTANT : On garde le nom du calque déplacé pour retrouver son nouvel index
              const draggedLayerName = this.map.layers[dragStartIndex].name;
              
              // 1. On réorganise les données
              this.map.reorderLayer(dragStartIndex, dropIndex);

              // 2. On retrouve le nouvel index du calque qu'on vient de déplacer
              const newActiveIndex = this.map.layers.findIndex(layer => layer.name === draggedLayerName);
              this.map.setActiveLayer(newActiveIndex);
              
              // 3. On sauvegarde et on met à jour les vues
              this.map.save();
              this.renderLayerList();
              this.renderHistoryPanel();
              this.draw(); // Redessin immédiat du canevas
          }
      }
      draggingElement.classList.remove('dragging');
    });

    layerList.addEventListener('dblclick', (e) => {
      clearTimeout(this.clickTimer);

      // 1. On trouve d'abord l'item de la liste sur lequel on a cliqué
      const li = e.target.closest('li');
      if (!li || li.dataset.index === '0') return; // Si pas de li, ou si c'est le Background, on sort

      // 2. ENSUITE, on cherche le span À L'INTÉRIEUR de cet item
      const span = li.querySelector('span');
      if (!span) return; // Si pas de span dans ce li, on sort

      // --- À partir d'ici, le code est sûr de s'exécuter ---

      const index = parseInt(li.dataset.index, 10);
      const originalName = span.textContent;
      const input = document.createElement('input');
      input.type = 'text';
      input.value = originalName;

      span.replaceWith(input);
      input.focus();
      input.select();

      // --- Logique améliorée pour éviter les bugs de sauvegarde/annulation ---

      const finalize = (event) => {
        // On retire immédiatement les écouteurs pour éviter les appels en double
        input.removeEventListener('blur', finalize);
        document.removeEventListener('keydown', keydownHandler);

        // On sauvegarde seulement si on valide avec Entrée ou si on clique ailleurs (blur)
        if (event.type === 'blur' || (event.type === 'keydown' && event.key === 'Enter')) {
          const newName = input.value.trim();
          if (newName && newName !== originalName) {
            this.map.renameLayer(index, newName);
            this.map.save();
            this.renderHistoryPanel();
          }
        }
        // Si la touche est 'Escape', on ne fait rien, la liste est juste redessinée ci-dessous

        this.renderLayerList();
      };

      const keydownHandler = (e) => {
        if (e.key === 'Enter' || e.key === 'Escape') {
          finalize(e);
        }
      };

      input.addEventListener('blur', finalize);
      document.addEventListener('keydown', keydownHandler);
    });

    // --- Événements des boutons de la barre d'outils ---
    document.querySelector('#home').addEventListener('click', () => {
      this.camera.x = 0;
      this.camera.y = 0;
    });
    document.querySelector('#undo').addEventListener('click', () => { this.map.undo(); this.draw(); this.renderHistoryPanel(); });
    document.querySelector('#redo').addEventListener('click', () => { this.map.redo(); this.draw(); this.renderHistoryPanel(); });
    document.querySelector('#history').addEventListener('click', () => { this.toggleHistoryPanel(); });
    document.querySelector('#test-map').addEventListener('click', () => { this.testInGameMode(); });
    document.querySelector('#clear').addEventListener('click', () => {
      this.map.clear();
      this.draw();
      this.renderHistoryPanel();
    });

    // On utilise la nouvelle méthode pour gérer le changement d'outil et de style
    this.toolButtons.brush.addEventListener('click', () => {
        this.map.tool = 'brush';
        this.tileSelector.setTool('tile');
        this.hideTypeZonePanel();
        this.hideTreePanel();
        this.hidePathPanel();
        this.hideWaterPanel();
        this.hideFillPanel();
        this.setActiveToolButton('brush');
        this.tileSelector.draw(); // Forcer le rendu pour masquer les zones
    });

    this.toolButtons.erase.addEventListener('click', () => {
        this.map.tool = 'erase';
        this.tileSelector.setTool('tile');
        this.hideTypeZonePanel();
        this.hideTreePanel();
        this.hidePathPanel();
        this.hideWaterPanel();
        this.hideFillPanel();
        this.setActiveToolButton('erase');
        this.tileSelector.draw(); // Forcer le rendu pour masquer les zones
    });

    this.toolButtons.fill.addEventListener('click', () => {
        this.map.tool = 'fill';
        this.tileSelector.setTool('tile');
        this.hideTypeZonePanel();
        this.hideTreePanel();
        this.hidePathPanel();
        this.hideWaterPanel();
        this.showFillPanel();
        this.setActiveToolButton('fill');
        this.tileSelector.draw(); // Forcer le rendu pour masquer les zones
    });

    this.toolButtons.typeZone.addEventListener('click', () => {
        this.map.tool = 'typeZone';
        this.tileSelector.setTool('typeZone');
        this.setActiveToolButton('typeZone');
        this.hideTreePanel();
        this.hidePathPanel();
        this.hideWaterPanel();
        this.hideFillPanel();
        this.showTypeZonePanel();
        this.tileSelector.draw(); // Forcer le rendu pour afficher les zones
    });

    this.toolButtons.tree.addEventListener('click', () => {
        this.map.tool = 'tree';
        this.tileSelector.setTool('tree');
        this.setActiveToolButton('tree');
        this.hideTypeZonePanel();
        this.hidePathPanel();
        this.hideWaterPanel();
        this.hideFillPanel();
        this.showTreePanel();
        this.tileSelector.draw(); // Forcer le rendu pour afficher les zones tree
    });

    this.toolButtons.path.addEventListener('click', () => {
        this.map.tool = 'path';
        this.tileSelector.setTool('path');
        this.setActiveToolButton('path');
        this.hideTypeZonePanel();
        this.hideTreePanel();
        this.hideWaterPanel();
        this.hideFillPanel();
        this.showPathPanel();
        this.tileSelector.draw(); // Forcer le rendu pour afficher les zones path
    });

    this.toolButtons.water.addEventListener('click', () => {
        this.map.tool = 'water';
        this.tileSelector.setTool('water');
        this.setActiveToolButton('water');
        this.hideTypeZonePanel();
        this.hideTreePanel();
        this.hidePathPanel();
        this.hideFillPanel();
        this.showWaterPanel();
        this.tileSelector.draw(); // Forcer le rendu pour afficher les zones water
    });

    // --- Événements du panneau des zones de type ---
    document.getElementById('category-select').addEventListener('change', () => {
      this.renderZoneList();
    });

    document.getElementById('create-new-zone').addEventListener('click', () => {
      this.startZoneCreation();
    });

    document.getElementById('cancel-zone-creation').addEventListener('click', () => {
      this.cancelZoneCreation();
    });

    document.getElementById('delete-selected-zone').addEventListener('click', () => {
      this.deleteSelectedZone();
    });

    document.getElementById('zone-list').addEventListener('click', (e) => {
      const li = e.target.closest('li');
      if (li) {
        const zoneId = li.dataset.zoneId;
        this.selectZone(zoneId);
      }
    });

    document.getElementById('zone-list').addEventListener('dblclick', (e) => {
      const li = e.target.closest('li');
      if (li) {
        const zoneId = li.dataset.zoneId;
        this.startRenameZone(zoneId, li);
      }
    });

    // --- Événements du panneau des arbres ---
    document.getElementById('tree-list').addEventListener('click', (e) => {
      const li = e.target.closest('li');
      if (li) {
        const zoneId = li.dataset.zoneId;
        this.selectTreeZone(zoneId);
      }
    });

    // --- Événements du panneau des chemins ---
    document.getElementById('path-list').addEventListener('click', (e) => {
      const li = e.target.closest('li');
      if (li) {
        const zoneId = li.dataset.zoneId;
        this.selectPathZone(zoneId);
      }
    });

    // --- Événements du panneau de l'eau ---
    document.getElementById('water-list').addEventListener('click', (e) => {
      const li = e.target.closest('li');
      if (li) {
        const zoneId = li.dataset.zoneId;
        this.selectWaterZone(zoneId);
      }
    });

    // --- Événements du panneau d'historique ---
    document.getElementById('history-list').addEventListener('click', (e) => {
      const li = e.target.closest('li');
      if (li && li.dataset.stepIndex !== undefined) {
        const stepIndex = parseInt(li.dataset.stepIndex, 10);
        if (this.map.navigateToHistoryStep(stepIndex)) {
          this.renderHistoryPanel(); // Mettre à jour l'affichage
          this.renderLayerList(); // Mettre à jour l'affichage des calques
          this.draw(); // Redessiner la carte
        }
      }
    });

    // --- Événements du panneau fill ---
    const fillProbabilitySlider = document.getElementById('fill-probability');
    const fillProbabilityValue = document.getElementById('fill-probability-value');
    
    fillProbabilitySlider.addEventListener('input', (e) => {
      this.fillProbability = parseInt(e.target.value, 10);
      fillProbabilityValue.textContent = this.fillProbability;
    });
  }

  /**
   * Affiche le panneau des zones de type et masque les autres panneaux
   */
  showTypeZonePanel() {
    document.getElementById('type-zone-panel').style.display = 'block';
  }

  /**
   * Masque le panneau des zones de type
   */
  hideTypeZonePanel() {
    document.getElementById('type-zone-panel').style.display = 'none';
  }

  /**
   * Affiche le panneau des arbres et masque les autres panneaux
   */
  showTreePanel() {
    this.hideTypeZonePanel();
    document.getElementById('tree-panel').style.display = 'block';
    this.renderTreePanel(); // Mettre à jour la liste des arbres
  }

  /**
   * Masque le panneau des arbres
   */
  hideTreePanel() {
    document.getElementById('tree-panel').style.display = 'none';
  }

  /**
   * Affiche le panneau des chemins et masque les autres panneaux
   */
  showPathPanel() {
    this.hideTypeZonePanel();
    this.hideTreePanel();
    document.getElementById('path-panel').style.display = 'block';
    this.renderPathPanel(); // Mettre à jour la liste des chemins
  }

  /**
   * Masque le panneau des chemins
   */
  hidePathPanel() {
    document.getElementById('path-panel').style.display = 'none';
  }

  /**
   * Affiche le panneau de l'eau et masque les autres panneaux
   */
  showWaterPanel() {
    this.hideTypeZonePanel();
    this.hideTreePanel();
    this.hidePathPanel();
    document.getElementById('water-panel').style.display = 'block';
    this.renderWaterPanel(); // Mettre à jour la liste de l'eau
  }

  /**
   * Masque le panneau de l'eau
   */
  hideWaterPanel() {
    document.getElementById('water-panel').style.display = 'none';
  }

  /**
   * Affiche le panneau de l'outil fill
   */
  showFillPanel() {
    document.getElementById('fill-panel').style.display = 'block';
    this.updateFillPanel();
  }

  /**
   * Met à jour l'affichage du panneau de l'outil fill
   */
  updateFillPanel() {
    const selectedTileCountElement = document.getElementById('selected-tile-count');
    if (selectedTileCountElement) {
      const tileCount = this.tileSelector.selection.length;
      selectedTileCountElement.textContent = tileCount;
      
      // Changer la couleur selon le nombre de tiles
      const countContainer = document.getElementById('fill-tile-count');
      if (tileCount > 1) {
        countContainer.style.backgroundColor = '#d1f2eb';
        countContainer.style.borderColor = '#28a745';
        selectedTileCountElement.style.color = '#28a745';
      } else {
        countContainer.style.backgroundColor = '#e8f4fd';
        countContainer.style.borderColor = '#007bff';
        selectedTileCountElement.style.color = '#007bff';
      }
    }
  }

  /**
   * Masque le panneau de l'outil fill
   */
  hideFillPanel() {
    document.getElementById('fill-panel').style.display = 'none';
  }

  /**
   * Met à jour l'affichage du panneau de l'eau.
   */
  renderWaterPanel() {
    const waterList = document.getElementById('water-list');
    const noWaterMessage = document.getElementById('no-water-message');
    
    // Récupérer les zones de type "water"
    const waterZones = this.typeZoneManager.getZonesByCategory('water');
    
    waterList.innerHTML = '';
    
    if (waterZones.length === 0) {
      waterList.style.display = 'none';
      noWaterMessage.style.display = 'block';
      return;
    }
    
    waterList.style.display = 'block';
    noWaterMessage.style.display = 'none';
    
    waterZones.forEach(zone => {
      const li = document.createElement('li');
      li.dataset.zoneId = zone.id;
      
      if (this.selectedWaterZone && this.selectedWaterZone.id === zone.id) {
        li.classList.add('selected');
      }
      
      const waterInfo = document.createElement('div');
      waterInfo.className = 'water-info';
      
      const waterName = document.createElement('div');
      waterName.className = 'water-name';
      waterName.textContent = zone.name;
      
      const waterDetails = document.createElement('div');
      waterDetails.className = 'water-details';
      waterDetails.textContent = `${zone.bounds.width}×${zone.bounds.height} tiles`;
      
      waterInfo.appendChild(waterName);
      waterInfo.appendChild(waterDetails);
      li.appendChild(waterInfo);
      
      waterList.appendChild(li);
    });
  }

  /**
   * Bascule l'affichage du panneau d'historique
   */
  toggleHistoryPanel() {
    const historyPanel = document.getElementById('history-panel');
    if (historyPanel.style.display === 'none') {
      this.showHistoryPanel();
    } else {
      this.hideHistoryPanel();
    }
  }

  /**
   * Affiche le panneau d'historique
   */
  showHistoryPanel() {
    document.getElementById('history-panel').style.display = 'block';
    this.renderHistoryPanel();
  }

  /**
   * Masque le panneau d'historique
   */
  hideHistoryPanel() {
    document.getElementById('history-panel').style.display = 'none';
  }

  /**
   * Met à jour l'affichage du panneau d'historique
   */
  renderHistoryPanel() {
    const historyPanel = document.getElementById('history-panel');
    // Optimisation : ne pas mettre à jour si le panneau n'est pas visible
    if (historyPanel.style.display === 'none') {
      return;
    }
    
    const historyList = document.getElementById('history-list');
    const history = this.map.getHistory();
    
    historyList.innerHTML = '';
    
    if (history.length === 0) {
      const li = document.createElement('li');
      li.style.textAlign = 'center';
      li.style.color = '#999';
      li.style.fontStyle = 'italic';
      li.textContent = 'No history available';
      li.style.cursor = 'default';
      historyList.appendChild(li);
      return;
    }

    const currentIndex = history.findIndex(entry => entry.current);
    
    // Inverser l'ordre pour avoir le plus récent en haut
    history.slice().reverse().forEach((step, reverseIndex) => {
      const index = history.length - 1 - reverseIndex;
      const li = document.createElement('li');
      li.dataset.stepIndex = index;
      
      // Ajouter les classes CSS appropriées
      if (index === currentIndex) {
        li.classList.add('current');
      } else if (index > currentIndex) {
        li.classList.add('future');
      }
      
      const stepDiv = document.createElement('div');
      stepDiv.className = 'history-step';
      
      const actionDiv = document.createElement('div');
      actionDiv.className = 'history-action';
      actionDiv.textContent = step.action || 'Edit';
      
      const timestampDiv = document.createElement('div');
      timestampDiv.className = 'history-timestamp';
      timestampDiv.textContent = step.timestamp || 'Unknown time';
      
      stepDiv.appendChild(actionDiv);
      stepDiv.appendChild(timestampDiv);
      li.appendChild(stepDiv);
      
      historyList.appendChild(li);
    });
  }

  /**
   * Sélectionne une zone de chemin
   */
  selectPathZone(zoneId) {
    const zone = this.typeZoneManager.zones.find(z => z.id === zoneId);
    if (zone && zone.category === 'path') {
      this.selectedPathZone = zone;
      this.renderPathPanel(); // Mettre à jour l'affichage
      this.tileSelector.draw(); // Mettre à jour l'affichage des zones path
    }
  }

  /**
   * Sélectionne une zone d'eau
   */
  selectWaterZone(zoneId) {
    const zone = this.typeZoneManager.zones.find(z => z.id === zoneId);
    if (zone && zone.category === 'water') {
      this.selectedWaterZone = zone;
      this.renderWaterPanel(); // Mettre à jour l'affichage
      this.tileSelector.draw(); // Mettre à jour l'affichage des zones water
    }
  }

  /**
   * Sélectionne une zone d'arbre
   */
  selectTreeZone(zoneId) {
    const zone = this.typeZoneManager.zones.find(z => z.id === zoneId);
    if (zone && zone.category === 'tree') {
      this.selectedTreeZone = zone;
      this.renderTreePanel(); // Mettre à jour l'affichage
      this.tileSelector.draw(); // Mettre à jour l'affichage des zones tree
    }
  }

  /**
   * Démarre le processus de création d'une zone
   */
  startZoneCreation() {
    this.typeZoneManager.isCreatingZone = true;
    this.tileSelector.setTool('typeZone');
    document.getElementById('zone-creation-info').style.display = 'block';
    document.getElementById('zone-actions').style.display = 'none';
  }

  /**
   * Annule la création d'une zone
   */
  cancelZoneCreation() {
    this.typeZoneManager.cancelCreatingZone();
    // Ne pas changer l'outil, rester en mode typeZone
    document.getElementById('zone-creation-info').style.display = 'none';
    document.getElementById('zone-actions').style.display = 'flex';
  }

  /**
   * Affiche le dialogue de nommage de la zone
   */
  showZoneNamingDialog() {
    const name = prompt('Nom de la zone:');
    const category = prompt('Catégorie de la zone (ex: path, object, building, tree):', 'custom');
    
    if (name && name.trim()) {
      const zone = this.typeZoneManager.finishCreatingZone(name.trim(), category?.trim() || 'custom');
      if (zone) {
        this.renderTypeZonePanel();
        // Mettre à jour les panneaux spécifiques selon la catégorie
        if (zone.category === 'tree') {
          this.renderTreePanel();
        } else if (zone.category === 'path') {
          this.renderPathPanel();
        } else if (zone.category === 'water') {
          this.renderWaterPanel();
        }
        this.cancelZoneCreation();
        this.tileSelector.draw(); // Mettre à jour l'affichage
      }
    } else {
      this.typeZoneManager.cancelCreatingZone();
      this.cancelZoneCreation();
    }
  }

  /**
   * Supprime la zone sélectionnée
   */
  deleteSelectedZone() {
    if (this.typeZoneManager.selectedZone) {
      const confirmed = confirm(`Supprimer la zone "${this.typeZoneManager.selectedZone.name}" ?`);
      if (confirmed) {
        this.typeZoneManager.deleteZone(this.typeZoneManager.selectedZone.id);
        this.renderTypeZonePanel();
        if (this.tileSelector.currentTool === 'typeZone') {
          this.tileSelector.draw(); // Mettre à jour l'affichage
        }
      }
    }
  }

  /**
   * Sélectionne une zone
   */
  selectZone(zoneId) {
    this.typeZoneManager.selectZone(zoneId);
    this.renderZoneList();
    if (this.tileSelector.currentTool === 'typeZone') {
      this.tileSelector.draw(); // Mettre à jour l'affichage des zones
    }
  }

  /**
   * Démarre le renommage d'une zone
   */
  startRenameZone(zoneId, li) {
    const zone = this.typeZoneManager.zones.find(z => z.id === zoneId);
    if (!zone) return;

    const nameDiv = li.querySelector('.zone-name');
    const originalName = nameDiv.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = originalName;
    input.style.width = '100%';

    nameDiv.replaceWith(input);
    input.focus();
    input.select();

    const finalize = (event) => {
      input.removeEventListener('blur', finalize);
      document.removeEventListener('keydown', keydownHandler);

      if (event.type === 'blur' || (event.type === 'keydown' && event.key === 'Enter')) {
        const newName = input.value.trim();
        if (newName && newName !== originalName) {
          this.typeZoneManager.renameZone(zoneId, newName);
        }
      }

      this.renderTypeZonePanel();
    };

    const keydownHandler = (e) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        finalize(e);
      }
    };

    input.addEventListener('blur', finalize);
    document.addEventListener('keydown', keydownHandler);
  }

  draw() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.context.save();
    this.context.translate(-this.camera.x, -this.camera.y);

    // La méthode draw de la carte gère déjà le rendu des calques dans le bon ordre
    this.map.draw(this.context, this.camera);

    // Afficher l'aperçu de l'arbre en mode tree seulement si la souris est sur le canvas
    if (this.map.tool === 'tree' && this.selectedTreeZone && this.isMouseOverCanvas) {
      this.drawTreePreview();
    }

    // Afficher l'aperçu du rectangle d'eau en mode water
    if (this.map.tool === 'water' && this.selectedWaterZone && this.waterStartPosition && this.waterCurrentPosition && this.isMouseOverCanvas) {
      this.drawWaterRectanglePreview();
    }

    this.context.restore();
  }

  /**
   * Dessine l'aperçu semi-transparent de l'arbre sélectionné
   */
  drawTreePreview() {
    if (!this.selectedTreeZone) return;

    // Calculer la position centrée de l'arbre
    const gridCoords = this.map.getGridCoordinates(this.mousePosition.x, this.mousePosition.y, this.camera);
    const treeWidth = this.selectedTreeZone.bounds.width;
    const treeHeight = this.selectedTreeZone.bounds.height;
    
    // Centrer l'arbre sur le curseur
    const startX = gridCoords.x - Math.floor(treeWidth / 2);
    const startY = gridCoords.y - Math.floor(treeHeight / 2);

    this.context.save();
    this.context.globalAlpha = 0.5; // Semi-transparent

    // Dessiner chaque tile de l'arbre
    this.selectedTreeZone.tiles.forEach(tile => {
      const worldX = (startX + tile.x - this.selectedTreeZone.bounds.startX) * this.map.tileset.tileSize;
      const worldY = (startY + tile.y - this.selectedTreeZone.bounds.startY) * this.map.tileset.tileSize;
      
      // Calculer l'index de la tile dans le tileset
      const tileIndex = this.map.tileset.getTileIndex(tile.x, tile.y);
      
      // Dessiner la tile
      this.map.tileset.drawTileOnCanvas(this.context, worldX, worldY, tileIndex);
    });

    this.context.restore();
  }

  /**
   * Ajoute un point au chemin en cours de dessin
   */
  addPointToPath(x, y) {
    if (!this.selectedPathZone) return;
    
    // Éviter les doublons de points consécutifs
    const lastPoint = this.pathDrawing[this.pathDrawing.length - 1];
    if (lastPoint && lastPoint.x === x && lastPoint.y === y) return;
    
    this.pathDrawing.push({ x, y });
    
    // Marquer cette position comme chemin pour les calculs de voisinage
    this.pathTileCalculator.markAsPath(x, y);
  }

  /**
   * Finalise le chemin et place les tiles
   */
  finishPath() {
    if (!this.selectedPathZone || this.pathDrawing.length === 0) {
      this.pathDrawing = [];
      this.pathTileCalculator.clearMarkedPositions();
      return;
    }

    // Appliquer les transitions appropriées selon CLAUDE.md
    this.applyPathTransitions();

    // Nettoyer et sauvegarder
    this.pathDrawing = [];
    this.pathTileCalculator.clearMarkedPositions();
    this.map.save();
    this.renderHistoryPanel();
  }

  updatePathAndNeighbors() {
    // Version simplifiée : placer C07 sur tous les points du chemin
    this.pathDrawing.forEach(point => {
      this.placeIntelligentPathTileAt(point.x, point.y);
    });
  }

  /**
   * Crée un tube rectangulaire de chemin basé sur les points de début et fin
   */
  createPathTube() {
    if (this.pathDrawing.length < 2) {
      // Si on n'a qu'un point, traiter comme un clic simple
      if (this.pathDrawing.length === 1) {
        const point = this.pathDrawing[0];
        this.place3x3PathBlock(point.x, point.y);
      }
      return;
    }

    // Calculer les limites du rectangle englobant tous les points
    const minX = Math.min(...this.pathDrawing.map(p => p.x));
    const maxX = Math.max(...this.pathDrawing.map(p => p.x));
    const minY = Math.min(...this.pathDrawing.map(p => p.y));
    const maxY = Math.max(...this.pathDrawing.map(p => p.y));

    // Marquer toutes les positions dans le rectangle comme chemin
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        this.pathTileCalculator.markAsPath(x, y);
      }
    }

    // Placer les tiles avec les bonnes transitions
    // D'abord remplir l'intérieur avec des tiles pleines (C07)
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        this.placeIntelligentPathTileAt(x, y);
      }
    }
  }

  /**
   * Place une tile de chemin (toujours C07 maintenant)
   */
  placeIntelligentPathTileAt(gridX, gridY) {
    if (!this.selectedPathZone) return;

    // Simplement placer C07 (index 6) partout où il y a un chemin
    if (this.pathTileCalculator.isMarkedAsPath(gridX, gridY)) {
      this.placeTileFromPathZone(gridX, gridY, 6); // C07 - chemin complet
    }
  }

  /**
   * Applique les transitions de chemin selon les règles de CLAUDE.md
   */
  applyPathTransitions() {
    if (!this.selectedPathZone || this.pathDrawing.length === 0) return;

    // Créer un Set des positions de chemin pour optimiser les vérifications
    const pathPositions = new Set();
    this.pathDrawing.forEach(point => {
      pathPositions.add(`${point.x},${point.y}`);
    });

    // Analyser chaque position de chemin et ses voisins pour appliquer les transitions
    this.pathDrawing.forEach(point => {
      this.applyTransitionsAroundPoint(point.x, point.y, pathPositions);
    });
  }

  /**
   * Applique les transitions autour d'un point selon les règles de CLAUDE.md
   */
  applyTransitionsAroundPoint(centerX, centerY, pathPositions) {
    // Analyser une zone 3x3 autour du point central
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;
        
        // Calculer la tile appropriée pour cette position
        const tileIndex = this.calculateTransitionTile(x, y, pathPositions);
        if (tileIndex !== null) {
          this.placeTileFromPathZone(x, y, tileIndex);
        }
      }
    }
  }

  /**
   * Calcule la tile de transition appropriée selon les règles de CLAUDE.md
   */
  calculateTransitionTile(x, y, pathPositions) {
    const isPath = pathPositions.has(`${x},${y}`);
    
    // Vérifier les 8 voisins
    const neighbors = {
      topLeft: pathPositions.has(`${x-1},${y-1}`),
      top: pathPositions.has(`${x},${y-1}`),
      topRight: pathPositions.has(`${x+1},${y-1}`),
      left: pathPositions.has(`${x-1},${y}`),
      right: pathPositions.has(`${x+1},${y}`),
      bottomLeft: pathPositions.has(`${x-1},${y+1}`),
      bottom: pathPositions.has(`${x},${y+1}`),
      bottomRight: pathPositions.has(`${x+1},${y+1}`)
    };

    // Si c'est un chemin, retourner C07 (index 6)
    if (isPath) {
      return 6; // C07 - tile de base chemin
    }

    // Sinon, calculer la tile de transition selon les patterns
    return this.getTransitionTileFromNeighbors(neighbors);
  }

  /**
   * Détermine la tile de transition basée sur les voisins selon CLAUDE.md
   */
  getTransitionTileFromNeighbors(neighbors) {
    // According to CLAUDE.md, the tile arrangement and 0-based indices are:
    // C01(0) C02(1) C03(2) C04(3) C05(4)
    // C06(5) C07(6) C08(7) C09(8) C10(9)
    // C11(10) C12(11) C13(12) ...
    
    const hasTop = neighbors.top;
    const hasBottom = neighbors.bottom;
    const hasLeft = neighbors.left;
    const hasRight = neighbors.right;
    
    // --- FIX START ---
    // Prioritize checking for "inner corners" where a grass tile is surrounded
    // on two adjacent sides by path tiles. These are more specific cases
    // than simple edges and must be checked first to resolve the ambiguity.

    // C05 (index 4): Inner corner with grass at top-right. Needs path to its left and bottom.
    if (hasLeft && hasBottom && !hasTop && !hasRight) {
        return 4;
    }
    // C04 (index 3): Inner corner with grass at top-left. Needs path to its right and bottom.
    if (hasRight && hasBottom && !hasTop && !hasLeft) {
        return 3;
    }
    // C10 (index 9): Inner corner with grass at bottom-right. Needs path to its left and top.
    if (hasLeft && hasTop && !hasBottom && !hasRight) {
        return 9;
    }
    // C09 (index 8): Inner corner with grass at bottom-left. Needs path to its right and top.
    if (hasRight && hasTop && !hasBottom && !hasLeft) {
        return 8;
    }
    // --- FIX END ---
    
    // Original logic for edges and outer corners follows.

    // Position au-dessus du chemin (ligne du haut)
    if (hasBottom && !hasTop) {
      if (hasLeft && !hasRight) return 2; // C03 - coin haut-droite
      if (hasRight && !hasLeft) return 0; // C01 - coin haut-gauche
      if (hasLeft && hasRight) return 1; // C02 - milieu haut
      if (!hasLeft && !hasRight) return 1; // C02 - milieu haut par défaut
    }
    
    // Position en dessous du chemin (ligne du bas)  
    if (hasTop && !hasBottom) {
      if (hasLeft && !hasRight) return 12; // C13 - coin bas-droite
      if (hasRight && !hasLeft) return 10; // C11 - coin bas-gauche
      if (hasLeft && hasRight) return 11; // C12 - milieu bas
      if (!hasLeft && !hasRight) return 11; // C12 - milieu bas par défaut
    }
    
    // Position à gauche du chemin (colonne de gauche)
    if (hasRight && !hasLeft) {
      if (hasTop && !hasBottom) return 5; // C06 handles this, but C01 is an outer corner
      if (hasBottom && !hasTop) return 5; // C06 handles this, but C11 is an outer corner
      if (hasTop && hasBottom) return 5; // C06 - milieu gauche
      if (!hasTop && !hasBottom) return 5; // C06 - milieu gauche par défaut
    }
    
    // Position à droite du chemin (colonne de droite)
    if (hasLeft && !hasRight) {
      if (hasTop && !hasBottom) return 7; // C08 handles this, but C03 is an outer corner
      if (hasBottom && !hasTop) return 7; // C08 handles this, but C13 is an outer corner
      if (hasTop && hasBottom) return 7; // C08 - milieu droite  
      if (!hasTop && !hasBottom) return 7; // C08 - milieu droite par défaut
    }
    
    // Coins diagonaux (positions where there are no direct adjacent path tiles)
    if (!hasTop && !hasBottom && !hasLeft && !hasRight) {
      if (neighbors.bottomRight) return 0; // C01 - coin haut-gauche
      if (neighbors.bottomLeft) return 2; // C03 - coin haut-droite
      if (neighbors.topRight) return 10; // C11 - coin bas-gauche
      if (neighbors.topLeft) return 12; // C13 - coin bas-droite
    }

    // If no pattern is recognized, no transition
    return null;
  }

  /**
   * Place une tile spécifique de la zone de chemin
   */
  placeTileFromPathZone(gridX, gridY, pathTileIndex) {
    if (!this.selectedPathZone) return;
    
    // La zone de chemin doit être arrangée en grille 5x3 (C01-C15)
    // Calculer les coordonnées dans la zone basées sur l'index
    const tilesPerRow = 5; // C01-C05, C06-C10, C11-C15
    const tileRow = Math.floor(pathTileIndex / tilesPerRow);
    const tileCol = pathTileIndex % tilesPerRow;
    
    // Coordonnées de la tile dans la zone
    const tileInZoneX = this.selectedPathZone.bounds.startX + tileCol;
    const tileInZoneY = this.selectedPathZone.bounds.startY + tileRow;
    
    // Calculer l'index de cette tile dans le tileset
    const tileIndex = this.map.tileset.getTileIndex(tileInZoneX, tileInZoneY);
    
    // Placer la tile sur la carte
    this.map.setTile(gridX, gridY, tileIndex);
  }


  /**
   * Place un arbre sur la carte
   */
  placeTree(mouseX, mouseY) {
    if (!this.selectedTreeZone) return;

    const gridCoords = this.map.getGridCoordinates(mouseX, mouseY, this.camera);
    const treeWidth = this.selectedTreeZone.bounds.width;
    const treeHeight = this.selectedTreeZone.bounds.height;
    
    // Centrer l'arbre sur le curseur
    const startX = gridCoords.x - Math.floor(treeWidth / 2);
    const startY = gridCoords.y - Math.floor(treeHeight / 2);

    // Placer chaque tile de l'arbre
    this.selectedTreeZone.tiles.forEach(tile => {
      const worldX = startX + tile.x - this.selectedTreeZone.bounds.startX;
      const worldY = startY + tile.y - this.selectedTreeZone.bounds.startY;
      
      // Calculer l'index de la tile dans le tileset
      const tileIndex = this.map.tileset.getTileIndex(tile.x, tile.y);
      
      // Placer la tile sur la carte
      this.map.setTile(worldX, worldY, tileIndex);
    });

    // Sauvegarder les changements
    this.map.save('Place Tree');
    this.renderHistoryPanel();
  }

  /**
   * Dessine l'aperçu du rectangle d'eau
   */
  drawWaterRectanglePreview() {
    if (!this.selectedWaterZone || !this.waterStartPosition || !this.waterCurrentPosition) return;

    // Calculer les limites du rectangle
    const minX = Math.min(this.waterStartPosition.x, this.waterCurrentPosition.x);
    const maxX = Math.max(this.waterStartPosition.x, this.waterCurrentPosition.x);
    const minY = Math.min(this.waterStartPosition.y, this.waterCurrentPosition.y);
    const maxY = Math.max(this.waterStartPosition.y, this.waterCurrentPosition.y);

    this.context.save();
    this.context.globalAlpha = 0.5; // Semi-transparent
    this.context.fillStyle = 'rgba(0, 100, 255, 0.3)'; // Bleu eau

    // Dessiner le rectangle d'aperçu
    const rectX = minX * this.map.tileset.tileSize;
    const rectY = minY * this.map.tileset.tileSize;
    const rectWidth = (maxX - minX + 1) * this.map.tileset.tileSize;
    const rectHeight = (maxY - minY + 1) * this.map.tileset.tileSize;

    this.context.fillRect(rectX, rectY, rectWidth, rectHeight);

    // Contour plus visible
    this.context.globalAlpha = 0.8;
    this.context.strokeStyle = 'rgba(0, 100, 255, 0.8)';
    this.context.lineWidth = 2;
    this.context.strokeRect(rectX, rectY, rectWidth, rectHeight);

    this.context.restore();
  }

  /**
   * Dessine le rectangle d'eau final avec les transitions
   */
  drawWaterRectangle() {
    if (!this.selectedWaterZone || !this.waterStartPosition || !this.waterCurrentPosition) return;

    // Calculer les limites du rectangle
    const minX = Math.min(this.waterStartPosition.x, this.waterCurrentPosition.x);
    const maxX = Math.max(this.waterStartPosition.x, this.waterCurrentPosition.x);
    const minY = Math.min(this.waterStartPosition.y, this.waterCurrentPosition.y);
    const maxY = Math.max(this.waterStartPosition.y, this.waterCurrentPosition.y);

    // Créer un Set des positions d'eau
    const waterPositions = new Set();
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        waterPositions.add(`${x},${y}`);
      }
    }

    // D'abord, placer toutes les tiles W07 (eau pleine) à l'intérieur
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        this.placeTileFromWaterZone(x, y, 6); // W07 - eau complète
      }
    }

    // Ensuite, appliquer les transitions autour du rectangle
    this.applyWaterTransitionsAroundRectangle(minX, maxX, minY, maxY, waterPositions);

    this.map.save('Draw Water Rectangle');
    this.renderHistoryPanel();
  }

  /**
   * Applique les transitions autour du rectangle d'eau
   */
  applyWaterTransitionsAroundRectangle(minX, maxX, minY, maxY, waterPositions) {
    // Analyser une zone élargie autour du rectangle pour les transitions
    for (let x = minX - 1; x <= maxX + 1; x++) {
      for (let y = minY - 1; y <= maxY + 1; y++) {
        // Skip les positions à l'intérieur du rectangle (déjà traitées)
        if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
          continue;
        }
        
        // Calculer la tile appropriée pour cette position
        const tileIndex = this.calculateWaterTransitionTile(x, y, waterPositions);
        if (tileIndex !== null) {
          this.placeTileFromWaterZone(x, y, tileIndex);
        }
      }
    }
  }


  /**
   * Calcule la tile de transition appropriée selon les règles de CLAUDE.md (adaptée pour l'eau)
   */
  calculateWaterTransitionTile(x, y, waterPositions) {
    const isWater = waterPositions.has(`${x},${y}`);
    
    // Vérifier les 8 voisins
    const neighbors = {
      topLeft: waterPositions.has(`${x-1},${y-1}`),
      top: waterPositions.has(`${x},${y-1}`),
      topRight: waterPositions.has(`${x+1},${y-1}`),
      left: waterPositions.has(`${x-1},${y}`),
      right: waterPositions.has(`${x+1},${y}`),
      bottomLeft: waterPositions.has(`${x-1},${y+1}`),
      bottom: waterPositions.has(`${x},${y+1}`),
      bottomRight: waterPositions.has(`${x+1},${y+1}`)
    };

    // Si c'est de l'eau, retourner W07 (index 6)
    if (isWater) {
      return 6; // W07 - tile de base eau
    }

    // Sinon, calculer la tile de transition selon les patterns
    return this.getWaterTransitionTileFromNeighbors(neighbors);
  }

  /**
   * Détermine la tile de transition basée sur les voisins selon CLAUDE.md (adaptée pour l'eau)
   */
  getWaterTransitionTileFromNeighbors(neighbors) {
    // Utiliser la même logique que pour les chemins mais pour l'eau
    const hasTop = neighbors.top;
    const hasBottom = neighbors.bottom;
    const hasLeft = neighbors.left;
    const hasRight = neighbors.right;
    
    // Coins intérieurs prioritaires
    if (hasLeft && hasBottom && !hasTop && !hasRight) return 4; // W05
    if (hasRight && hasBottom && !hasTop && !hasLeft) return 3; // W04
    if (hasLeft && hasTop && !hasBottom && !hasRight) return 9; // W10
    if (hasRight && hasTop && !hasBottom && !hasLeft) return 8; // W09
    
    // Edges
    if (hasBottom && !hasTop) {
      if (hasLeft && !hasRight) return 2; // W03
      if (hasRight && !hasLeft) return 0; // W01
      return 1; // W02
    }
    
    if (hasTop && !hasBottom) {
      if (hasLeft && !hasRight) return 12; // W13
      if (hasRight && !hasLeft) return 10; // W11
      return 11; // W12
    }
    
    if (hasRight && !hasLeft) {
      return 5; // W06
    }
    
    if (hasLeft && !hasRight) {
      return 7; // W08
    }
    
    // Coins diagonaux
    if (!hasTop && !hasBottom && !hasLeft && !hasRight) {
      if (neighbors.bottomRight) return 0; // W01
      if (neighbors.bottomLeft) return 2; // W03
      if (neighbors.topRight) return 10; // W11
      if (neighbors.topLeft) return 12; // W13
    }

    return null;
  }

  /**
   * Place une tile spécifique de la zone d'eau
   */
  placeTileFromWaterZone(gridX, gridY, waterTileIndex) {
    if (!this.selectedWaterZone) return;
    
    // La zone d'eau doit être arrangée en grille 5x3 (W01-W15)
    // Calculer les coordonnées dans la zone basées sur l'index
    const tilesPerRow = 5; // W01-W05, W06-W10, W11-W15
    const tileRow = Math.floor(waterTileIndex / tilesPerRow);
    const tileCol = waterTileIndex % tilesPerRow;
    
    // Coordonnées de la tile dans la zone
    const tileInZoneX = this.selectedWaterZone.bounds.startX + tileCol;
    const tileInZoneY = this.selectedWaterZone.bounds.startY + tileRow;
    
    // Calculer l'index de cette tile dans le tileset
    const tileIndex = this.map.tileset.getTileIndex(tileInZoneX, tileInZoneY);
    
    // Placer la tile sur la carte
    this.map.setTile(gridX, gridY, tileIndex);
  }

  /**
   * Exporte et sauvegarde la map pour le mode game
   */
  exportMapForGame() {
    const gameData = this.map.exportForGame();
    
    try {
      localStorage.setItem('gameMap', JSON.stringify(gameData));
      console.log('Map exported for game mode');
      console.log('Export size estimation:', JSON.stringify(gameData).length, 'characters');
      return gameData;
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        console.error('Map too large for localStorage. Trying to reduce data...');
        
        // Essayer avec seulement les layers les plus importants
        const reducedData = {
          ...gameData,
          layers: gameData.layers.slice(0, 3) // Garder seulement les 3 premiers layers
        };
        
        try {
          localStorage.setItem('gameMap', JSON.stringify(reducedData));
          console.warn('Exported with reduced layer count');
          return reducedData;
        } catch (e2) {
          console.error('Even reduced map is too large:', e2);
          alert('Map trop volumineuse pour être exportée. Essayez de réduire le nombre de tiles placées.');
          return null;
        }
      }
      throw e;
    }
  }

  /**
   * Teste la map en mode game
   */
  testInGameMode() {
    console.log('Starting map export for game mode...');
    
    // Exporter la map
    const result = this.exportMapForGame();
    
    if (result) {
      console.log('Export completed, opening game...');
      // Ouvrir le mode game dans un nouvel onglet
      window.open('index.html', '_blank');
    }
  }

  /**
   * La boucle de rendu principale de l'éditeur.
   */
  animate() {
    this.draw(); // Appelle maintenant notre nouvelle méthode de dessin
    requestAnimationFrame(this.animate.bind(this));
  }
}
