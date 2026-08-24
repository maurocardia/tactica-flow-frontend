// Servicio de almacenamiento que interactúa con chrome.storage.
export const StorageService = {
  /** Recupera una nota para un contacto. Devuelve una cadena vacía si el almacenamiento de Chrome no está disponible. */
  async getNote(contactName: string): Promise<string> {
    // Protección contra la ausencia de la API de Chrome
    if (typeof chrome === 'undefined' || !(chrome?.storage?.local)) {
      return '';
    }

    return new Promise((resolve) => {
      chrome.storage.local.get([`note_${contactName}`], (result) => {
        const stored = result[`note_${contactName}`] as unknown;
        resolve(typeof stored === 'string' ? stored : '');
      });
    });
  },

  /** Persist a note for a contact. No‑op if Chrome storage is unavailable. */
  async saveNote(contactName: string, note: string): Promise<void> {
    // Same guard – now clearly boolean vs. boolean
    if (typeof chrome === 'undefined' || !(chrome?.storage?.local)) {
      return;
    }

    return new Promise((resolve) => {
      chrome.storage.local.set({ [`note_${contactName}`]: note }, () => resolve());
    });
  },
};

