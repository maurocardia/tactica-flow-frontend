# Chatbot — Frontend (Tactica Flow)

Documentación de lo construido en el frontend para conectar el inbox y el panel de bots al backend real (antes todo era data mockeada/hardcodeada).

## 1. Qué hace hoy

- El inbox (pestaña **"Bandeja de Chats"**) muestra conversaciones y mensajes reales traídos del backend, con actualización en vivo por Socket.io.
- Se puede **simular un mensaje entrante del cliente** desde la misma caja de texto del chat (toggle "Enviando como agente" / "Simulando mensaje del cliente"), para probar el bot sin tener WhatsApp conectado.
- La pestaña **"Bots & Agentes IA"** tiene un panel funcional: CRUD de reglas por palabra clave + una caja para probar mensajes contra el bot y ver la respuesta.

## 2. Archivos relevantes

```
src/
├── App.tsx                       # layout general, inbox conectado a la API + sockets
└── components/
    └── BotsPanel.tsx             # CRUD de reglas + probador del bot
```

## 3. Inbox conectado (dentro de `App.tsx`)

- Al montar, hace `GET /api/conversations` y llena la lista de chats (antes era un array hardcodeado).
- Al cambiar de conversación seleccionada, hace `GET /api/conversations/:id/messages`.
- Se conecta a Socket.io (`http://localhost:5000`) una sola vez; escucha:
  - `new_message` → agrega el mensaje a la conversación abierta si corresponde.
  - `conversation_updated` → actualiza `lastMsg`/hora/no-leídos en la lista, sin recargar.
- Al seleccionar una conversación, emite `join_chat` para unirse a esa room.
- El campo de tiempo (`"12:34 PM"`, `"Ayer"`, `"06/08"`) se calcula en el cliente a partir del timestamp ISO que manda el backend.

### Toggle "agente / cliente" (simular WhatsApp)

Arriba de la caja de texto del chat hay un botón que alterna entre:

- **"Enviando como agente"** (default): el mensaje se guarda como si lo escribiera un agente humano. El bot **no** responde a esto.
- **"Simulando mensaje del cliente"**: el mensaje se manda con `sender: 'customer'`. Si la conversación está en modo `bot` (hoy, la de **Juan Pérez**), el motor del bot responde automáticamente y el mensaje aparece en el chat. Si la conversación no está en modo bot, se muestra un aviso de que no habrá respuesta automática.

Esto existe porque, sin WhatsApp conectado todavía, no hay otra forma de generar un mensaje "entrante" real para probar el bot desde la UI del chat (antes solo se podía probar desde el panel de Bots, no en el contexto de una conversación real).

## 4. Panel de Bots (`BotsPanel.tsx`)

Reemplaza la tabla vacía que había en la pestaña "Bots & Agentes IA". Dos secciones:

**Reglas por palabra clave**
- Lista todas las reglas (`GET /api/bot/rules`) como tarjetas: nombre, palabras clave (chips), preview de la respuesta, tipo de acción, estado activa/inactiva.
- Botón "+ Nueva regla" abre un formulario (nombre, palabras clave separadas por coma, texto de respuesta, tipo de acción, activa) que hace `POST /api/bot/rules`.
- "Editar" pre-llena el mismo formulario y hace `PUT /api/bot/rules/:id`.
- "Eliminar" pide confirmación y hace `DELETE /api/bot/rules/:id`.
- El toggle activa/inactiva hace un `PUT` optimista (revierte si falla).

**Probar el bot**
- Caja de texto + botón "Probar" → `POST /api/bot/reply`. Muestra la respuesta y de dónde vino (regla o IA), con historial de las últimas pruebas en esa sesión (no se guarda en ningún lado).

## 5. Cómo correrlo

```bash
npm install
npm run dev   # Vite, puerto 5173
```

`vite.config.ts` ya tiene el proxy `/api → http://localhost:5000`, así que el backend tiene que estar corriendo en paralelo (`npm run dev` en `tactica-flow-backend`). El socket se conecta directo a `http://localhost:5000` (no pasa por el proxy de Vite).

## 6. Limitaciones conocidas / próximos pasos

- Todo asume backend en `localhost:5000` — no hay variable de entorno para apuntar a otro host todavía (hardcodeado en `App.tsx` para el socket, y relativo `/api` para el resto).
- No hay login ni pantalla de "Vincular con Táctica ERP" funcional (el botón existe pero no hace nada todavía).
- La pestaña "Reportes" sigue siendo una maqueta sin datos reales.
- El toggle "simular cliente" es una herramienta de prueba — cuando se conecte WhatsApp real, los mensajes de cliente van a llegar solos y este toggle deja de ser necesario para ese flujo (pero puede quedar útil para debugging).
