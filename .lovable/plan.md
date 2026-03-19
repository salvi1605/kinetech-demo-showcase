

# Ajustes de contenido en Home y Pricing

## Cambios en 3 archivos

### 1. `src/i18n/es.ts`

**Hero** — Reemplazar `home.hero.title` por el texto exacto solicitado. Ajustar `subtitle` para mayor claridad sin cambiar el sentido.

**Nuevas keys:**
- `home.problem.heading`: "¿Qué problema resolvemos?"
- `home.problem.items`: array con los 4 bullets solicitados
- `home.comingSoon.heading`: "Próximamente"
- `home.comingSoon.items`: array con los 3 bullets solicitados
- `pricing.founder.limited`: "Cupos limitados para clínicas en etapa inicial"

### 2. `src/i18n/en.ts`

Agregar las mismas keys con traducciones al inglés equivalentes (sin optimización especial, solo coherencia estructural para que TypeScript no rompa).

### 3. `src/pages/Home.tsx`

**Sección "¿Qué problema resolvemos?"** — Insertar inmediatamente después del hero y antes del `<Separator />`. Usa el mismo patrón que la sección "Acompañamiento continuo" (lista con `CheckCircle2`, `container`, `max-w-xl`, `text-center` heading + `text-left` lista). Sin tarjetas, sin componentes nuevos.

**Sección "Próximamente"** — Insertar como bloque discreto antes de la sección de Contacto final. Mismo patrón de lista simple, pero con un contenedor más compacto y texto `text-sm` para mantenerlo sobrio.

### 4. `src/pages/Pricing.tsx`

Agregar `t.pricing.founder.limited` como un `<p>` con clase `text-sm text-muted-foreground` debajo del nombre del plan fundador, antes del precio.

---

**Archivos modificados:** `es.ts`, `en.ts`, `Home.tsx`, `Pricing.tsx`
**No se tocan:** layout, backend, auth, navegación, componentes UI, otras páginas.

