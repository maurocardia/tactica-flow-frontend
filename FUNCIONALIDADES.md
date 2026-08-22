# Funcionalidades del frontend — estado actual

## Qué es

Extensión de Chrome que inyecta un panel lateral sobre WhatsApp Web para atención al cliente y
gestión comercial multicanal, integrada con el backend de Tactica Flow donde corresponde. No usa
la API oficial de WhatsApp Business — lee y escribe directamente sobre el DOM de
`web.whatsapp.com`.

El panel creció a partir de un mockup del cliente mucho más amplio que el chatbot original
(cuentas multicanal, campañas, leads, plantillas, programados). Para evitar el error de mostrar
funciones que no existen, cada módulo nuevo cae en una de dos categorías, sin mezclarse:

## 1. Real (conectado a un backend de verdad)

- **Motor de auto-respuesta**: detecta mensajes entrantes del chat abierto, los compara contra
  reglas de palabra clave del backend, inserta una respuesta y la envía sola tras una demora
  cancelable de 3 segundos.
- **Editor de reglas del bot** ("Editar flujo"): crear, editar, activar/desactivar y borrar reglas
  de palabra clave → respuesta, vía `/api/bot/rules`.
- **Asistente de IA**: resumir charla, transcribir audios y redactar respuestas contra el backend.
- **Base de conocimiento**: crear/editar/borrar bases y subir/borrar documentos (PDF, Word, TXT,
  MD) vía `/api/knowledge-bases`, ya usado por el motor de IA del bot. El toggle se llama
  "Base activa para el bot" (no "asignar a este chat"): el backend hoy es global, no por
  conversación, así que el texto no promete algo que el motor no hace.
- **Lectura del contacto activo**: nombre del chat abierto, actualizado en vivo.

## 2. Prototipo visual (sin integración externa real)

Todo lo demás del mockup nuevo se construyó con la misma fidelidad que el mockup del cliente:
estado en memoria (persistido en `chrome.storage.local` para no perderlo al recargar WhatsApp
Web), sin llamadas a APIs externas, y con "conexiones" simuladas que siempre resuelven con éxito
tras un pequeño delay. No hay ninguna marca visual de "demo" a propósito, para que se vea igual al
mockup aprobado — pero **nada de esto envía mensajes reales por LinkedIn/Gmail/redes, ni se
conecta de verdad a Meta Cloud API**:

- **Configuración** (⚙️ del header): modo de conexión de WhatsApp (Web vs. Meta Cloud API),
  motor de IA (solo etiqueta visual), comportamiento, visibilidad de módulos y pestañas de
  Ficha 360°, y **Cuentas y canales** (WhatsApp, LinkedIn, Gmail, Facebook, Instagram, TikTok,
  Mercado Libre) con alta/baja de cuentas y límites diarios.
- **Campañas y fuentes de contactos**: 7 fuentes (LinkedIn búsqueda/red/Sales Navigator, Google
  Contacts, grupos de WhatsApp, importar CSV, contactos de TACTICA) con resultados de ejemplo, y
  un armador de campaña multicanal por pasos (canal, demora, fijo/IA, reglas de fallback).
- **Plantillas**: fijas o generadas con IA, con variables ({nombre}, {empresa}, etc.) y envío
  segmentado por etiqueta/filtro/grupo.
- **Programados y secuencias**: vista combinada con alcance "este contacto" / "todos", activar y
  pausar. El editor de una secuencia puntual (`m-seq` del mockup) todavía no está construido.
- **Leads entrantes de redes**: reglas de asignación/etiqueta/respuesta IA por canal (Facebook,
  Instagram, TikTok, Mercado Libre).
- **Herramientas**: marcador, ir a ficha, reasignar, comprobante, guardar historial, programar
  mensaje/actividad, secuencias, etiquetar grupo, campañas, leads entrantes — con reordenamiento
  por arrastre (sin persistencia de orden).
