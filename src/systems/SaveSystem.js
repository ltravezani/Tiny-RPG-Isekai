// Salva em localStorage (roteiro, seção 10). Um slot por enquanto; o formato já tem versão.
const KEY = 'solaria:save:1';
const VERSION = 2; // v2: ferramentas, diárias e mapa amplo

export const SaveSystem = {
  load() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY));
      return data?.version === VERSION ? data : null;
    } catch {
      return null;
    }
  },

  save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ version: VERSION, savedAt: Date.now(), ...state }));
      return true;
    } catch {
      return false;
    }
  },

  clear() {
    try { localStorage.removeItem(KEY); } catch { /* sem storage */ }
  },
};
