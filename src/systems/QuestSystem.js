import { events } from './EventBus.js';

const DAILY_SLOTS = 3;
const STREAK_FOR_WEEKLY = 7;

const matches = (filter = {}, payload = {}) => Object.entries(filter).every(([k, v]) => payload[k] === v);

// Fórmulas dos modelos ("2 + villageLevel"): só números, operadores e variáveis conhecidas.
function evaluate(expr, vars) {
  if (typeof expr === 'number') return expr;
  const src = String(expr).replace(/[a-zA-Z_]\w*/g, name => {
    if (!(name in vars)) throw new Error(`Variável desconhecida na fórmula: ${name}`);
    return String(vars[name]);
  });
  if (!/^[\d\s+\-*/().]+$/.test(src)) throw new Error(`Fórmula inválida: ${expr}`);
  return Math.max(1, Math.round(Function(`"use strict"; return (${src});`)()));
}

function weightedPick(pool, rng) {
  const total = pool.reduce((n, t) => n + (t.weight ?? 1), 0);
  let r = rng() * total;
  for (const t of pool) if ((r -= t.weight ?? 1) < 0) return t;
  return pool[pool.length - 1];
}

// Missões orientadas a eventos (roteiro, seções 9 e 12): a cadeia principal e as
// diárias do Quadro de Missões. Tudo avança só escutando o EventBus.
export class QuestSystem {
  constructor({ main, dailies, crops }, inventory, state = {}, rng = Math.random) {
    this.main = Object.fromEntries(main.map(t => [t.id, t]));
    this.dailyTemplates = dailies;
    this.crops = Object.fromEntries(crops.map(c => [c.id, c]));
    this.inventory = inventory;
    this.rng = rng;
    this.active = state.active ?? [{ id: main[0].id, progress: 0 }];
    this.completed = state.completed ?? [];
    this.dailies = state.dailies ?? [];        // { templateId, title, text, objective, rewards, progress, done }
    this.dailyAccepted = state.dailyAccepted ?? false;
    this.rerolled = state.rerolled ?? false;
    this.dailyStreak = state.dailyStreak ?? 0;
    this.bonusClaimed = state.bonusClaimed ?? false;
    this.season = state.season ?? 'spring';
    events.on('*', (name, payload) => this.onEvent(name, payload));
  }

  current() {
    const q = this.active[0];
    return q && { ...this.main[q.id], progress: q.progress };
  }

  onEvent(name, payload) {
    for (const q of [...this.active]) {
      const t = this.main[q.id];
      if (t.objective.event !== name || !matches(t.objective.filter, payload)) continue;
      q.progress = Math.min(q.progress + (payload?.amount ?? 1), t.objective.count);
      events.emit('quest:progress', { id: q.id, progress: q.progress });
      if (q.progress >= t.objective.count) this.completeMain(q);
    }
    if (!this.dailyAccepted) return;
    for (const d of this.dailies) {
      if (d.done || d.objective.event !== name || !matches(d.objective.filter, payload)) continue;
      d.progress = Math.min(d.progress + (payload?.amount ?? 1), d.objective.count);
      if (d.progress >= d.objective.count) this.completeDaily(d);
    }
  }

  completeMain(q) {
    const t = this.main[q.id];
    this.active = this.active.filter(a => a !== q);
    this.completed.push(q.id);
    this.giveRewards(t.rewards);
    if (t.next) this.active.push({ id: t.next, progress: 0 });
    events.emit('quest:completed', { id: q.id, title: t.title, rewards: t.rewards });
  }

  completeDaily(d) {
    d.done = true;
    this.giveRewards(d.rewards);
    events.emit('daily:completed', { id: d.templateId, title: d.title, rewards: d.rewards });
    if (!this.bonusClaimed && this.dailies.every(x => x.done)) {
      this.bonusClaimed = true;
      this.dailyStreak++;
      const weekly = this.dailyStreak % STREAK_FOR_WEEKLY === 0;
      const inSeason = Object.keys(this.crops).filter(id => this.crops[id].seasons.includes(this.season));
      const seeds = inSeason.length ? inSeason : Object.keys(this.crops);
      const bonus = { gold: weekly ? 500 : 100, items: {} };
      for (let i = 0; i < (weekly ? 8 : 3); i++) {
        const id = `seed:${seeds[Math.floor(this.rng() * seeds.length)]}`;
        bonus.items[id] = (bonus.items[id] ?? 0) + 1;
      }
      this.giveRewards(bonus);
      events.emit('daily:bonus', { weekly, streak: this.dailyStreak, rewards: bonus });
    }
  }

