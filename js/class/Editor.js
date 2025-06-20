import { EditorMap } from './EditorMap.js';
import { TileSet } from './TileSet.js';
import { TileSelector } from './TileSelector.js';
import { RandomNumberGenerator } from './RandomNumberGenerator.js';
import { SEED } from '../constants.js';

export default class Editor {
  constructor() {
    // --- Initialisation des canvas ---
    this.canvas = document.getElementById('canvas');
    this.context = this.canvas.getContext('2d');
    this.canvas.width = 1000;
    this.canvas.height = 1000;
    this.context.imageSmoothingEnabled = false;

    this.tilesCanvas = document.getElementById('tiles');

    // --- Création des instances principales ---
    const mapTileset = new TileSet('../image/tileset.png', 1504, 2519, 16, 157, 94);
    
    this.ranugen = new RandomNumberGenerator(SEED);
    this.map = new EditorMap(100, 100, this.canvas, this.ranugen, mapTileset);
    this.tileSelector = new TileSelector(this.map.tileset, this.tilesCanvas);
    
    // --- Initialisation de la caméra et de l'UI ---
    this.camera = { x: 0, y: 0 };
    
    this.renderLayerList(); // Premier rendu de l'interface des calques
    this._setupEventListeners();
    
    // --- Démarrage de la boucle de dessin ---
    this.animate();
    this.tileSelector.draw(); // Premier dessin du sélecteur de tuiles
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
      const li = e.target.closest('li');
      if (li) {
        const index = parseInt(li.dataset.index, 10);
        this.map.setActiveLayer(index);
        this.renderLayerList();
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

    // --- Événements des boutons de la barre d'outils ---
    document.querySelector('#home').addEventListener('click', () => {
      this.camera.x = 0;
      this.camera.y = 0;
    });
    
    document.querySelector('#undo').addEventListener('click', () => this.map.undo());
    document.querySelector('#redo').addEventListener('click', () => this.map.redo());
    
    document.querySelector('#clear').addEventListener('click', () => {
      this.map.clear();
    });

    document.querySelector('#tool').addEventListener('click', () => {
      this.map.tool = 'brush';
      document.body.dataset.tool = 'brush';
    });

    document.querySelector('#erase').addEventListener('click', () => {
      this.map.tool = 'erase';
      document.body.dataset.tool = 'erase';
    });

    document.querySelector('#fill').addEventListener('click', () => {
      this.map.tool = 'fill';
      document.body.dataset.tool = 'fill';
    });
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