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

---

## 🧰 Comandos útiles

Todos parados en la carpeta `tactica-flow-frontend`. Ejemplos en PowerShell (Windows) — si usás bash/WSL, cambiá `Remove-Item -Recurse -Force X -ErrorAction SilentlyContinue` por `rm -rf X`.

**Importante**: el backend (`tactica-flow-backend`) tiene que estar corriendo en paralelo en el puerto 5000 — el proxy de Vite (`/api`) y el socket apuntan ahí.

### Desarrollo diario

```powershell
npm run dev                # Vite dev server, http://localhost:5173, recarga en caliente
npm run build               # tsc + vite build → carpeta dist/ (para producción)
npm run preview             # sirve la carpeta dist/ ya compilada, para probar el build final
npx tsc --noEmit             # solo chequea tipos, sin generar archivos
```

### Limpiar caché / reinstalar

```powershell
npm cache clean --force                                                  # caché global de npm
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue  # caché de Vite (lo más común cuando "no se ve" un cambio)
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue            # build compilado
Remove-Item -Recurse -Force node_modules, package-lock.json -ErrorAction SilentlyContinue
npm install                                                                # reinstalación completa
```

### Puerto ocupado (si `npm run dev` falla con "address already in use")

```powershell
netstat -ano | findstr :5173      # te da el PID que está usando el puerto 5173
taskkill /PID <ese_numero> /F     # lo mata
```

### Git básico

```powershell
git status
git add .
git commit -m "mensaje"
git push
git pull
git checkout -b nombre-feature    # nueva rama para no romper main directamente
git log --oneline -10
```

### Para más adelante (todavía no configurado, pero probablemente lo necesitemos)

```powershell
npm install eslint --save-dev                        # linter, no está configurado todavía
npm install --save-dev vitest @testing-library/react # tests de componentes, no hay todavía
npm run build && npm run preview                      # forma rápida de detectar errores que solo aparecen en el build de producción
```
