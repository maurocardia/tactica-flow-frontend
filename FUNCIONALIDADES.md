# Funcionalidades del frontend — estado actual

## Qué es

Extensión de Chrome que inyecta un panel lateral sobre WhatsApp Web para atención al cliente y
gestión comercial multicanal, integrada con el backend de Tactica Flow donde corresponde. No usa
la API oficial de WhatsApp Business — lee y escribe directamente sobre el DOM de
`web.whatsapp.com`.

El panel creció a partir de un mockup del cliente mucho más amplio que el chatbot original
(cuentas multicanal, campañas, leads, plantillas, programados). Para evitar mostrar funciones que
no existen, cada módulo cae en una de dos categorías, sin mezclarse: **real** (sección 1) o
**prototipo visual** (sección 2). Si tenés dudas sobre si algo "funciona de verdad", empezá por ahí.

## 1. Real (conectado a un backend de verdad)

- **Motor de auto-respuesta**: detecta mensajes entrantes del chat abierto, los compara contra
  reglas de palabra clave del backend, inserta una respuesta y la envía sola tras una demora
  cancelable de 3 segundos. Detalle completo en la sección 5.
- **Fallback a IA**: si ninguna regla de palabra clave matchea y el toggle "Responder con IA si
  ninguna regla matchea" está prendido, le pide la respuesta al mismo motor real que usa "Probar"
  (`/api/bot/reply`, que internamente cae al agente de IA con la Base de Conocimiento activa) y la
  manda con la misma cuenta regresiva cancelable.
- **Editor de reglas del bot** ("Editar flujo"): crear, editar, activar/desactivar y borrar reglas
  de palabra clave → respuesta, vía `/api/bot/rules`.
- **Resumen de charla con IA**: popup dedicado que lee los mensajes realmente visibles del chat
  abierto y le pide a la IA (`/api/ai/chat`) un resumen estructurado (Resumen / Puntos clave /
  Próximo paso sugerido). Detalle en la sección 6.
- **Base de conocimiento**: crear/editar/borrar bases y subir/borrar documentos (PDF, Word, TXT,
  MD) vía `/api/knowledge-bases`, ya usado por el motor de IA del bot. El toggle se llama
  "Base activa para el bot" (no "asignar a este chat"): el backend hoy es global, no por
  conversación, así que el texto no promete algo que el motor no hace.
- **Lectura del contacto activo**: nombre del chat abierto, actualizado en vivo.
- **Abrir/cerrar el panel lateral**: real, 100% local, sin backend — ver sección 7.
- **Login con Google** (Configuración → "Cuenta"): `chrome.identity.launchWebAuthFlow` pide el
  token, el backend lo verifica (`/api/auth/google`) y devuelve un JWT que se guarda en
  `chrome.storage.local`.
- **Conexión real de WhatsApp vía Baileys** (Configuración → "WhatsApp (conexión real)", requiere
  login): conectar/desconectar, ver el código QR para vincular, estado en vivo. Es una sesión de
  WhatsApp *separada* del DOM que usa el resto del panel, pero ya coordinada para el auto-reply:
  el switch "Habilitar bot" apaga/prende la sesión de Baileys de verdad, y el auto-responder
  automático por DOM quedó deshabilitado a propósito para no duplicar respuestas — Baileys es el
  único que contesta solo ante un mensaje entrante (ver `BACKEND_REQUERIDO.md` sección 1.b).

Lo único que **no** está incluido acá pero suena parecido: "Transcribir audios" (botón del módulo
de IA) sigue siendo un botón de prototipo — no lee audios reales todavía.

## 2. Prototipo visual (sin integración externa real)

Todo lo demás del mockup nuevo se construyó con la misma fidelidad que el mockup del cliente:
estado en memoria (persistido en `chrome.storage.local` para no perderlo al recargar WhatsApp
Web), sin llamadas a APIs externas, y con "conexiones" simuladas que siempre resuelven con éxito
tras un pequeño delay. No hay ninguna marca visual de "demo" en la mayoría (a pedido explícito,
para que se vea igual al mockup aprobado), **salvo un cartel amarillo "Próximamente" al principio
de cada uno de estos módulos** para que quede claro que no hacen nada real todavía:

- **Configuración** (⚙️ del header): modo de conexión de WhatsApp (Web vs. Meta Cloud API — con
  cartel de próximamente en el modo API), motor de IA (solo etiqueta visual), comportamiento,
  visibilidad de módulos y pestañas de Ficha 360° (esto sí es real: oculta/muestra módulos de
  verdad), y **Cuentas y canales** (WhatsApp, LinkedIn, Gmail, Facebook, Instagram, TikTok, Mercado
  Libre) con alta/baja de cuentas y límites diarios — con cartel de próximamente.
