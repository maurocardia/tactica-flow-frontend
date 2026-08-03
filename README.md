# 🎨 Tactica Flow - Frontend (React + Vite + TypeScript + Shadcn UI)

Interfaz web moderna de **Tactica Flow** estilo BlueTicks para la gestión de conversaciones de WhatsApp, agentes de Inteligencia Artificial y vinculación en tiempo real con **Táctica ERP**.

---

## 🛠️ Requisitos Previos

- **Node.js**: v18.0.0 o superior.

---

## 🚀 Instalación y Ejecución Local

1. Navegar a la carpeta del frontend:
   ```bash
   cd frontend
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Iniciar servidor de desarrollo (Vite):
   ```bash
   npm run dev
   ```
   La aplicación estará disponible en `http://localhost:5173`.

---

## 🎨 Principios de Diseño e Interfaz

- 🚨 **REGLA ESTRICTA DE UI**: **Unicamente utilizar Shadcn UI + TailwindCSS + Lucide React**. No instalar otras librerías de componentes (no MUI, Chakra, Antd, Mantine, etc.).
- **Cumplimiento de Reglas Globales de Táctica**:
  - **TablePagination**: Componente global ubicado sobre los contenedores de datos.
  - **Estilos de Botones**: Botones primarios negros en modo claro y blancos en modo oscuro (`bg-black dark:bg-white`).
  - **Responsivo**: Tablas clásicas en escritorio y tarjetas responsivas adaptadas en móviles.
  - **Estética Ultra Moderna**: Estilo Glassmorphism (`backdrop-blur-md`, bordes luminosos y sombras sutiles).
