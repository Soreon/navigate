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

    this.tilesCanvas = document.getElementById('tiles');

    this.toolButtons = {
      brush: document.querySelector('#tool'),
      fill: document.querySelector('#fill'),
      erase: document.querySelector('#erase'),
      typeZone: document.querySelector('#type-zone-tool'),
      tree: document.querySelector('#tree-tool'),
      path: document.querySelector('#path-tool'),
    };

    // --- Création des instances principales ---
    const mapTileset = new TileSet('../../image/tileset.png', 1504, 2519, 16, 157, 94);
    this.ranugen = new RandomNumberGenerator(SEED);
    this.map = new EditorMap(100, 100, this.canvas, this.ranugen, mapTileset);
    this.typeZoneManager = new TypeZoneManager();
    this.pathTileCalculator = new PathTileCalculator();
    this.tileSelector = new TileSelector(this.map.tileset, this.tilesCanvas, this.typeZoneManager);
    
    // --- Initialisation de la caméra et de l'UI ---
    this.camera = { x: 0, y: 0 };
    this.selectedTreeZone = null;
    this.selectedPathZone = null;
    this.mousePosition = { x: 0, y: 0 }; // Position de la souris sur le canvas principal
    this.isMouseOverCanvas = false; // Pour savoir si la souris est sur le canvas
    this.pathDrawing = []; // Points du chemin en cours de dessin
    this.pathClickStartPosition = null; // Position du clic initial pour détecter clic vs drag
    
    this.renderLayerList(); // Premier rendu de l'interface des calques
    this.renderTypeZonePanel(); // Premier rendu du panneau des zones de type
    this.renderTreePanel(); // Premier rendu du panneau des arbres
    this.renderPathPanel(); // Premier rendu du panneau des chemins
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

      // Le calque Background (index 0) n'est pas déplaçable
      if (i > 0) {
        li.draggable = true;
        const handle = document.createElement('i');
        handle.className = 'fa-solid fa-grip-vertical drag-handle';
        li.appendChild(handle);
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
      } else {
        // Autres outils
        if (this.tileSelector.selection.length === 0 && this.map.tool !== 'erase') return;
        
        const firstSelectedTile = this.tileSelector.selection[0];
        const tileIndex = firstSelectedTile ? this.tileSelector.tileset.getTileIndex(firstSelectedTile.x, firstSelectedTile.y) : null;
        
        if (tileIndex !== null || this.map.tool === 'erase') {
          this.map.useTool(mouseX, mouseY, tileIndex, this.camera);
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
            
            // Si c'était un simple clic, on place juste une tile
            if (isClick && this.pathDrawing.length <= 1) {
              // Placer une seule tile C07 à la position cliquée
              this.placeTileFromPathZone(gridCoords.x, gridCoords.y, 6); // C07
              this.map.save();
            } else {
              // Sinon, on finalise simplement le chemin déjà dessiné
              this.finishPath();
            }
            this.pathClickStartPosition = null;
          } else {
            this.finishPath();
          }
        } else {
          this.map.save();
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
      this.map.save();
      this.renderLayerList();
    });

    const layerList = document.getElementById('layer-list');

    layerList.addEventListener('click', (e) => {
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
    document.querySelector('#undo').addEventListener('click', () => { this.map.undo(); this.draw(); });
    document.querySelector('#redo').addEventListener('click', () => { this.map.redo(); this.draw(); });
    document.querySelector('#clear').addEventListener('click', () => {
      this.map.clear();
      this.draw();
    });

    // On utilise la nouvelle méthode pour gérer le changement d'outil et de style
    this.toolButtons.brush.addEventListener('click', () => {
        this.map.tool = 'brush';
        this.tileSelector.setTool('tile');
        this.hideTypeZonePanel();
        this.hideTreePanel();
        this.hidePathPanel();
        this.setActiveToolButton('brush');
        this.tileSelector.draw(); // Forcer le rendu pour masquer les zones
    });

    this.toolButtons.erase.addEventListener('click', () => {
        this.map.tool = 'erase';
        this.tileSelector.setTool('tile');
        this.hideTypeZonePanel();
        this.hideTreePanel();
        this.hidePathPanel();
        this.setActiveToolButton('erase');
        this.tileSelector.draw(); // Forcer le rendu pour masquer les zones
    });

    this.toolButtons.fill.addEventListener('click', () => {
        this.map.tool = 'fill';
        this.tileSelector.setTool('tile');
        this.hideTypeZonePanel();
        this.hideTreePanel();
        this.hidePathPanel();
        this.setActiveToolButton('fill');
        this.tileSelector.draw(); // Forcer le rendu pour masquer les zones
    });

    this.toolButtons.typeZone.addEventListener('click', () => {
        this.map.tool = 'typeZone';
        this.tileSelector.setTool('typeZone');
        this.setActiveToolButton('typeZone');
        this.hideTreePanel();
        this.hidePathPanel();
        this.showTypeZonePanel();
        this.tileSelector.draw(); // Forcer le rendu pour afficher les zones
    });

    this.toolButtons.tree.addEventListener('click', () => {
        this.map.tool = 'tree';
        this.tileSelector.setTool('tree');
        this.setActiveToolButton('tree');
        this.hideTypeZonePanel();
        this.hidePathPanel();
        this.showTreePanel();
        this.tileSelector.draw(); // Forcer le rendu pour afficher les zones tree
    });

    this.toolButtons.path.addEventListener('click', () => {
        this.map.tool = 'path';
        this.tileSelector.setTool('path');
        this.setActiveToolButton('path');
        this.hideTypeZonePanel();
        this.hideTreePanel();
        this.showPathPanel();
        this.tileSelector.draw(); // Forcer le rendu pour afficher les zones path
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
    // Selon CLAUDE.md et l'exemple fourni, nous devons créer un pattern 3x3 autour du chemin
    // L'arrangement des tiles est :
    // C01 C02 C03
    // C06 C07 C08  
    // C11 C12 C13
    
    // Compter les voisins pour déterminer la position relative
    const hasTop = neighbors.top;
    const hasBottom = neighbors.bottom;
    const hasLeft = neighbors.left;
    const hasRight = neighbors.right;
    
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
      if (hasTop && !hasBottom) return 0; // C01 - coin haut-gauche
      if (hasBottom && !hasTop) return 10; // C11 - coin bas-gauche  
      if (hasTop && hasBottom) return 5; // C06 - milieu gauche
      if (!hasTop && !hasBottom) return 5; // C06 - milieu gauche par défaut
    }
    
    // Position à droite du chemin (colonne de droite)
    if (hasLeft && !hasRight) {
      if (hasTop && !hasBottom) return 2; // C03 - coin haut-droite
      if (hasBottom && !hasTop) return 12; // C13 - coin bas-droite
      if (hasTop && hasBottom) return 7; // C08 - milieu droite  
      if (!hasTop && !hasBottom) return 7; // C08 - milieu droite par défaut
    }
    
    // Coins diagonaux (positions où il n'y a pas de chemin adjacent direct)
    if (!hasTop && !hasBottom && !hasLeft && !hasRight) {
      // Vérifier les diagonales pour déterminer la position du coin
      if (neighbors.bottomRight) return 0; // C01 - coin haut-gauche
      if (neighbors.bottomLeft) return 2; // C03 - coin haut-droite
      if (neighbors.topRight) return 10; // C11 - coin bas-gauche
      if (neighbors.topLeft) return 12; // C13 - coin bas-droite
    }

    // Si aucun pattern reconnu, pas de transition
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
    this.map.save();
  }

  /**
   * La boucle de rendu principale de l'éditeur.
   */
  animate() {
    this.draw(); // Appelle maintenant notre nouvelle méthode de dessin
    requestAnimationFrame(this.animate.bind(this));
  }
}
