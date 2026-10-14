import { events } from './EventBus.js';

// Escolhe a fala de um NPC pelo estado das missões e pela afinidade com o jogador.
export class DialogueSystem {
  constructor(dialogues, quests, affinityOf = () => 0, rng = Math.random) {
    this.dialogues = dialogues;
    this.quests = quests;
    this.affinityOf = affinityOf;
    this.rng = rng;
  }

  conditionsMet(when = {}, npcId) {
    const aff = this.affinityOf(npcId);
    if (when.affinityMin !== undefined && aff < when.affinityMin) return false;
    if (when.affinityMax !== undefined && aff > when.affinityMax) return false;
    if (when.questActive && !this.quests.active.some(q => q.id === when.questActive)) return false;
    if (when.questCompleted && !this.quests.completed.includes(when.questCompleted)) return false;
    return true;
  }

  // Devolve { name, lines } e avisa o EventBus quando a conversa termina (via finish).
  start(npcId) {
    const npc = this.dialogues[npcId];
    const script = npc.scripts.find(s => this.conditionsMet(s.when, npcId));
    const lines = script.random ? script.random[Math.floor(this.rng() * script.random.length)] : script.lines;
    return {
      name: npc.name,
      lines,
      finish: () => { if (script.emit) events.emit(script.emit, { npcId, scriptId: script.id }); },
    };
  }
}
