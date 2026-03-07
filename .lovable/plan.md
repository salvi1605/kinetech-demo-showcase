

## Plan: Crear página Home pública para AgendixPro

### Alcance
Crear una nueva página `/home` como landing pública profesional y dos páginas legales adicionales (`/pricing`, `/cancellation-policy`). Registrar las rutas en `App.tsx`. No se modifica login, dashboard ni páginas internas.

### Archivos a crear

**1. `src/pages/Home.tsx`** — Landing page completa con las 7 secciones solicitadas:
- **Header**: Logo AgendixPro + nav (Funcionalidades, Contacto, Iniciar Sesión)
- **Hero**: Título "AgendixPro", subtítulo, texto de apoyo, botón "Solicitar información" (scroll a contacto) y "Ver funcionalidades" (scroll a funcionalidades)
- **Qué resuelve**: 5 cards (agenda/turnos, pacientes, disponibilidad, operación diaria, soporte)
- **Funcionalidades principales**: Lista con bullets cortos (agenda por profesional, registro pacientes, disponibilidad/excepciones, seguimiento operativo, acceso web)
- **Cómo funciona**: 3 pasos numerados (configuración inicial, acceso del equipo, soporte y mejora)
- **Modelo de servicio**: Bloque breve explicando mantenimiento mensual y soporte
- **Contacto**: Email visible, botón WhatsApp (`https://wa.me/...`), mensaje breve
- **Footer**: Links a Pricing, Contacto, Privacidad, Términos, Cancelación y Reembolsos

Scroll suave con `document.getElementById(...).scrollIntoView({ behavior: 'smooth' })`.

**2. `src/pages/Pricing.tsx`** — Página pública simple con información de modelo de servicio (sin checkout ni pagos). Texto descriptivo del modelo SaaS con mantenimiento.

**3. `src/pages/CancellationPolicy.tsx`** — Página pública con política de cancelación y reembolsos estándar.

### Archivos a modificar

**4. `src/App.tsx`** — Agregar 3 rutas públicas:
```
/home → <Home />
/pricing → <Pricing />
/cancellation-policy → <CancellationPolicy />
```

### Detalles técnicos
- Componentes: `Button`, `Card`, `Separator` de shadcn/ui; iconos de `lucide-react`
- Sin persistencia, sin APIs, sin autenticación
- Responsive con Tailwind (mobile-first)
- WhatsApp: placeholder de número que el usuario puede ajustar después
- Email: placeholder `contacto@agendixpro.com`

