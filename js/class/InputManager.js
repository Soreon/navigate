export default class InputManager {
  constructor() {
    this.keys = {}; // Stocke l'état de toutes les touches pressées

    // On attache les écouteurs d'événements au document
    document.addEventListener('keydown', (e) => { this.keys[e.key] = true; });
    document.addEventListener('keyup', (e) => { this.keys[e.key] = false; });
  }

  /**
   * Traduit l'état des touches en commandes de jeu abstraites.
   * @returns {{move: string|null, isRunning: boolean}}
   */
  getCommands() {
    const commands = {
      move: null,
      isRunning: !!this.keys.Shift, // La course est une simple traduction de la touche Shift
    };

    // Détermine la direction du mouvement
    if (this.keys.ArrowUp) {
      commands.move = 'UP';
    } else if (this.keys.ArrowDown) {
      commands.move = 'DOWN';
    } else if (this.keys.ArrowLeft) {
      commands.move = 'LEFT';
    } else if (this.keys.ArrowRight) {
      commands.move = 'RIGHT';
    }

    return commands;
  }
}