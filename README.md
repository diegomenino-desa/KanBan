# 🚀 Premium Kanban Board System

A high-fidelity, multi-board Kanban ecosystem designed for elite teams who prioritize performance, visual clarity, and data-driven insights. 

![Kanban Board Preview](https://github.com/diegomenino/KanbanBoard/raw/main/src/assets/hero.png)

---

## 🌟 Key Features

### 🎨 Elite Aesthetics & UX
- **Vibrant Glassmorphism**: A stunning UI with deep translucency, subtle glows, and premium typography.
- **Dynamic Theme Engine**: Seamlessly switch between a high-contrast Dark Mode and an airy, professional Light Mode.
- **Micro-Animations**: Smooth drag-and-drop transitions (DnD Kit) and responsive interface elements.

### 📊 Advanced Workflow Management
- **Multi-Board Support**: Create and manage isolated workspaces for different teams or projects.
- **WIP Limits**: Set Work-In-Progress limits per column to identify bottlenecks instantly.
- **Definition of Done (DoD)**: Integrated policy documentation for each stage of your workflow.
- **Relative Due Dates**: Real-time countdowns on cards with automatic overdue highlighting in red.

### 📈 Smart Analytics Dashboard
- **Performance Metrics**: Real-time Lead Time and Cycle Time tracking.
- **Cycle Distribution**: Visual distribution charts to understand task throughput.
- **Status Breakdown**: Comprehensive activity overview across all boards.

### 🛠️ Enterprise-Ready Tools
- **Team Management**: Add and remove members with automatic assignment cleanup.
- **Backup & Recovery**: Export your entire ecosystem to JSON and restore it instantly anywhere.
- **Internationalization (i18n)**: Full support for English and Spanish.

---

## 🚀 Getting Started

### Prerequisites
- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/diegomenino/KanbanBoard.git
   cd KanbanBoard
   ```

2. Spin up the environment:
   ```bash
   docker compose up -d --build
   ```

3. Access the app:
   Navigate to [http://localhost:8101](http://localhost:8101)

---

## 🇪🇸 Versión en Español

# 🚀 Sistema Premium de Tablero Kanban

Un ecosistema Kanban multitanblero de alta fidelidad diseñado para equipos de élite que priorizan el rendimiento, la claridad visual y los conocimientos basados en datos.

## 🌟 Características Principales

### 🎨 Estética y UX de Élite
- **Glassmorfismo Vibrante**: Una interfaz impresionante con translucidez profunda, brillos sutiles y tipografía premium.
- **Motor de Temas Dinámico**: Cambia sin problemas entre un Modo Oscuro de alto contraste y un Modo Claro aireado y profesional.
- **Micro-animaciones**: Transiciones suaves de arrastrar y soltar (DnD Kit) y elementos de interfaz receptivos.

### 📊 Gestión Avanzada del Flujo de Trabajo
- **Soporte Multitablebro**: Crea y gestiona espacios de trabajo aislados para diferentes equipos o proyectos.
- **Límites WIP**: Establece límites de Trabajo en Progreso por columna para identificar cuellos de botella al instante.
- **Definición de Hecho (DoD)**: Documentación de políticas integrada para cada etapa de su flujo de trabajo.
- **Fechas de Vencimiento Relativas**: Cuentas regresivas en tiempo real en las tarjetas con resaltado automático de retrasos en rojo.

### 📈 Panel de Analítica Inteligente
- **Métricas de Rendimiento**: Seguimiento en tiempo real de Lead Time y Cycle Time.
- **Distribución de Ciclos**: Gráficos de distribución visual para comprender el rendimiento de las tareas.
- **Desglose de Estado**: Resumen completo de la actividad en todos los tableros.

### 🛠️ Herramientas Listas para Empresas
- **Gestión de Equipos**: Añade y elimina miembros con limpieza automática de asignaciones.
- **Copia de Seguridad y Recuperación**: Exporta todo tu ecosistema a JSON y restáuralo al instante en cualquier lugar.
- **Internacionalización (i18n)**: Soporte completo para inglés y español.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Vanilla CSS (Custom Glassmorphism System)
- **State Management**: React Context API
- **Icons**: Lucide React
- **Drag & Drop**: @dnd-kit
- **Deployment**: Docker & Docker Compose