- **Campañas y fuentes de contactos**: 7 fuentes (LinkedIn búsqueda/red/Sales Navigator, Google
  Contacts, grupos de WhatsApp, importar CSV, contactos de TACTICA) con resultados de ejemplo, y
  un armador de campaña multicanal por pasos (canal, demora, fijo/IA, reglas de fallback).
- **Plantillas**: fijas o generadas con IA, con variables ({nombre}, {empresa}, etc.) y envío
  segmentado por etiqueta/filtro/grupo.
- **Programados y secuencias**: vista combinada con alcance "este contacto" / "todos", activar y
  pausar. Los conteos que ves en los íconos del header de WhatsApp (⏰ y 🔁, ver sección 7) están
  conectados a estos mismos datos — son reales *como conteo*, pero el envío programado en sí no
  dispara solo a la hora indicada. El editor de una secuencia puntual (`m-seq` del mockup) todavía
  no está construido.
- **Leads entrantes de redes**: reglas de asignación/etiqueta/respuesta IA por canal (Facebook,
  Instagram, TikTok, Mercado Libre).
- **Herramientas**: marcador, ir a ficha, reasignar, comprobante, guardar historial, programar
  mensaje/actividad, secuencias, etiquetar grupo, campañas, leads entrantes — con reordenamiento
  por arrastre (sin persistencia de orden).
- **Ficha 360°**: interfaz sin datos reales de Táctica ERP todavía.
- **"Seleccionar mensajes"**: deshabilitado con etiqueta "(próximamente)" — no hace nada, ni
  siquiera abre un modal.
- **Editor de flujo por bloques del chatbot**: se evaluó reconstruirlo igual al mockup (Disparo →
  Bienvenida → Calificación → Agente IA → Derivación) pero **se descartó** — reemplazaría al
  editor de reglas real sin que el motor de bot soporte de verdad una secuencia con estado por
  conversación. El detalle de qué se necesitaría en el backend para hacerlo real está en
  `../tactica-flow-backend/CHATBOT_FLOWS.md`.

## 3. Íconos de estado fuera del panel (en el header real de WhatsApp)

Los 4 íconos (📅 programados, ⏰ pendientes, 🤖 chatbot, 🔁 secuencias) **no están dentro del panel
de Tactica** — se inyectan directo en el header real de la conversación de WhatsApp Web, al lado
del nombre del contacto, para que se vean como parte nativa de WhatsApp (estilo Blueticks) en vez
de vivir en la franja de 360px del costado.

- 📅 y ⏰ abren "Programados y secuencias" (⏰ además muestra en el badge la cantidad real de
  mensajes programados activos para el contacto abierto).
- 🤖 muestra un punto verde si el chatbot está activo, y clickeándolo lo prende/apaga — mismo
  estado real que el switch de la tarjeta del Chatbot (movido a estado global para que ambos
  lugares queden sincronizados).
- 🔁 abre la pestaña de secuencias del mismo modal, con badge = secuencias activas reales del
  contacto abierto.

**Por qué es un caso aparte técnicamente**: estos botones viven en un árbol de DOM completamente
distinto al del panel (el de WhatsApp Web, no el Shadow DOM de Tactica), así que no pueden usar
React ni Tailwind directo, y no pueden llamar `openModal()` ni leer el estado compartido
directamente. Se comunican por `CustomEvent` en `window` — ver `content/waHeaderStatus.ts` (arma
los botones e inyecta) y `components/ExternalBridge.tsx` (adentro del panel, escucha esos eventos
para abrir modales/alternar el bot, y emite los conteos reales cada vez que cambian).

**Limitación**: la posición de inyección (`header.appendChild`, al final de la fila) no se pudo
verificar visualmente contra WhatsApp Web real desde este entorno — puede quedar apretada o pisar
íconos propios de WhatsApp si su layout cambia.

## 4. Archivos relevantes

