import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Sparkles, Star } from "lucide-react";
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

      {/* Plans grid */}
      <section className="container pb-20">
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
          {/* Professional Plan */}
          <Card className="relative flex flex-col border-border/60">
            <CardContent className="flex flex-1 flex-col p-8">
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t.pricing.professional.name}
              </p>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{t.pricing.professional.price}</span>
                <span className="text-muted-foreground">{t.pricing.perMonth}</span>
              </div>

              <div className="mt-3 flex items-baseline gap-2 text-sm text-muted-foreground">
                <span className="font-medium">{t.pricing.professional.setupLabel}:</span>
                <span>{t.pricing.professional.setupPrice}</span>
                <span className="text-xs">{t.pricing.professional.setupNote}</span>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">
                {t.pricing.professional.desc}
              </p>

              <ul className="mt-6 flex-1 space-y-2.5">
                {t.pricing.professional.included.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

            </CardContent>
          </Card>

          {/* Founder Program */}
          <Card className="relative flex flex-col border-2 border-primary/40 shadow-lg">
            <CardContent className="flex flex-1 flex-col p-8">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                  {t.pricing.founder.name}
                </p>
                <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/15 border-primary/20">
                  <Sparkles className="h-3 w-3" />
                  {t.pricing.founder.badge}
                </Badge>
              </div>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-primary">{t.pricing.founder.price}</span>
                <span className="text-muted-foreground">{t.pricing.perMonth}</span>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">
                {t.pricing.founder.desc}
              </p>

              {/* Conditions */}
              <ul className="mt-6 space-y-2.5">
                {t.pricing.founder.conditions.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {/* Extras */}
              <ul className="mt-4 flex-1 space-y-2.5">
                {t.pricing.founder.extras.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm font-medium">
                    <Star className="mt-0.5 h-4 w-4 shrink-0 text-primary fill-primary" />
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
