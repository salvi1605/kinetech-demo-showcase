import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Sparkles, Info } from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Pricing() {
  const { t } = useLanguage();

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="container py-16 text-center md:py-24">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          {t.pricing.heading}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          {t.pricing.subtitle}
        </p>
      </section>

      {/* Plan Early — destacado */}
      <section className="container pb-16">
        <div className="mx-auto max-w-lg">
          <Card className="relative flex flex-col border-2 border-primary/40 shadow-lg">
            <CardContent className="flex flex-1 flex-col p-8">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                  {t.pricing.early.name}
                </p>
                <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/15 border-primary/20">
                  <Sparkles className="h-3 w-3" />
                  {t.pricing.early.badge}
                </Badge>
              </div>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-primary">{t.pricing.early.price}</span>
                <span className="text-muted-foreground">{t.pricing.perMonth}</span>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">
                {t.pricing.early.desc}
              </p>

              <ul className="mt-6 space-y-2.5">
                {t.pricing.early.included.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {/* Notas adicionales */}
              <div className="mt-6 border-t pt-4 space-y-2">
                {t.pricing.early.notes.map((note, i) => (
                  <p key={i} className="flex items-start gap-2.5 text-sm font-medium text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{note}</span>
                  </p>
                ))}
              </div>

              <Button className="mt-8 w-full" size="lg" asChild>
                <a
                  href="https://wa.me/5491161000000?text=Hola,%20quiero%20información%20sobre%20AgendixPro"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t.pricing.early.cta}
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Programa Fundador — bloque informativo */}
      <section className="container pb-16">
        <div className="mx-auto max-w-lg">
          <Card className="border-border/60 bg-muted/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <Info className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.pricing.founder.name}
                </p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-muted-foreground">{t.pricing.founder.price}</span>
                <span className="text-sm text-muted-foreground">{t.pricing.perMonth}</span>
              </div>

              <p className="mt-3 text-sm text-muted-foreground">
                {t.pricing.founder.desc}
              </p>

              <p className="mt-2 text-xs text-muted-foreground italic">
                {t.pricing.founder.notice}
              </p>

              <ul className="mt-4 space-y-1.5">
                {t.pricing.founder.conditions.map((item, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How to start */}
      <section className="bg-muted/30 py-16">
        <div className="container">
          <h2 className="mb-12 text-center text-2xl font-bold">{t.pricing.howToStart}</h2>
          <div className="mx-auto grid max-w-3xl gap-10 md:grid-cols-3">
            {t.pricing.steps.map((st, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold">
                  {i + 1}
                </div>
                <h3 className="mt-4 text-lg font-semibold">{st.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{st.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
