import Phaser from 'phaser';

// Barramento de eventos do jogo (roteiro, seção 12). Toda ação relevante emite um
// evento ('crop:harvested', 'tile:tilled'...) e também '*' com (nome, payload),
// para missões, conquistas e tutorial só escutarem.
class EventBus extends Phaser.Events.EventEmitter {
  emit(name, payload) {
    const handled = super.emit(name, payload);
    super.emit('*', name, payload);
    return handled;
  }
}

export const events = new EventBus();
