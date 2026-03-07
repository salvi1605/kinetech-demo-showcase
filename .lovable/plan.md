

## Plan: Sistema de cambio de idioma (ES/EN) para páginas públicas

### Alcance
Implementar un toggle de idioma español/inglés en el header del `PublicLayout` que cambie todos los textos de las 6 páginas públicas: Home, Pricing, Contact, Terms, Privacy y CancellationPolicy.

### Enfoque técnico
Crear un sistema de internacionalización ligero basado en React Context (sin librerías externas), con diccionarios de traducciones en memoria (se pierde al refrescar, idioma por defecto: español).

### Archivos a crear
1. **`src/contexts/LanguageContext.tsx`** — Context + Provider con estado `locale: 'es' | 'en'` y función `toggleLocale`. Hook `useLanguage()` y helper `t(key)`.

2. **`src/i18n/es.ts`** — Diccionario completo en español con todas las cadenas de las 6 páginas + layout (nav labels, footer, hero, solves, features, steps, pricing cards, contact form, terms sections, privacy sections, cancellation sections).

3. **`src/i18n/en.ts`** — Diccionario equivalente en inglés.

4. **`src/i18n/index.ts`** — Export centralizado de ambos diccionarios.

### Archivos a modificar
5. **`src/components/layout/PublicLayout.tsx`** — Agregar botón de idioma (bandera o "ES | EN") en el header, junto al botón de login. Leer `navLinks` y `footerLinks` desde el diccionario activo.

6. **`src/pages/Home.tsx`** — Reemplazar todos los textos hardcodeados por `t('home.hero.title')`, etc.

7. **`src/pages/Pricing.tsx`** — Igual, textos desde diccionario.

8. **`src/pages/Contact.tsx`** — Igual.

9. **`src/pages/Terms.tsx`** — Igual.

10. **`src/pages/Privacy.tsx`** — Igual.

11. **`src/pages/CancellationPolicy.tsx`** — Igual.

12. **`src/App.tsx`** — Envolver las rutas públicas con `<LanguageProvider>`.

### Diseño del botón
Un botón compacto en el header con icono `Globe` de lucide-react mostrando "ES" o "EN" según el idioma activo. Al hacer click, alterna entre ambos.

### Estructura del diccionario (ejemplo)
```typescript
// src/i18n/es.ts
export const es = {
  nav: { home: "Inicio", pricing: "Precios", contact: "Contacto", terms: "Términos", privacy: "Privacidad", login: "Iniciar Sesión" },
  footer: { rights: "Todos los derechos reservados.", cancellation: "Cancelación y Reembolsos" },
  home: {
    hero: { title: "AgendixPro", subtitle: "Software de agenda y gestión...", cta: "Solicitar información", ctaAlt: "Ver plan y precios" },
    solves: { heading: "¿Qué resuelve AgendixPro?", items: [...] },
    // ...
  },
  pricing: { ... },
  contact: { ... },
  terms: { ... },
  privacy: { ... },
  cancellation: { ... },
};
```

### Notas
- Estado en memoria efímera (sin localStorage), respetando las reglas del proyecto.
- Idioma por defecto: español.
- Solo aplica a las páginas públicas; las páginas internas de la app (calendar, patients, etc.) quedan en español.

