export const WA_SELECTORS = {
  // Panel lateral (Lista de chats)
  PANEL_SIDE: '#pane-side',
  CHAT_ITEM: '#pane-side div[role="listitem"]',
  CHAT_TITLE: 'span[dir="auto"][title]',
  SEARCH_INPUT: 'div[contenteditable="true"][data-tab="3"]',

  // Ventana principal del chat activo
  MAIN_CHAT: '#main',
  CHAT_HEADER: '#main header',
  CHAT_HEADER_NAME: '#main header span[dir="auto"]',
  MESSAGE_INPUT: '#main footer div[contenteditable="true"][data-tab="10"]',
  SEND_BUTTON: '#main footer button span[data-icon="send"]',

  // Mensajes en la conversación
  MESSAGE_IN: 'div.message-in',
  MESSAGE_OUT: 'div.message-out',
  MESSAGE_TEXT: 'span.selectable-text',
} as const;