```
src/
├── content/
│   ├── index.tsx               # inyecta el panel (Shadow DOM), botón flotante abrir/cerrar
│   └── waHeaderStatus.ts       # íconos de estado en el header REAL de WhatsApp (fuera del panel)
├── background/index.ts         # puente HTTP hacia el backend
├── popup/                      # popup de la barra de Chrome (estado de conexión)
├── state/
│   ├── AppStateContext.tsx     # estado compartido (cuentas, campañas, botEnabled, etc.)
│   ├── ModalContext.tsx        # qué modal está abierto + payload
│   ├── initialData.ts          # datos semilla del prototipo
│   └── persistence.ts          # guardado en chrome.storage.local
├── config/
│   ├── channels.ts             # registro único de canales (WA/LI/GM/FB/IG/TT/ML)
│   ├── modals.ts                # IDs de todos los modales
│   └── constants.ts            # selectores del DOM de WhatsApp (WA_SELECTORS)
├── components/
│   ├── Sidebar.tsx
│   ├── ExternalBridge.tsx      # puente de eventos con waHeaderStatus.ts (no renderiza nada)
│   ├── ui/                     # Modal, Tabs, Toggle, Field, TagInput, PrototypeNotice...
│   └── sidebar/
│       ├── ChatbotModule.tsx, BotFlowModal.tsx       # REAL
│       ├── AiModule.tsx, ai/AiSummaryModal.tsx        # REAL
│       ├── knowledge/                                 # REAL (Base de conocimiento)
│       ├── config/, campaigns/, templates/,
│       │   scheduled/, leads/, quick/, connections/   # prototipo visual
│       ├── ModalHost.tsx       # switch único: nunca hay más de un modal montado
│       ├── ContactCard.tsx, Header.tsx, Ficha360.tsx, ToolsGrid.tsx, SelectMessagesCard.tsx
├── hooks/
│   ├── useActiveChat.ts, useAutoReply.ts, useContactNotes.ts   # REAL
│   ├── useKnowledgeBases.ts    # REAL
│   └── useSimulatedAction.ts, useReorder.ts                    # prototipo
├── services/
│   ├── api.service.ts          # llamadas al backend (bot, IA, base de conocimiento)
│   ├── dom.service.ts          # lectura/escritura del DOM real de WhatsApp Web
│   ├── storage.service.ts
│   └── simulation.service.ts   # delay simulado para el prototipo
└── types/                      # tipos de datos
```

## 5. Cómo está armado

- **Manifest V3**. El content script se carga vía `content-loader.js` (un `import()` dinámico) —
  un content script no puede declararse como módulo ES en Manifest V3.
- El panel se monta dentro de un **Shadow DOM** para aislar sus estilos de los de WhatsApp Web.
  Por eso los modales no usan `createPortal` a `document.body`: se renderizan dentro del mismo
  árbol de React, con `position: fixed` y z-index máximo.
- **Ojo con `transform`/`filter`/`will-change` en el contenedor del panel** (`#tactica-flow-host`):
  cualquiera de esas propiedades en un ancestro convierte a ESE ancestro en el "containing block"
  de los descendientes `position: fixed` (los modales) — quedan encerrados en la franja de 360px
  en vez de cubrir toda la pantalla. Ya nos pasó una vez al animar el abrir/cerrar del panel con
  `transform`; el fix fue animar `right` en su lugar (ver sección 7).
- **Animar `width` es caro**: el redimensionado de WhatsApp Web al abrir/cerrar el panel cambia
  `width` sin transición CSS a propósito — animarlo dispara reflow en cada frame sobre todo el
  árbol de WhatsApp (lista de mensajes virtualizada incluida) y se siente lento/con tirones.
- Toda comunicación con el backend pasa por el **service worker** (`background/index.ts`) vía
  `chrome.runtime.sendMessage`, salvo la subida de archivos a la Base de Conocimiento
  (`multipart/form-data`, que no se puede mandar por ese canal): esa hace `fetch()` directo a
  `http://localhost:5000` desde el propio panel.
- El estado del prototipo (cuentas, plantillas, campañas, leads, programados, etiquetas,
  `botEnabled`) vive en un único `AppStateProvider` y se persiste con debounce en
  `chrome.storage.local`.
- Los íconos del header de WhatsApp (fuera del Shadow DOM) se comunican con el panel por
  `CustomEvent` en `window` — es el único canal posible entre dos árboles de DOM separados.

## 6. Motor de auto-respuesta y resumen con IA

**Auto-respuesta** (`useAutoReply` + `DOMService`):

1. Carga las reglas activas desde el backend, y las **refresca cada 8 segundos** mientras el bot
   está prendido (si no, editar/desactivar una regla desde el editor no se notaba hasta apagar y
   prender el chatbot de nuevo).
