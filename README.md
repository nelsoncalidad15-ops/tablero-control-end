# Autosol Dashboard 🚘

![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?style=for-the-badge&logo=vite)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3.0-38B2AC?style=for-the-badge&logo=tailwind-css)
![Status](https://img.shields.io/badge/Status-Production-success?style=for-the-badge)

**Portal de Inteligencia de Negocios Corporativo** diseñado para la gestión operativa en tiempo real de Autosol. Esta aplicación centraliza métricas críticas de Postventa, Calidad, RRHH y Ventas, potenciada por **Google Gemini AI** para análisis predictivo y resumen de datos.

---

## 🌟 Características Clave

### 📊 Gestión Operativa
- **Conexión Live**: Sincronización directa con Google Sheets (CSV) sin backend complejo.
- **KPIs en Tiempo Real**: Visualización de PPT Diarios, Avance Mensual y Cumplimiento de Objetivos.
- **Multi-Sucursal**: Filtrado dinámico por sucursal (Jujuy, Salta, Express, etc.).

### 🧠 Inteligencia Artificial (Gemini)
- **Asistente Virtual**: Panel lateral con IA integrada.
- **Análisis Semántico**: Interpretación automática de tendencias de ventas y servicios.
- **Resúmenes Ejecutivos**: Generación de reportes de situación con un solo clic.

### 🛡️ Módulo de Calidad
- **Rastreo de Reclamos**: Seguimiento de ORs únicas y motivos de reclamo.
- **Heatmap de Problemas**: Identificación visual de los puntos de dolor más frecuentes.
- **Auditoría de Resolución**: Gráficos de casos resueltos vs. pendientes.

---

## 🚀 Despliegue (Deploy)

Este proyecto está configurado para desplegarse automáticamente en **GitHub Pages**.

### Prerrequisitos
- Node.js v18+
- NPM o Yarn

### Instalación Local
```bash
# 1. Clonar el repositorio
git clone https://github.com/nelsoncalidad15-ops/tablero-control-end.git

# 2. Instalar dependencias
npm install

# 3. Iniciar servidor de desarrollo
npm run dev
```

### Publicación en Web
El proyecto incluye scripts automatizados para el despliegue:

```bash
# Compila el proyecto y lo sube a la rama gh-pages
npm run deploy
```

El dashboard estará visible en: `https://nelsoncalidad15-ops.github.io/tablero-control-end/`

---

## 🛠️ Estructura del Proyecto

```bash
src/
├── components/       # Componentes de UI (Gráficos, Tarjetas, Modales)
├── services/         # Lógica de conexión (Google Sheets, Gemini AI)
├── types/            # Definiciones de TypeScript
├── constants.ts      # Configuraciones globales y Mock Data
└── App.tsx           # Enrutador principal
```

## 🔐 Configuración de Seguridad

Para habilitar las funciones de IA y conexión a datos privados:
1. Click en el icono de **Configuración** (⚙️).
2. Ingrese la contraseña de administrador.
3. Configure su `GEMINI_API_KEY` y las URLs de los CSV de Google Sheets.

---

Desarrollado para **Autosol** - *Excelencia en Movilidad*.
