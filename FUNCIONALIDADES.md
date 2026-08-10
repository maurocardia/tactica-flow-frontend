# Funcionalidades del frontend — estado actual

## Qué es

Extensión de Chrome que inyecta un panel lateral sobre WhatsApp Web para atención al cliente:
ficha de contacto, chatbot de auto-respuesta y asistente de IA, integrados con el backend de
Tactica Flow. No usa la API oficial de WhatsApp Business — lee y escribe directamente sobre el
DOM de `web.whatsapp.com`.

## 1. Funciones implementadas

- **Panel lateral** inyectado sobre WhatsApp Web vía content script + Shadow DOM.
- **Lectura del contacto activo**: nombre del chat abierto, actualizado en vivo.
- **Motor de auto-respuesta**: detecta mensajes entrantes del chat abierto, los compara contra
  reglas de palabra clave, inserta una respuesta y la envía sola tras una demora cancelable de 3
  segundos.
- **Editor de reglas** (ventana emergente): crear, editar, activar/desactivar y borrar reglas de
  palabra clave → respuesta.
- **Asistente de IA**: chat que envía mensajes al bot y muestra su respuesta.
- **Notas por contacto**: guardadas localmente en el navegador.
- Módulos de Ficha 360°, herramientas (marcador, reasignar, plantillas, etc.) y selección de
  mensajes: presentes en la interfaz pero sin datos ni acciones reales todavía.

## 2. Archivos relevantes

```
src/
├── content/index.tsx          # inyecta el panel (Shadow DOM) sobre WhatsApp Web
├── background/index.ts        # puente HTTP hacia el backend
├── popup/                     # popup de la barra de Chrome (estado de conexión)
├── components/
│   ├── Sidebar.tsx
│   └── sidebar/
│       ├── ContactCard.tsx        # nombre del contacto activo
│       ├── ChatbotModule.tsx      # toggle del bot + acceso al editor de reglas
│       ├── BotFlowModal.tsx       # editor de reglas (ventana emergente)
│       ├── AiModule.tsx           # asistente de IA
│       ├── Header.tsx, Ficha360.tsx, ToolsGrid.tsx, SelectMessagesCard.tsx, BotRulesCard.tsx
├── hooks/
│   ├── useActiveChat.ts       # título del chat activo
│   ├── useAutoReply.ts        # motor de auto-respuesta
│   └── useContactNotes.ts     # notas por contacto
├── services/
│   ├── api.service.ts         # llamadas al backend
│   ├── dom.service.ts         # lectura/escritura del DOM de WhatsApp Web
│   └── storage.service.ts     # almacenamiento local
├── config/constants.ts        # selectores del DOM de WhatsApp (WA_SELECTORS)
└── types/                     # tipos de datos (reglas, conversaciones)
```

## 3. Cómo está armado

- **Manifest V3**. El content script se carga vía `content-loader.js` (un `import()` dinámico),
  no directamente — un content script no puede declararse como módulo ES en Manifest V3, y el
  código de la extensión sí usa módulos.
- El panel se monta dentro de un **Shadow DOM** para aislar sus estilos de los de WhatsApp Web.
- Toda comunicación con el backend pasa por el **service worker** (`background/index.ts`), que
  hace las llamadas HTTP a `http://localhost:5000/api`.

## 4. Motor de auto-respuesta

1. Carga las reglas activas desde el backend.
2. Observa el chat abierto y detecta mensajes entrantes nuevos.
3. Si el texto contiene la palabra clave de alguna regla activa, inserta la respuesta configurada
   en el cuadro de mensaje.
4. Muestra una cuenta regresiva de 3 segundos (cancelable) antes de enviar.
5. Envía el mensaje automáticamente si no se cancela.

## 5. Limitaciones (a nivel DOM)

- **Solo el chat abierto**: la extensión únicamente puede leer y actuar sobre la conversación
  visible en pantalla; no tiene acceso a otros chats sin abrirlos.
- **Depende de atributos del DOM de WhatsApp Web** (`data-icon`, `data-testid`, `data-id`) que no
  son parte de una API pública — un cambio de interfaz en WhatsApp Web puede romper la detección
  de mensajes o el envío sin previo aviso.
- **Sin memoria de conversación**: cada mensaje entrante se evalúa de forma aislada; no hay
  contexto de qué se dijo antes en la misma charla.
- **Identificación de contacto por texto del encabezado**: si WhatsApp muestra temporalmente otro
  texto en el header (por ejemplo, "escribiendo…"), la lectura del nombre puede verse afectada.
- **Sin distinción de contactos**: las reglas de auto-respuesta aplican por igual a cualquier chat
  abierto.

## 6. Cómo probarlo

1. Backend corriendo en `localhost:5000`.
2. `npm run build` en este proyecto → genera `dist/`.
3. Cargar `dist/` como extensión descomprimida en `chrome://extensions`.
4. Abrir `web.whatsapp.com` (refrescar la pestaña si ya estaba abierta).
5. Activar el chatbot desde el panel y probar con un mensaje que matchee una regla.
