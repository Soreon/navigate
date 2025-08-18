/**
 * Classe pour calculer intelligemment les tiles de chemin basées sur les transitions herbe/chemin
 * Implémente l'algorithme décrit dans CLAUDE.md pour les 15 tiles de chemin (C01-C15)
 */
export class PathTileCalculator {
  constructor() {
    // Mapping des patterns de voisinage vers les indices de tiles
    // Chaque pattern est défini par les 4 subdivisions : [haut-gauche, haut-droite, bas-gauche, bas-droite]
    // false = Herbe (H), true = Chemin (C)
    this.tilePatterns = new Map([
      // C01 - Coin de terre en bas à droite (H H / H C)
      ['0001', 0],  // Index 0 pour C01
      
      // C02 - Terre en bas (H H / C C)
      ['0011', 1],  // Index 1 pour C02
      
      // C03 - Coin de terre en bas à gauche (H H / C H)
      ['0010', 2],  // Index 2 pour C03
      
      // C04 - Coin d'herbe en haut à gauche (H C / C C)
      ['0111', 3],  // Index 3 pour C04
      
      // C05 - Coin d'herbe en haut à droite (C H / C C)
      ['1011', 4],  // Index 4 pour C05
      
      // C06 - Terre à droite (H C / H C)
      ['0101', 5],  // Index 5 pour C06
      
      // C07 - Chemin complet (C C / C C)
      ['1111', 6],  // Index 6 pour C07
      
      // C08 - Terre à gauche (C H / C H)
      ['1010', 7],  // Index 7 pour C08
      
      // C09 - Coin d'herbe en bas à gauche (C C / H C)
      ['1101', 8],  // Index 8 pour C09
      
      // C10 - Coin d'herbe en bas à droite (C C / C H)
      ['1110', 9],  // Index 9 pour C10
      
      // C11 - Coin de terre en haut à droite (H C / H H)
      ['0100', 10], // Index 10 pour C11
      
      // C12 - Terre en haut (C C / H H)
      ['1100', 11], // Index 11 pour C12
      
      // C13 - Coin de terre en haut à gauche (C H / H H)
      ['1000', 12], // Index 12 pour C13
      
      // C14 - Chemin alternatif 1 (C C / C C)
      ['1111_alt1', 13], // Index 13 pour C14
      
      // C15 - Chemin alternatif 2 (C C / C C)
      ['1111_alt2', 14]  // Index 14 pour C15
    ]);
  }

  /**
   * Calcule l'index de la tile de chemin appropriée basée sur le voisinage
   * @param {EditorMap} map - La carte de l'éditeur
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   * @param {Array} pathZone - La zone de chemin sélectionnée
   * @returns {number} Index de la tile dans la zone (0-14 pour C01-C15)
   */
calculatePathTileIndex(map, x, y) {
    // La tile centrale doit être un chemin pour qu'on dessine quoi que ce soit
    const centerIsPath = this.isPath(map, x, y);
    if (!centerIsPath) {
        // Si la tile centrale n'est pas un chemin, on vérifie si elle doit le devenir
        // à cause de ses voisins (transition).
    }

    const neighbors = this.getNeighborStates(map, x, y);
    const subdivisions = this.calculateSubdivisions(centerIsPath, neighbors);
    const pattern = subdivisions.map(s => s ? '1' : '0').join('');

    // Si le pattern est '0000', c'est de l'herbe, on ne renvoie rien.
    if (pattern === '0000') {
      return null;
    }

    let tileIndex = this.tilePatterns.get(pattern);

    if (tileIndex === undefined) {
      // Si un pattern non prévu apparaît, on utilise la tile de chemin complet
      // si la case centrale est un chemin, sinon on ne fait rien.
      tileIndex = centerIsPath ? 6 : null; // C07 - Chemin complet
    }

    return tileIndex;
  }

  /**
   * Obtient l'état (herbe/chemin) des 8 voisins autour d'une position
   * @param {EditorMap} map 
   * @param {number} x 
   * @param {number} y 
   * @returns {Object} États des voisins
   */
  getNeighborStates(map, x, y) {
    const neighbors = {
      topLeft: this.isPath(map, x - 1, y - 1),
      top: this.isPath(map, x, y - 1),
      topRight: this.isPath(map, x + 1, y - 1),
      left: this.isPath(map, x - 1, y),
      right: this.isPath(map, x + 1, y),
      bottomLeft: this.isPath(map, x - 1, y + 1),
      bottom: this.isPath(map, x, y + 1),
      bottomRight: this.isPath(map, x + 1, y + 1)
    };
    
    return neighbors;
  }

  /**
   * Calcule les 4 subdivisions d'une tile basées sur les voisins
   * @param {Object} neighbors - États des 8 voisins
   * @returns {Array} [haut-gauche, haut-droite, bas-gauche, bas-droite]
   */
  calculateSubdivisions(centerIsPath, neighbors) {
    // Un coin (subdivision) est de type "Chemin" SEULEMENT SI 
    // la tile centrale ET les deux tiles adjacentes à ce coin sont des chemins.
    const topLeft = centerIsPath && neighbors.top && neighbors.left;
    const topRight = centerIsPath && neighbors.top && neighbors.right;
    const bottomLeft = centerIsPath && neighbors.bottom && neighbors.left;
    const bottomRight = centerIsPath && neighbors.bottom && neighbors.right;

    return [topLeft, topRight, bottomLeft, bottomRight];
  }

  /**
   * Détermine si une tile à une position donnée est un chemin
   * @param {EditorMap} map 
   * @param {number} x 
   * @param {number} y 
   * @returns {boolean} True si c'est un chemin, false si c'est de l'herbe
   */
  isPath(map, x, y) {
    // D'abord vérifier si la position est marquée comme chemin pendant le dessin
    if (this.isMarkedAsPath(x, y)) {
      return true;
    }
    
    // Ensuite vérifier si elle contient déjà une tile de chemin
    const tile = map.getTile(x, y);
    
    // Si pas de tile, c'est de l'herbe par défaut
    if (tile === undefined) {
      return false;
    }
    
    // Ici on pourrait ajouter une logique plus sophistiquée pour détecter
    // si une tile existante est un chemin ou de l'herbe
    // Pour l'instant, on considère que toute tile existante pourrait être un chemin
    return this.isTilePath(tile);
  }

  /**
   * Détermine si un index de tile correspond à un chemin
   * @param {number} tileIndex 
   * @returns {boolean}
   */
  isTilePath(tileIndex) {
    // Cette méthode devrait être adaptée selon votre tileset
    // Pour l'instant, on considère qu'une tile existe = chemin potentiel
    // Vous pourriez définir des ranges d'indices pour les tiles de chemin
    return tileIndex !== undefined;
  }

  /**
   * Marque une position comme étant un chemin (pour les calculs futurs)
   * @param {number} x 
   * @param {number} y 
   */
  markAsPath(x, y) {
    // Cette méthode pourrait maintenir un Set des positions de chemin
    // pour les calculs de voisinage pendant le dessin
    if (!this.pathPositions) {
      this.pathPositions = new Set();
    }
    this.pathPositions.add(`${x},${y}`);
  }

  /**
   * Vérifie si une position est marquée comme chemin
   * @param {number} x 
   * @param {number} y 
   * @returns {boolean}
   */
  isMarkedAsPath(x, y) {
    return this.pathPositions && this.pathPositions.has(`${x},${y}`);
  }

  /**
   * Nettoie les positions marquées (après finalisation du chemin)
   */
  clearMarkedPositions() {
    if (this.pathPositions) {
      this.pathPositions.clear();
    }
  }
}