# Qué necesita el backend para que el frontend funcione de verdad

Lista de lo que falta del lado del backend para que cada módulo del panel (hoy prototipo visual,
ver `FUNCIONALIDADES.md`) deje de ser una maqueta y pase a funcionar. Documentado acá (frontend) y
no en el repo del backend, a pedido explícito — el backend no se toca sin autorización directa.

Convención: cada ítem dice qué existe hoy, qué falta, y de qué depende.

## 1. Ya real, sin pendientes bloqueantes

- **Motor de reglas + fallback a IA** (`/api/bot/rules`, `/api/bot/reply`): funciona.
- **Base de Conocimiento** (`/api/knowledge-bases`): CRUD y subida de documentos funcionan.
- **Resumen de charla / IA** (`/api/ai/chat`): funciona.
- Único pendiente de este grupo: **el prompt de la IA vuelca el documento completo de la Base de
  Conocimiento en vez de responder puntual** — instrucción de formato en `SYSTEM_PROMPT`
  (`ai.service.ts`). Ver sección 10 de `FUNCIONALIDADES.md`.

## 1.b Login + WhatsApp real (Baileys) — ya conectado de punta a punta (23/08)

Backend (mergeado a `main`) + frontend, completo:

- **Auth con Google**: `POST /api/auth/google` (body `{ idToken }` → `{ token, user }`) y
  `GET /api/auth/me`. Del lado del frontend: `services/googleAuth.service.ts` pide el `id_token`
  con `chrome.identity.launchWebAuthFlow` (flujo implícito, sin client secret), y
  `state/AuthContext.tsx` guarda la sesión en `chrome.storage.local` — botón real en
  Configuración → "Cuenta".
- **WhatsApp real vía Baileys, por usuario**: `POST /api/whatsapp/connect`, `/disconnect`,
  `GET /status`, `GET /qr` (las 4 requieren el JWT de arriba, que ahora sí viaja: el puente
  `background/index.ts` agrega `Authorization: Bearer <token>` en cada pedido). UI real en
  Configuración → "WhatsApp (conexión real)": conectar/desconectar, ver el QR, y el estado se
  actualiza solo (polling cada 3s).
- **Esto es una sesión de WhatsApp *distinta* a la que usa el resto del panel**: sigue siendo un
  "dispositivo vinculado" aparte que corre en el backend, separado del DOM de `web.whatsapp.com`
  que usa el resto del panel (Ficha 360°, herramientas, etc.). **Coordinación resuelta del lado
  del auto-responder**: `useAutoReply.ts` ya no dispara el watcher automático por DOM
  (`DOMService.startIncomingMessageWatcher`) — Baileys es ahora el único motor que responde solo
  ante un mensaje entrante real; el DOM solo se sigue usando para la prueba manual ("Probar") y
  para insertar/enviar mensajes que el usuario arma a mano (Redactar con IA, plantillas, etc.).
  Sigue pendiente unificar el resto (Ficha 360°, etiquetas, historial) para que no dependan de
  tener la pestaña de WhatsApp Web abierta.
- **Pendiente**: el backend emite `whatsapp_status_updated` por Socket.io además del polling — el
  frontend hoy solo usa polling (más simple, no agrega `socket.io-client` como dependencia nueva).
  Se podría cambiar a sockets más adelante si el polling cada 3s resulta insuficiente.

## 2. Fundacional (lo que sigue bloqueando, después de lo de arriba)

- **Tabla de estado por conversación** (para que el chatbot recuerde en qué paso de un flujo está
  cada contacto — hoy cada mensaje se evalúa aislado): bloquea el editor de flujo por bloques. Ya
  detallado con propuesta de esquema en `../tactica-flow-backend/CHATBOT_FLOWS.md`.
- Con Baileys ya en el backend, **Programados y secuencias, Disparo por inactividad, el paso
  "Espera", y las campañas multicanal en el tramo de WhatsApp** dejaron de estar bloqueados por
  "no se puede mandar sin el chat abierto" — ahora dependen de: (a) que el frontend tenga login +
  conexión de Baileys andando (ver 1.b), y (b) un scheduler/cola en el backend que dispare esas
  acciones a la hora indicada (todavía no existe).
- **Modelo de equipo/roles más allá de un usuario individual** (Issue #6 solo cubrió login, no
  roles ni equipos): sigue bloqueando Reasignar conversación, Derivación (handoff) del chatbot, y
  asignación de leads entrantes a un compañero específico.