  giveRewards(rewards = {}) {
    if (rewards.gold) this.inventory.addGold(rewards.gold);
    for (const [id, n] of Object.entries(rewards.items ?? {})) this.inventory.add(id, n);
  }

  // --- Diárias ---------------------------------------------------------------

  meets(requires = {}) {
    if (requires.questCompleted && !this.completed.includes(requires.questCompleted)) return false;
    return true;
  }

  // Sorteio do dia: sem tipos repetidos e com pelo menos uma diária de fazenda.
  rollDailies(state) {
    if (this.dailies.length && !this.bonusClaimed) this.dailyStreak = 0; // ontem ficou diária por fazer
    this.season = state.season;
    const pool = this.dailyTemplates.filter(t => this.meets(t.requires));
    const picked = [];
    for (let guard = 0; picked.length < DAILY_SLOTS && guard < 200; guard++) {
      const t = weightedPick(pool, this.rng);
      if (picked.some(p => p.type === t.type)) continue;
      if (picked.length === DAILY_SLOTS - 1 && !picked.some(p => p.farm) && !t.farm) continue;
      picked.push(t);
    }
    this.dailies = picked.map(t => this.instantiate(t, state));
    this.dailyAccepted = false;
    this.rerolled = false;
    this.bonusClaimed = false;
    events.emit('daily:rolled', { count: this.dailies.length });
  }

  instantiate(t, state) {
    const vars = { villageLevel: state.villageLevel ?? 1, day: state.day ?? 1 };
    const filter = { ...(t.objective.filter ?? {}) };
    let cropName = '';
    if (filter.cropId === '$randomUnlockedCrop') {
      const unlocked = (state.unlockedCrops?.length ? state.unlockedCrops : Object.keys(this.crops));
      filter.cropId = unlocked[Math.floor(this.rng() * unlocked.length)];
      cropName = this.crops[filter.cropId].name.toLowerCase();
    }
    const count = evaluate(t.objective.count, vars);
    return {
      templateId: t.id, type: t.type, title: t.title,
      text: t.text.replace('{count}', count).replace('{cropName}', cropName),
      objective: { event: t.objective.event, filter, count },
      rewards: { gold: evaluate(t.rewards.gold ?? 0, vars), xp: t.rewards.xp ?? 0, prosperity: t.rewards.prosperity ?? 0 },
      progress: 0, done: false,
    };
  }

  acceptDailies() {
    if (this.dailyAccepted || !this.dailies.length) return false;
    this.dailyAccepted = true;
    events.emit('daily:accepted', { count: this.dailies.length });
    return true;
  }

  // Troca uma diária por outra de tipo diferente, uma vez por dia.
  reroll(index, state) {
    const d = this.dailies[index];
    if (this.rerolled || !d || d.done || d.progress > 0) return false;
    const others = this.dailies.filter((_, i) => i !== index);
    const needsFarm = !others.some(o => this.dailyTemplates.find(t => t.id === o.templateId)?.farm);
    const pool = this.dailyTemplates.filter(t => this.meets(t.requires) && t.id !== d.templateId && !others.some(o => o.type === t.type) && (!needsFarm || t.farm));
    if (!pool.length) return false;
    this.dailies[index] = this.instantiate(weightedPick(pool, this.rng), state);
    this.rerolled = true;
    return true;
  }

  snapshot() {
    return {
      active: this.active.map(q => ({ ...q })), completed: [...this.completed],
      dailies: this.dailies.map(d => ({ ...d, objective: { ...d.objective }, rewards: { ...d.rewards } })),
      dailyAccepted: this.dailyAccepted, rerolled: this.rerolled, dailyStreak: this.dailyStreak, bonusClaimed: this.bonusClaimed,
      season: this.season,
    };
  }
}
