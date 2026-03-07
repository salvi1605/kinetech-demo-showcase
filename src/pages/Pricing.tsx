import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, XCircle, MessageCircle, Mail, Send, FileCheck, Zap } from "lucide-react";
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
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold">{t.pricing.price}</span>
              <span className="text-muted-foreground">{t.pricing.perMonth}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{t.pricing.planDesc}</p>

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
              <a href="mailto:agendixpro@gmail.com" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Mail className="h-4 w-4" />
                {t.pricing.ctaEmail}
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