## 3. Por módulo del panel

| Módulo (prototipo hoy) | Qué falta en el backend |
|---|---|
| **WhatsApp — modo Cloud API** (Configuración) | Integración real con Meta Graph API: enviar mensajes, endpoint receptor de webhook, manejo de tokens. Hoy no hay nada conectado — el botón "Probar conexión" simula éxito siempre. |
| **Cuentas y canales** (LinkedIn, Gmail, Facebook, Instagram, TikTok, Mercado Libre) | OAuth real por plataforma (client ID/secret, redirect URI, guardado y refresco de tokens) + API de envío de mensajes de cada una. Ninguna existe hoy. |
| **Campañas multicanal** | Motor que ejecute los pasos de una campaña de verdad (uno por uno, con demoras, fallback), y capacidad real de enviar por cada canal (depende de la fila de arriba). Hoy es un armador visual sin ejecución. |
| **Fuentes de contactos / Leads** (LinkedIn búsqueda/red/Sales Navigator, Google Contacts, CSV, TACTICA) | Scraping o API de LinkedIn (alto riesgo de ToS), API de Google People (OAuth), y un endpoint real de "listar contactos/empresas de TACTICA" (se podría extender `TacticaApiService`, que ya integra con el ERP para otras cosas). CSV ya se puede parsear 100% en el frontend, no depende del backend. |
| **Plantillas** | Tabla + CRUD real (`message_templates`), y para el envío segmentado, un modelo real de contactos/etiquetas/grupos para saber a quién mandarle. Si el envío masivo es por WhatsApp Cloud API, además exige plantillas pre-aprobadas por Meta. |
| **Programados y secuencias** | Tabla de mensajes/secuencias programados + un scheduler (cron o cola) que los dispare a la hora indicada — y de ahí depende de la sección 2 (enviar sin chat abierto). |
| **Leads entrantes de redes** | Webhooks receptores de Meta (Messenger/Instagram), TikTok y Mercado Libre (API de Preguntas), + motor de asignación/enrutamiento (depende de auth/equipo, sección 2). |
| **Etiquetar grupo** | Modelo de contactos + etiquetas en base de datos (hoy las etiquetas viven solo en el estado del frontend). |
| **Editor de flujo por bloques del chatbot** | Ver `../tactica-flow-backend/CHATBOT_FLOWS.md` completo — tabla de flujos, estado por conversación, motor de ejecución por bloque. |
| **Ficha 360°** (historial, pendientes, presupuestos, facturación, compras, cta. cte.) | Endpoints reales contra Táctica ERP para cada pestaña — probablemente extendiendo `TacticaApiService`, que ya sabe hablarle al ERP para otras cosas (stock, contactos, tickets). |
| **Herramientas: Reasignar** | Depende del modelo de usuarios/equipo (sección 2). |
| **Herramientas: Generar documento** (presupuesto/pedido/factura/etc.) | Endpoints de Táctica ERP para crear cada tipo de documento — revisar cuáles ya expone `TacticaApiService` y cuáles faltan. |
| **Herramientas: Marcador, Guardar historial, Programar actividad, Comprobante** | Bajo impacto individual, pero "Guardar historial" y "Programar actividad" necesitan persistir contra algo (¿Táctica ERP? ¿tabla propia?) — a definir qué sistema es la fuente de verdad. |

## 4. Orden sugerido si se encara esto en serio

1. Prompt de la IA (rápido, alto impacto, ya diagnosticado).
2. ~~Frontend: login + UI de Baileys~~ — hecho (ver 1.b).
3. ~~Decidir la coordinación entre el motor por DOM y Baileys~~ — hecho: se deshabilitó el
   auto-responder automático por DOM, Baileys es el único que responde solo (ver 1.b).
4. Scheduler/cola en el backend para Programados y secuencias (ya no bloqueado por "no se puede
   mandar sin el chat abierto" — Baileys resuelve esa parte).
5. Modelo de equipo/roles (más allá del login individual) — desbloquea Reasignar, Derivación,
   leads.
6. Ficha 360° contra Táctica ERP (probablemente lo más barato de todo lo demás, reusa
   `TacticaApiService`).
7. Recién ahí: plantillas + editor de flujo por bloques (dependen de 4 y 5), y por último las
   integraciones multicanal (LinkedIn/Gmail/redes), que son el trabajo más grande y menos urgente
   si el negocio principal sigue siendo WhatsApp.
