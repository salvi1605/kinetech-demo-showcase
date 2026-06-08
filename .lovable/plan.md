## Objetivo

Reemplazar el voseo rioplatense ("confirmá", "hacé", "solicitaste", "podés", "asegurá", "ingresá") por español neutro latinoamericano (tuteo estándar: "confirma", "haz clic", "puedes", etc.) en las 6 plantillas de correo de autenticación.

## Alcance

Solo edición de texto visible en estos archivos. No se toca lógica, estilos, props ni el hook `auth-email-hook`.

- `supabase/functions/_shared/email-templates/signup.tsx`
- `supabase/functions/_shared/email-templates/recovery.tsx`
- `supabase/functions/_shared/email-templates/magic-link.tsx`
- `supabase/functions/_shared/email-templates/invite.tsx`
- `supabase/functions/_shared/email-templates/email-change.tsx`
- `supabase/functions/_shared/email-templates/reauthentication.tsx`

## Criterio de estilo

- Tuteo neutro estándar (evitar "vos", "tenés", terminaciones agudas tipo "confirmá/hacé/ingresá").
- Vocabulario neutro: "correo electrónico" o "correo" (no "mail"), "haz clic" (no "hacé clic"), "puedes ignorar" (no "podés ignorar"), "solicitaste" se mantiene (es neutro), "asegura tu cuenta" (no "asegurá").
- Mantener tono claro, breve, sin modismos regionales.
- Mantener marca AgendixPro, color #3B82F6, fuente Inter, estructura y componentes React Email iguales.

## Ejemplos de cambios

- "Confirmá tu correo" → "Confirma tu correo"
- "Hacé clic abajo para confirmar el cambio" → "Haz clic en el botón para confirmar el cambio"
- "Podés ignorar este correo" → "Puedes ignorar este correo"
- "Ingresá a {siteName}" / "Ingresar" → "Ingresa a {siteName}" / "Ingresar" (infinitivo del botón se mantiene)
- "Asegurá tu cuenta de inmediato" → "Asegura tu cuenta de inmediato"
- "Usá el siguiente código" → "Usa el siguiente código"
- "Recibiste una invitación para unirte" → se mantiene (ya es neutro)

## Implementación

1. Reescribir los 6 archivos `.tsx` con copy en español neutro.
2. Desplegar `auth-email-hook` para que tome las plantillas actualizadas (`supabase--deploy_edge_functions` con `["auth-email-hook"]`).
3. Ofrecer botones de preview para verificar.

## Fuera de alcance

- No se modifican estilos, estructura, ni el hook.
- No se tocan otros módulos del proyecto.
- No se cambia el remitente ni la configuración de dominio.
