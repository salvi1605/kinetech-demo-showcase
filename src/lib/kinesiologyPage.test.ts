/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { es } from '@/i18n/es';
import { en } from '@/i18n/en';
import { CTAK_KINESIOLOGY_QUOTES, getKinesiologyOffer } from './kinesiologyPage';

describe('/kinesiologia offer price matches /pricing', () => {
  test('monthly price is USD 250 up to 6 professionals, same as /pricing', () => {
    const offer = getKinesiologyOffer(es);
    expect(offer.price).toBe('USD 250');
    expect(offer.price).toBe(es.pricing.early.price);
    expect(offer.priceNote).toBe(es.pricing.early.priceNote);
    expect(offer.priceNote.startsWith('USD 250/mes hasta 6 profesionales')).toBe(true);
  });

  test('setup fee is from USD 250, same as /pricing (ES and EN)', () => {
    expect(getKinesiologyOffer(es).setupPrice).toBe('Desde USD 250');
    expect(getKinesiologyOffer(en).setupPrice).toBe(en.pricing.early.setupPrice);
    expect(getKinesiologyOffer(en).price).toBe('USD 250');
  });
});

describe('home is general, not kinesiology-specific', () => {
  test('home H1 and SEO title do not mention kinesiology (ES)', () => {
    expect(es.home.hero.title).not.toMatch(/kinesiolog/i);
    expect(es.seo.home.title).not.toMatch(/kinesiolog/i);
  });

  test('home H1 and SEO title do not mention physiotherapy/kinesiology (EN)', () => {
    expect(en.home.hero.title).not.toMatch(/kinesiolog|physio/i);
    expect(en.seo.home.title).not.toMatch(/kinesiolog|physio/i);
  });

  test('"Designed for" links kinesiology clinics to /kinesiologia', () => {
    expect(es.home.audience.items.find((i) => i.to)?.to).toBe('/kinesiologia');
    expect(en.home.audience.items.find((i) => i.to)?.to).toBe('/kinesiologia');
  });
});

describe('CTAK quotes on /kinesiologia are the exact authorized text', () => {
  test('three verbatim quotes in Spanish', () => {
    expect(CTAK_KINESIOLOGY_QUOTES.map((q) => q.quote)).toEqual([
      'Pasamos del papel a AgendixPro y nos agilizó notablemente los tiempos',
      'Lo recomiendo 100%',
      'Si no te molestamos es porque no hay inconvenientes con el sistema administrativo',
    ]);
  });
});