2. Observa el chat abierto y detecta mensajes entrantes nuevos, con un **debounce de 400ms**: un
   mensaje entrante dispara varias mutaciones seguidas en el DOM (texto, tilde de estado, etc.), y
   sin esperar a que se asienten cada una podía disparar una respuesta por separado — esto causaba
   que el primer mensaje se respondiera doble. Ahora se evalúa una sola vez el estado final.
3. Si el texto contiene la palabra clave de alguna regla activa, inserta esa respuesta.
4. Si ninguna matchea y el fallback de IA está prendido, le pide la respuesta al agente real.
5. Muestra una cuenta regresiva de 3 segundos (cancelable) antes de enviar.
6. Envía el mensaje automáticamente si no se cancela.

**Resumen de charla** (`AiSummaryModal` + `DOMService.getVisibleMessages`):

1. Al abrir el popup, lee los mensajes con texto ya renderizados en el chat abierto (entrantes y
   salientes, en orden).
2. Arma una transcripción y se la manda a `/api/ai/chat` pidiendo un resumen en 3 partes (Resumen,
   Puntos clave, Próximo paso sugerido).
3. Muestra el resultado en el popup. "Guardar en historial" está deshabilitado (próximamente) —
   no hay ningún endpoint real para eso todavía.

## 7. Abrir/cerrar el panel lateral

- Botón en el header del panel (ícono de "cerrar panel"): desliza el panel fuera de pantalla
  (`right: -360px`) y le devuelve el ancho completo a WhatsApp Web.
- Botón flotante circular "T" (abajo a la derecha, fuera del Shadow DOM) para volver a abrirlo.
- El Header (adentro del Shadow DOM) no puede tocar el botón flotante ni el contenedor del panel
  directamente porque viven en otro árbol de DOM — se coordinan con un `CustomEvent`
  (`tactica-flow:toggle-panel`) en `window`, escuchado desde `content/index.tsx`.

## 8. Limitaciones (a nivel DOM)

- **Solo el chat abierto**: la extensión únicamente puede leer y actuar sobre la conversación
  visible en pantalla; no tiene acceso a otros chats sin abrirlos.
- **Depende de atributos del DOM de WhatsApp Web** (`data-icon`, `data-testid`, `data-id`) que no
  son parte de una API pública — un cambio de interfaz en WhatsApp Web puede romper la detección
  de mensajes, el envío, o la inyección de los íconos del header sin previo aviso.
- **Sin memoria de conversación**: cada mensaje entrante se evalúa de forma aislada; no hay
  contexto de qué se dijo antes en la misma charla (ni para reglas ni para el fallback de IA).
- **Sin distinción de contactos en las reglas**: las reglas de auto-respuesta aplican por igual a
  cualquier chat abierto (los conteos de programados/secuencias sí son por contacto).
- **Resumen de charla limitado a lo cargado en pantalla**: WhatsApp Web virtualiza la lista de
  mensajes — el resumen solo cubre lo que ya está renderizado (visible + lo cargado por scroll
  previo), no la charla completa si nunca se scrolleó hacia arriba.
- **Íconos del header de WhatsApp sin verificación visual en vivo** (ver sección 3).

## 9. Cómo probarlo

1. Backend corriendo en `localhost:5000` (necesario para Chatbot, fallback de IA, Resumen y Base
   de Conocimiento; el resto del panel funciona sin backend, es prototipo local).
2. `npm run build` en este proyecto → genera `dist/`.
3. Cargar `dist/` como extensión descomprimida en `chrome://extensions`.
4. Abrir `web.whatsapp.com` (refrescar la pestaña si ya estaba abierta).
5. El engranaje del header abre Configuración; el ícono de cerrar panel lo oculta (botón flotante
   con el logo para reabrirlo); los íconos 📅⏰🤖🔁 aparecen en el header de la conversación de WhatsApp.

## 10. Pendiente antes de lanzar

- **La IA vuelca el documento completo de la Base de Conocimiento en vez de responder puntual**:
  al preguntar algo puntual (ej. "qué productos tienen") con un documento cargado en la Base de
  Conocimiento, a veces la respuesta es el catálogo/documento entero en vez de una respuesta
  acotada a lo preguntado. No es algo que se pueda arreglar desde el frontend — el frontend solo
  muestra/inserta el texto que ya generó la IA. El fix real es en el **backend**
  (`ai.service.ts`): agregarle al `SYSTEM_PROMPT` una instrucción explícita de que la Base de
  Conocimiento es solo referencia y que debe responder puntual, no volcar el documento completo
  salvo pedido explícito. Bloqueante para un lanzamiento real con catálogos/documentos largos.
