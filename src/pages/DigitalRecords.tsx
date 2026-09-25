import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ShieldCheck,
  ClipboardList,
  FileText,
  Cloud,
  Activity,
  Users,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import { SeoHead } from "@/components/shared/SeoHead";
import { useLanguage } from "@/contexts/LanguageContext";

const benefitIcons = [ShieldCheck, ClipboardList, FileText, Cloud, Activity, Users];

export default function DigitalRecords() {
  const { t } = useLanguage();

  return (
    <PublicLayout>
      <SeoHead
        title="Historia clínica digital — AgendixPro"
        description="Historia clínica digital para clínicas y consultorios: evolución clínica por sesión, datos seguros y seguimiento de tratamientos en un solo sistema. Solicitá una demo de AgendixPro."
        path="/historia-clinica-digital"
      />

      {/* Hero */}
      <section className="container py-16 md:py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{t.records.heading}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">{t.records.subtitle}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link to="/contact">{t.records.ctaPrimary}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/pricing">{t.records.ctaSecondary}</Link>
          </Button>
        </div>
      </section>

      {/* Benefits */}
      <section className="container pb-16 md:pb-20">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl text-center">
          {t.records.benefitsHeading}
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {t.records.benefits.map((benefit, i) => {
            const Icon = benefitIcons[i % benefitIcons.length];
            return (
              <Card key={benefit.title} className="border-muted">
                <CardContent className="space-y-3 p-6">
                  <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                  <h3 className="font-semibold">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-muted/50 py-16 md:py-20">
        <div className="container">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl text-center">
            {t.records.howHeading}
          </h2>
          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {t.records.steps.map((step, i) => (
              <li key={step.title} className="space-y-2 rounded-lg border bg-card p-6">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {i + 1}
                </span>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Designed for */}
      <section className="container py-16 md:py-20">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl text-center">
          {t.records.forWhoHeading}
        </h2>
        <ul className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-2">
          {t.records.forWhoItems.map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* Final CTA */}
      <section className="container pb-16 md:pb-20">
        <div className="mx-auto max-w-2xl rounded-lg border bg-muted/50 p-8 text-center md:p-10">
          <h2 className="text-2xl font-semibold tracking-tight">{t.records.finalHeading}</h2>
          <p className="mt-3 text-muted-foreground">{t.records.finalDesc}</p>
          <Button asChild size="lg" className="mt-6">
            <Link to="/contact">
              {t.records.finalCta}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
}
