
# Plan: Renombrar el proyecto a "Agendix"

## Resumen

Cambiar todas las referencias de branding de "Kine-UI", "KinesioTurnos" y similares al nuevo nombre **Agendix** en toda la aplicación.

---

## Archivos a Modificar

### 1. Metadatos del sitio (index.html)
- Título: `"Kine-UI v2 - Sistema de Gestión"` → `"Agendix - Sistema de Gestión de Turnos"`
- Meta description actualizada
- Meta author: `"Kine-UI"` → `"Agendix"`
- Open Graph title y description actualizados

### 2. Páginas públicas

**Welcome.tsx**
- Header: `"KinesioTurnos"` → `"Agendix"`
- Hero: `"Gestión de Turnos para Kinesiología"` → `"Gestión de Turnos Profesional"`
- Descripción ajustada para ser más genérica (no solo kinesiología)
- Footer copyright: `"KinesioTurnos"` → `"Agendix"`

**Terms.tsx**
- Logo/header: `"KinesioTurnos"` → `"Agendix"`
- Contenido legal actualizado con nuevo nombre

**Privacy.tsx**
- Logo/header: `"KinesioTurnos"` → `"Agendix"`

### 3. Componentes de layout

**Topbar.tsx**
- Logo: `"Kine-UI"` → `"Agendix"`
- Remover badge `"v2"` (opcional, para un look más limpio)

**AppSidebar.tsx**
- Logo: `"Kine-UI"` → `"Agendix"`
- Subtítulo: `"Sistema de Gestión"` se mantiene

### 4. Página de Login

**Login.tsx**
- Título: `"Kine-UI v2"` → `"Agendix"`
- Subtítulo ajustado: `"Sistema de Gestión de Kinesiología"` → `"Sistema de Gestión de Turnos"`
- Icono "K" → "A"

### 5. Archivos de configuración/comentarios (menor prioridad)

**index.css**
- Comentario del design system (solo cosmético)

**databaseSchema.ts**
- Comentarios de documentación interna

---

## Resumen Visual del Cambio

| Ubicación | Antes | Después |
|-----------|-------|---------|
| Tab del navegador | Kine-UI v2 | Agendix |
| Header público | KinesioTurnos | Agendix |
| Login | Kine-UI v2 | Agendix |
| Topbar interna | Kine-UI | Agendix |
| Sidebar | Kine-UI | Agendix |
| Footer | KinesioTurnos | Agendix |

---

## Notas

- El contenido puede seguir mencionando "kinesiología" como caso de uso, pero el nombre de marca será **Agendix**
- Los archivos de migración SQL y helpers internos mantienen referencias técnicas que no afectan al usuario final
