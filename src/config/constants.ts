export const WA_SELECTORS = {
  // Panel lateral (Lista de chats) — cubre tanto la lista sin filtrar como los resultados de
  // búsqueda: en ambos casos WhatsApp arma un role="grid" real, con cada fila como role="row"
  // (data-testid="list-item-N") — NO role="listitem" (confirmado a mano en los dos casos, ago-2026;
  // antes se asumía "listitem" para la búsqueda y no matcheaba nada ahí, por eso openChatByQuery
  // hacía la búsqueda pero nunca entraba al chat). Se deja "listitem" como fallback por si alguna
  // vista vieja/distinta todavía lo usa.
  PANEL_SIDE: '#pane-side',
  CHAT_ITEM: '#pane-side div[role="row"][data-testid^="list-item-"], #pane-side div[role="listitem"]',
  CHAT_TITLE: 'span[dir="auto"][title]',
  SEARCH_INPUT: 'div[contenteditable="true"][data-tab="3"]',

  // Ventana principal del chat activo
  MAIN_CHAT: '#main',
  CHAT_HEADER: '#main header',
  CHAT_HEADER_NAME: '#main header span[dir="auto"]',
  MESSAGE_INPUT: '#main footer div[contenteditable="true"][data-tab="10"]',
  SEND_BUTTON: '#main footer button span[data-icon="wds-ic-send-filled"]', // verificado a mano, ago-2026

  // Mensajes en la conversación — WhatsApp Web usa CSS atómico sin nombres semánticos
  // (ej: "x78zum5 xdt5ytf"), así que NO hay que engancharse a clases acá. Lo único estable
  // son los atributos data-* (verificado a mano inspeccionando el DOM real en agosto 2026).
  MESSAGE_ROW: '[data-id]', // fila de un mensaje (data-id = id único de WhatsApp)
  MESSAGE_CONTAINER: '[data-testid="msg-container"]',
  MESSAGE_TEXT: '[data-testid="selectable-text"]',
  MESSAGE_TAIL_IN: '[data-icon="tail-in"]', // presente sólo en mensajes ENTRANTES
  MESSAGE_TAIL_OUT: '[data-icon="tail-out"]', // presente sólo en mensajes SALIENTES
} as const;
