import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { es, en } from "@/i18n";
import type { Translations } from "@/i18n";

type Locale = "es" | "en";

interface LanguageContextValue {
  locale: Locale;
  toggleLocale: () => void;
  t: Translations;
}

const dictionaries: Record<Locale, Translations> = { es, en };

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("es");

  const toggleLocale = useCallback(() => {
    setLocale((prev) => (prev === "es" ? "en" : "es"));
  }, []);

  const value: LanguageContextValue = {
    locale,
    toggleLocale,
    t: dictionaries[locale],
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
