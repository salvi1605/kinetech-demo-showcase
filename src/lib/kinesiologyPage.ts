import type { Translations } from "@/i18n";

/**
 * Citas textuales de CTAK autorizadas para /kinesiologia.
 * Se muestran en español, sin traducir ni editar, en ambos idiomas.
 * Cualquier cambio de redacción requiere nueva autorización de la clínica.
 */
export const CTAK_KINESIOLOGY_QUOTES = [
  { quote: "Pasamos del papel a AgendixPro y nos agilizó notablemente los tiempos", author: "telma" },
  { quote: "Lo recomiendo 100%", author: "telma" },
  { quote: "Si no te molestamos es porque no hay inconvenientes con el sistema administrativo", author: "gerardo" },
] as const;

/**
 * Precio de la oferta de /kinesiologia. Se lee de los mismos textos de /pricing
 * para que ambos precios nunca puedan diferir.
 */
export function getKinesiologyOffer(t: Translations) {
  const plan = t.pricing.early;
  return {
    price: plan.price,
    perMonth: t.pricing.perMonth,
    priceNote: plan.priceNote,
    setupTitle: plan.setupTitle,
    setupPrice: plan.setupPrice,
    setupOneTime: plan.setupOneTime,
    setupBreakdown: plan.setupBreakdown,
  };
}