- Ficha 360° (historial/pendientes/presupuestos/facturación/compras/cta. cte.) y "Seleccionar
  mensajes": interfaz sin datos reales, igual que antes.

## 2. Archivos relevantes

```
src/
├── content/index.tsx          # inyecta el panel (Shadow DOM) sobre WhatsApp Web
├── background/index.ts        # puente HTTP hacia el backend
├── popup/                     # popup de la barra de Chrome (estado de conexión)
├── state/
│   ├── AppStateContext.tsx    # estado compartido del prototipo (cuentas, campañas, etc.)
│   ├── ModalContext.tsx       # qué modal está abierto
│   ├── initialData.ts         # datos semilla del prototipo
│   └── persistence.ts         # guardado en chrome.storage.local
├── config/
│   ├── channels.ts            # registro único de canales (WA/LI/GM/FB/IG/TT/ML)
│   └── modals.ts               # IDs de todos los modales
├── components/
│   ├── Sidebar.tsx
│   ├── ui/                    # Modal, Tabs, Toggle, Field, TagInput, ComingSoonField...
│   └── sidebar/
│       ├── ChatbotModule.tsx, BotFlowModal.tsx      # REAL
│       ├── AiModule.tsx                              # REAL
│       ├── knowledge/                                # REAL (Base de conocimiento)
│       ├── config/, campaigns/, templates/,
│       │   scheduled/, leads/, quick/, connections/  # prototipo visual
│       ├── ModalHost.tsx      # switch único: nunca hay más de un modal montado
│       ├── ContactCard.tsx, Header.tsx, Ficha360.tsx, ToolsGrid.tsx, SelectMessagesCard.tsx
├── hooks/
│   ├── useActiveChat.ts, useAutoReply.ts, useContactNotes.ts
│   ├── useKnowledgeBases.ts   # REAL
│   └── useSimulatedAction.ts, useReorder.ts   # prototipo
├── services/
│   ├── api.service.ts         # llamadas al backend (bot, IA, base de conocimiento)
│   ├── dom.service.ts         # lectura/escritura del DOM de WhatsApp Web
│   ├── storage.service.ts
│   └── simulation.service.ts  # delay simulado para el prototipo
├── config/constants.ts        # selectores del DOM de WhatsApp (WA_SELECTORS)
└── types/                     # tipos de datos
```

## 3. Cómo está armado

- **Manifest V3**. El content script se carga vía `content-loader.js` (un `import()` dinámico) —
  un content script no puede declararse como módulo ES en Manifest V3.
- El panel se monta dentro de un **Shadow DOM** para aislar sus estilos de los de WhatsApp Web.
  Por eso los modales no usan `createPortal` a `document.body`: se renderizan dentro del mismo
  árbol de React, con `position: fixed` y z-index máximo.
- Toda comunicación con el backend pasa por el **service worker** (`background/index.ts`) vía
  `chrome.runtime.sendMessage`, salvo la subida de archivos a la Base de Conocimiento
  (`multipart/form-data`, que no se puede mandar por ese canal): esa hace `fetch()` directo a
  `http://localhost:5000` desde el propio panel.
- El estado del prototipo (cuentas, plantillas, campañas, leads, programados, etiquetas) vive en
  un único `AppStateProvider` y se persiste con debounce en `chrome.storage.local`.

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
- **Sin memoria de conversación**: cada mensaje entrante se evalúa de forma aislada.
- **Sin distinción de contactos**: las reglas de auto-respuesta aplican por igual a cualquier chat
  abierto.

## 6. Cómo probarlo

1. Backend corriendo en `localhost:5000` (necesario para Chatbot, IA y Base de Conocimiento; el
   resto del panel funciona sin backend, es prototipo local).
2. `npm run build` en este proyecto → genera `dist/`.
3. Cargar `dist/` como extensión descomprimida en `chrome://extensions`.
4. Abrir `web.whatsapp.com` (refrescar la pestaña si ya estaba abierta).
5. El engranaje del header abre Configuración; la lupa de Herramientas abre cada módulo nuevo.
