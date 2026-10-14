import { events } from './EventBus.js';

const matches = (filter = {}, payload = {}) => Object.entries(filter).every(([k, v]) => payload[k] === v);

// Missões orientadas a eventos (roteiro, seção 12). Por enquanto só a cadeia principal;
// diárias entram com o Quadro de Missões.
export class QuestSystem {
  constructor(templates, inventory, state = {}) {
    this.templates = Object.fromEntries(templates.map(t => [t.id, t]));
    this.inventory = inventory;
    this.active = state.active ?? [{ id: templates[0].id, progress: 0 }];
    this.completed = state.completed ?? [];
    events.on('*', (name, payload) => this.onEvent(name, payload));
  }

  current() {
    const q = this.active[0];
    return q && { ...this.templates[q.id], progress: q.progress };
  }

  onEvent(name, payload) {
    for (const q of [...this.active]) {
      const t = this.templates[q.id];
      if (t.objective.event !== name || !matches(t.objective.filter, payload)) continue;
      q.progress = Math.min(q.progress + (payload?.amount ?? 1), t.objective.count);
      events.emit('quest:progress', { id: q.id, progress: q.progress });
      if (q.progress >= t.objective.count) this.complete(q);
    }
  }

  complete(q) {
    const t = this.templates[q.id];
    this.active = this.active.filter(a => a !== q);
    this.completed.push(q.id);
    if (t.rewards?.gold) this.inventory.addGold(t.rewards.gold);
    for (const [id, n] of Object.entries(t.rewards?.items ?? {})) this.inventory.add(id, n);
    if (t.next) this.active.push({ id: t.next, progress: 0 });
    events.emit('quest:completed', { id: q.id, title: t.title, rewards: t.rewards });
  }

  snapshot() { return { active: this.active.map(q => ({ ...q })), completed: [...this.completed] }; }
}
