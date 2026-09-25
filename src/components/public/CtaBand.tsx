import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { getWhatsAppHref } from "@/utils/obfuscateContact";

export function CtaBand() {
  const { t } = useLanguage();
  return (
    <section className="container py-12 md:py-16">
      <div className="mx-auto max-w-3xl rounded-xl border border-primary/20 bg-primary/5 p-8 text-center">
        <h2 className="text-2xl font-bold">{t.home.ctaBand.heading}</h2>
        <p className="mt-3 text-muted-foreground">{t.home.ctaBand.desc}</p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link to="/contact">
              {t.home.ctaBand.primary}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href={getWhatsAppHref()} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 h-4 w-4" />
              {t.home.ctaBand.secondary}
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
