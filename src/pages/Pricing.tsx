import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, MessageCircle, Mail, Send, FileCheck, Zap, Sparkles } from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import { useLanguage } from "@/contexts/LanguageContext";

const stepIcons = [Send, FileCheck, Zap];

export default function Pricing() {
  const { t } = useLanguage();

  return (
    <PublicLayout>
      <section className="container py-16 text-center md:py-24">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          {t.pricing.heading}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          {t.pricing.subtitle}
        </p>
      </section>

      <section className="container pb-16">
        <Card className="mx-auto max-w-lg border-primary/30">
          <CardContent className="p-8">
            <p className="text-sm font-medium uppercase tracking-wider text-primary">
              {t.pricing.plan}
            </p>

            {/* Standard pricing */}
            <div className="mt-6 space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">{t.pricing.standardLabel}</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold line-through text-muted-foreground/60">{t.pricing.price}</span>
                  <span className="text-muted-foreground/60">{t.pricing.perMonth}</span>
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">{t.pricing.setupLabel}</span>
                <span className="text-lg font-semibold text-muted-foreground/60 line-through">{t.pricing.setupPrice}</span>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Founder pricing */}
            <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-primary" />
                <Badge variant="secondary" className="text-xs font-semibold">
                  {t.pricing.founderAvailable}
                </Badge>
              </div>
              <p className="text-sm font-medium text-muted-foreground">{t.pricing.founderLabel}</p>
              <div className="mt-2 flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold">{t.pricing.founderPrice}</span>
                <span className="text-muted-foreground">{t.pricing.perMonth}</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{t.pricing.planDesc}</p>
            </div>

            <p className="mt-4 text-xs text-center text-muted-foreground italic">
              {t.pricing.founderNote}
            </p>

            <Separator className="my-6" />

            <p className="mb-3 text-sm font-semibold">{t.pricing.includesLabel}</p>
            <ul className="space-y-2">
              {t.pricing.included.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>

            <Separator className="my-6" />

            <p className="mb-3 text-sm font-semibold">{t.pricing.notIncludesLabel}</p>
            <ul className="space-y-2">
              {t.pricing.notIncluded.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive/70" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>

            <Separator className="my-6" />

            <div className="flex flex-col items-center gap-3">
              <a href="https://wa.me/12262244099" target="_blank" rel="noopener noreferrer" className="w-full">
                <Button className="w-full" size="lg">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  {t.pricing.ctaWhatsApp}
                </Button>
              </a>
              <a href="mailto:agendixpro2026@gmail.com">
                <Button variant="outline" size="sm">
                  <Mail className="mr-2 h-4 w-4" />
                  {t.pricing.ctaEmail}
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </section>

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
