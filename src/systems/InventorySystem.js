import { events } from './EventBus.js';

export class InventorySystem {
  constructor(state = {}) {
    this.gold = state.gold ?? 0;
    this.items = { ...(state.items ?? {}) };
  }

  count(id) { return this.items[id] ?? 0; }

  add(id, amount = 1) {
    this.items[id] = this.count(id) + amount;
    events.emit('inventory:changed', { id, amount });
  }

  remove(id, amount = 1) {
    if (this.count(id) < amount) return false;
    this.items[id] -= amount;
    if (!this.items[id]) delete this.items[id];
    events.emit('inventory:changed', { id, amount: -amount });
    return true;
  }

  addGold(amount) {
    this.gold += amount;
    events.emit('gold:changed', { gold: this.gold, amount });
  }

  snapshot() { return { gold: this.gold, items: { ...this.items } }; }
}
