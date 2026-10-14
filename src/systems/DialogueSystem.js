import { events } from './EventBus.js';

// Escolhe a fala de um NPC pelo estado das missões (roteiro: Vovó Tereza faz o tutorial).
export class DialogueSystem {
  constructor(dialogues, quests, rng = Math.random) {
    this.dialogues = dialogues;
    this.quests = quests;
    this.rng = rng;
  }

  conditionsMet(when = {}) {
    if (when.questActive && !this.quests.active.some(q => q.id === when.questActive)) return false;
    if (when.questCompleted && !this.quests.completed.includes(when.questCompleted)) return false;
    return true;
  }

  // Devolve { name, lines } e avisa o EventBus quando a conversa termina (via finish).
  start(npcId) {
    const npc = this.dialogues[npcId];
    const script = npc.scripts.find(s => this.conditionsMet(s.when));
    const lines = script.random ? script.random[Math.floor(this.rng() * script.random.length)] : script.lines;
    return {
      name: npc.name,
      lines,
      finish: () => { if (script.emit) events.emit(script.emit, { npcId, scriptId: script.id }); },
    };
  }
}
