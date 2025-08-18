import { EditorMap } from './EditorMap.js';
import { TileSet } from '../common/TileSet.js';
import { TileSelector } from './TileSelector.js';
import { TypeZoneManager } from './TypeZoneManager.js';
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
    };

    // --- Création des instances principales ---
    const mapTileset = new TileSet('../../image/tileset.png', 1504, 2519, 16, 157, 94);
    this.ranugen = new RandomNumberGenerator(SEED);
    this.map = new EditorMap(100, 100, this.canvas, this.ranugen, mapTileset);
    this.typeZoneManager = new TypeZoneManager();
    this.tileSelector = new TileSelector(this.map.tileset, this.tilesCanvas, this.typeZoneManager);
    
    // --- Initialisation de la caméra et de l'UI ---
    this.camera = { x: 0, y: 0 };
    
    this.renderLayerList(); // Premier rendu de l'interface des calques
    this.renderTypeZonePanel(); // Premier rendu du panneau des zones de type
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
      // Pour la gomme, pas besoin de tuile sélectionnée.
      if (this.tileSelector.selection.length === 0 && this.map.tool !== 'erase') return;
      
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const firstSelectedTile = this.tileSelector.selection[0];
      const tileIndex = firstSelectedTile ? this.tileSelector.tileset.getTileIndex(firstSelectedTile.x, firstSelectedTile.y) : null;
      
      // On utilise l'outil si on a une tuile ou si l'outil est la gomme.
      if (tileIndex !== null || this.map.tool === 'erase') {
        this.map.useTool(mouseX, mouseY, tileIndex, this.camera);
      }
    };

    // --- Événements de la souris sur le canvas principal (LOGIQUE RESTAURÉE) ---
    this.canvas.addEventListener('mousedown', (e) => {
      // Clic droit ou CTRL+clic gauche pour le déplacement de la caméra
      if (e.button === 2 || (e.button === 0 && e.ctrlKey)) {
        isCameraDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
      } else if (e.button === 0) { // Clic gauche simple pour dessiner
        isDrawing = true;
        useCurrentTool(e);
      }
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (isCameraDragging) {
        this.camera.x -= e.clientX - dragStartX;
        this.camera.y -= e.clientY - dragStartY;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
      } else if (isDrawing) {
        useCurrentTool(e);
      }
    });

    window.addEventListener('mouseup', () => {
      if (isDrawing) {
        isDrawing = false;
        this.map.save(); // Sauvegarde l'état après avoir dessiné
      }
      if (isCameraDragging) {
        isCameraDragging = false;
      }
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

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
        this.setActiveToolButton('brush');
        this.tileSelector.draw(); // Forcer le rendu pour masquer les zones
    });

    this.toolButtons.erase.addEventListener('click', () => {
        this.map.tool = 'erase';
        this.tileSelector.setTool('tile');
        this.hideTypeZonePanel();
        this.setActiveToolButton('erase');
        this.tileSelector.draw(); // Forcer le rendu pour masquer les zones
    });

    this.toolButtons.fill.addEventListener('click', () => {
        this.map.tool = 'fill';
        this.tileSelector.setTool('tile');
        this.hideTypeZonePanel();
        this.setActiveToolButton('fill');
        this.tileSelector.draw(); // Forcer le rendu pour masquer les zones
    });

    this.toolButtons.typeZone.addEventListener('click', () => {
        this.map.tool = 'typeZone';
        this.tileSelector.setTool('typeZone');
        this.setActiveToolButton('typeZone');
        this.showTypeZonePanel();
        this.tileSelector.draw(); // Forcer le rendu pour afficher les zones
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
    const category = prompt('Catégorie de la zone (ex: path, object, building):', 'custom');
    
    if (name && name.trim()) {
      const zone = this.typeZoneManager.finishCreatingZone(name.trim(), category?.trim() || 'custom');
      if (zone) {
        this.renderTypeZonePanel();
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

    this.context.restore();
  }

  /**
   * La boucle de rendu principale de l'éditeur.
   */
  animate() {
    this.draw(); // Appelle maintenant notre nouvelle méthode de dessin
    requestAnimationFrame(this.animate.bind(this));
  }
}
