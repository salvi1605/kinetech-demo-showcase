
# Auditoria completa de responsividad y plan para hacer el sistema full responsive

## Problemas identificados por pagina/componente

### 1. Topbar (`src/components/layout/Topbar.tsx`)
- El email del usuario y los controles de dev tools se muestran en una sola fila horizontal que desborda en movil
- No hay nombre de clinica ni boton "Cambiar Clinica" visible en movil (estan ocultos con `hidden md:flex`)
- El boton de logout no muestra texto en movil pero el contenedor user-info sigue ocupando mucho espacio horizontal
- Los dev tools (Time Travel, Role Emulator, Demo Mode) no son usables en movil: se apilan horizontalmente y desbordan

**Solucion**: Redisenar Topbar movil con un menu hamburguesa o Popover que agrupe: nombre clinica, cambiar clinica, email, logout. Los dev tools se muestran en un Popover/Sheet separado accesible via icono.

### 2. PatientDetailTabs (`src/pages/PatientDetailTabs.tsx`)
- **Header de paciente** (linea 265-284): Los botones "Crear cita" y "Editar Paciente" se colocan en fila horizontal junto al titulo, desbordando en pantallas <400px
- **TabsList** (linea 321): `grid-cols-3 lg:grid-cols-5` -- los tabs "Historial" y "Documentos" no se ven en movil (3 columnas para 5 tabs)
- **Grids de datos** (lineas 445, 504, 610): Todos los formularios usan `grid-cols-2` fijo sin breakpoint responsivo -- en 360px los inputs quedan aplastados e ilegibles
- **Card de contacto del paciente** (linea 304): El email y telefono se muestran en fila con `gap-4` sin wrap, se sale del contenedor en pantallas estrechas
- **Tabla de historial de citas**: Tiene columnas que no se ocultan en movil

**Solucion**:
- Header: apilar botones debajo del titulo en movil (`flex-col sm:flex-row`)
- Tabs: cambiar a scroll horizontal o `grid-cols-5` mas compacto con solo iconos en movil
- Formularios: `grid-cols-1 sm:grid-cols-2`
- Contacto: `flex-wrap` o apilar verticalmente

### 3. UserManagement (`src/pages/UserManagement.tsx`)
- **Header** (linea 316): `flex items-center justify-between` con titulo grande y boton en la misma linea; desborda en movil
- **Tabla de usuarios** (lineas 496-583): 7 columnas sin ocultamiento responsivo (Email, Nombre, Rol, Profesional, Clinica, Estado, Acciones). En 360px es totalmente ilegible
- **Contenedor** usa `container mx-auto max-w-7xl` sin `pb-20` para BottomNav -- el contenido queda tapado por la navegacion inferior

**Solucion**:
- Header: apilar en movil
- Tabla: ocultar columnas secundarias en movil (`hidden md:table-cell`), o reemplazar tabla por cards en movil (como Patients)
- Agregar `pb-20 lg:pb-6` al contenedor

### 4. ClinicSettings (`src/pages/ClinicSettings.tsx`)
- Mismo problema de padding: `container mx-auto py-8 px-4` sin `pb-20` para BottomNav
- Header con titulo `text-3xl` + boton en la misma linea

**Solucion**: Agregar `pb-20 lg:pb-6`, apilar header en movil

### 5. Settings (`src/pages/Settings.tsx`)
- Las filas de configuracion (`flex items-center justify-between`) con Label+descripcion a la izquierda y Switch/Button a la derecha: en pantallas estrechas la descripcion y el control se comprimen
- Seccion "Gestion de Datos" (linea 336-378): los botones `flex justify-between items-center` con descripcion larga pueden desbordar

**Solucion**: En movil, apilar label+descripcion arriba y control abajo (`flex-col sm:flex-row`)

### 6. Practitioners (`src/pages/Practitioners.tsx`)
- **Header** (lineas 56-71): Boton "Nuevo Profesional" y Switch "Mostrar inactivos" estan en la misma fila que el titulo, sin breakpoint responsivo en los controles
- El boton "Nuevo Profesional" no tiene version FAB movil como Pacientes

**Solucion**: Ocultar boton desktop en movil, agregar FAB. Wrap de controles responsivo.

### 7. Dialogs/Modals en general
- Los dialogs (NewAppointmentDialog, NewPatientDialogV2, etc.) usan `DialogContent` que por defecto tiene `max-w-md` o `max-w-lg` -- generalmente OK, pero sin verificar que el contenido interior no desborde
- En movil, los dialogs deberian idealmente renderizar como **Drawer** (bottom sheet) usando el patron `useIsMobile` + condicional Drawer/Dialog

**Solucion**: Aplicar el patron Drawer-en-movil a los dialogs principales (al menos NewAppointment, AppointmentDetail, NewPatient, EditPatient)

### 8. Padding inferior para BottomNav
Las siguientes paginas **no tienen** `pb-20 lg:pb-6` y quedan tapadas por el BottomNav:
- `UserManagement.tsx` (usa `py-8 px-4`)
- `ClinicSettings.tsx` (usa `py-8 px-4`)
- `CreateClinicPage.tsx` (probablemente)

**Solucion**: Unificar a `pb-20 lg:pb-6` en todas las paginas

---

## Plan de implementacion (ordenado por impacto)

### Fase 1: Correcciones criticas de layout (overflow y BottomNav)

| Archivo | Cambio |
|---------|--------|
| `UserManagement.tsx` | Agregar `pb-20 lg:pb-6`, ocultar columnas secundarias de tabla en movil con `hidden md:table-cell`, apilar header en movil |
| `ClinicSettings.tsx` | Agregar `pb-20 lg:pb-6`, apilar header en movil |
| `PatientDetailTabs.tsx` | Cambiar grids de formularios a `grid-cols-1 sm:grid-cols-2`, hacer tabs scrollables horizontalmente en movil, apilar header con botones, hacer contacto info responsive |
| `Practitioners.tsx` | Ocultar boton desktop en movil, agregar FAB "+", responsivizar controles del header |

### Fase 2: Topbar compacta en movil

| Archivo | Cambio |
|---------|--------|
| `Topbar.tsx` | Crear Popover/Sheet con opciones de usuario en movil (nombre clinica, cambiar clinica, email, logout). Mover dev tools a un Popover con icono engranaje. Reducir altura y contenido visible en movil |

### Fase 3: Settings y datos internos responsive

| Archivo | Cambio |
|---------|--------|
| `Settings.tsx` | Hacer filas de configuracion apilables: `flex-col sm:flex-row` en items con Label + control |

### Fase 4: Dialogs como Drawer en movil

| Archivo | Cambio |
|---------|--------|
| Dialogs principales | Aplicar patron condicional `useIsMobile ? Drawer : Dialog` en los dialogs mas usados para dar experiencia nativa de bottom-sheet en movil |

---

## Resumen de archivos a modificar

1. `src/pages/UserManagement.tsx` -- layout responsivo tabla + padding
2. `src/pages/ClinicSettings.tsx` -- padding + header responsivo
3. `src/pages/PatientDetailTabs.tsx` -- formularios, tabs, header, contacto
4. `src/pages/Practitioners.tsx` -- FAB + header responsivo
5. `src/components/layout/Topbar.tsx` -- compactacion movil
6. `src/pages/Settings.tsx` -- filas de config apilables

Total: 6 archivos. Cada cambio es puramente CSS/layout con Tailwind, sin cambios de logica ni estado.
