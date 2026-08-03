# 📘 Tactica Flow - Especificación Técnica y Arquitectura (Frontend)

Interfaz Web de **Tactica Flow** estilo BlueTicks para la gestión de conversaciones de WhatsApp, automatización con bots de IA y vinculación directa con **Táctica ERP**.

---

## 1. Visión y Objetivos del Proyecto

**Tactica Flow Frontend** provee una interfaz multiescritorio / multiagente donde los asesores de venta y soporte pueden:
1. **Atender WhatsApp en Tiempo Real**: Bandeja centralizada de entrada con WebSocket (Socket.io-client).
2. **Vincular Datos con Táctica ERP**: Crear o vincular empresas, contactos, pedidos y tickets de soporte sin salir del chat.
3. **Supervisar Bots e IA**: Ver las respuestas generadas por los agentes inteligentes de OpenAI.

---

## 2. Stack Tecnológico

- **Framework**: React 18 (Vite).
- **Estilos**: TailwindCSS.
- **Iconos**: Lucide Icons (`lucide-react`).
- **Peticiones HTTP**: Axios con interceptores.
- **Tiempo Real**: Socket.io-client.
- **Navegación**: React Router DOM.

---

## 3. Reglas Obligatorias de Interfaz y UI (Táctica Standard)

### 3.1 Regla de Paginación
- **Escritorio**: Paginación clásica reemplazando registros cargados.
- **Móvil**: Desplazamiento infinito (Infinite Scroll) acumulando registros.
- **Componente**: Componente global [`TablePagination`](file:///d:/tactica-flow/frontend/src/components/ui/TablePagination.jsx) renderizado **arriba** del contenedor de resultados.

### 3.2 Regla de Colores de Botones
- **Botones Principales y Acciones Estándar**:
  - Modo Claro: Fondo Negro (`bg-black text-white hover:bg-black/90`).
  - Modo Oscuro: Fondo Blanco (`dark:bg-white dark:text-black dark:hover:bg-white/90`).
  - EVITAR color rojo para botones principales.

---

## 4. Vistas y Módulos Frontend

- **`App.jsx`**: Layout principal con Sidebar, selector de vistas y bandeja de chats.
- **Bandeja de Chats**: Vista dividida con lista de conversaciones a la izquierda, área de mensajes al centro y panel de Táctica ERP a la derecha.
- **Bots & Agentes IA**: Listado y panel de configuración de automatizaciones y bots.
- **Reportes & Analítica**: Métricas de rendimiento, tiempos de respuesta y ventas generadas.
