

# Consistencia visual en páginas legales

## Problema
Terms y Privacy comparten la misma estructura, pero CancellationPolicy usa un patrón diferente:

| Aspecto | Terms / Privacy | CancellationPolicy |
|---------|----------------|-------------------|
| Container | `max-w-3xl py-12 md:py-16` | `py-16 md:py-24` (más padding) |
| Contenido | Clases manuales | `prose prose-neutral max-w-2xl` (más estrecho) |
| h1 | `text-3xl font-bold tracking-tight md:text-4xl` | Sin clases (hereda de prose) |
| Separador | `<Separator className="my-8" />` | No tiene |
| Fecha | `text-sm text-muted-foreground` | `text-muted-foreground` (sin text-sm) |

## Cambio
Reescribir `CancellationPolicy.tsx` para usar exactamente el mismo layout que Terms y Privacy:
- `container max-w-3xl py-12 md:py-16`
- h1 con `text-3xl font-bold tracking-tight md:text-4xl`
- `<Separator className="my-8" />`
- Contenido en `space-y-8 text-[0.95rem] leading-relaxed text-foreground/90`
- Secciones con `h2 className="mb-3 text-xl font-semibold"`

Solo 1 archivo modificado: `src/pages/CancellationPolicy.tsx`. Sin cambios en i18n (los textos ya existen).

