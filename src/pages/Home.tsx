import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  CalendarCheck,
  Users,
  Clock,
  Activity,
  CheckCircle2,
  MessageCircle,
  ArrowRight,
  Mail,
  HeadsetIcon,
  
  Target,
  ShieldCheck,
  FileText,
  XCircle,
} from "lucide-react";
import { FaqSection } from "@/components/public/FaqSection";
import { CtaBand } from "@/components/public/CtaBand";
import PublicLayout from "@/components/layout/PublicLayout";
import { SeoHead } from "@/components/shared/SeoHead";
import { getMailtoHref, getWhatsAppHref } from "@/utils/obfuscateContact";
import { useLanguage } from "@/contexts/LanguageContext";
import previewAgenda from "@/assets/preview-agenda.jpg";
import previewPaciente from "@/assets/preview-paciente.jpg";
import previewHistorial from "@/assets/preview-historial.jpg";

const featureIcons = [CalendarCheck, Users, Clock, Activity];
const benefitIcons = [CalendarCheck, Clock, Activity, ShieldCheck];
const previewImages = [previewAgenda, previewPaciente, previewHistorial];

export default function Home() {
  const { t } = useLanguage();

  return (
    <PublicLayout>
      <SeoHead
        title="Software para kinesiólogos y clínicas — Sistema de turnos | AgendixPro"
        description="Software de agenda y sistema de turnos online para clínicas de kinesiología y consultorios. Historia clínica digital, pacientes y profesionales en un solo lugar. Pedí tu demo."
        path="/"
      />
      {/* ── Hero ── */}
      <section className="container py-20 text-center md:py-28">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          {t.home.hero.title}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          {t.home.hero.subtitle}
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link to="/contact">
              {t.home.hero.cta}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href={getWhatsAppHref()} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 h-4 w-4" />
              {t.home.hero.ctaAlt}
            </a>
          </Button>
        </div>
      </section>

      {/* ── Problem → Solution ── */}
      <section className="container py-12 md:py-16">
        <h2 className="mb-10 text-center text-3xl font-bold">{t.home.problem.heading}</h2>
        <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
          {t.home.problem.items.map((item, i) => (
            <div key={i} className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
              <p className="flex items-start gap-2 font-medium">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
                {item.pain}
              </p>
              <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                {item.solution}
              </p>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      {/* ── Benefits ── */}
      <section className="container py-16 md:py-20">
        <h2 className="mb-12 text-center text-3xl font-bold">{t.home.benefits.heading}</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {t.home.benefits.items.map((b, i) => {
            const Icon = benefitIcons[i];
            return (
              <div key={i} className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <CtaBand />

      <Separator />

      {/* ── Product Preview ── */}
      <section className="container py-16 md:py-20">
        <h2 className="mb-12 text-center text-3xl font-bold">
          {t.home.productPreview.heading}
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {t.home.productPreview.items.map((item, i) => (
            <div
              key={i}
              className="group rounded-xl border border-border/60 bg-card shadow-sm transition-shadow hover:shadow-md overflow-hidden"
            >
              <img
                src={previewImages[i]}
                alt={item.title}
                className="h-48 w-full object-cover object-top"
                loading="lazy"
              />
              <div className="p-6">
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      {/* ── Features (Lo que puedes gestionar) ── */}
      <section id="funcionalidades" className="container py-16 md:py-20">
        <h2 className="mb-12 text-center text-3xl font-bold">
          {t.home.features.heading}
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {t.home.features.items.map((f, i) => {
            const Icon = featureIcons[i];
            return (
              <div
                key={i}
                className="group rounded-xl border border-border/60 bg-card p-8 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <Separator />

      {/* ── Records promo ── */}
      <section className="container py-12 md:py-16">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 rounded-xl border border-border/60 bg-card p-8 text-center shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-bold">{t.home.recordsPromo.heading}</h2>
          <p className="text-muted-foreground">{t.home.recordsPromo.desc}</p>
          <Button asChild variant="outline">
            <Link to="/historia-clinica-digital">
              {t.home.recordsPromo.cta}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <Separator />

      {/* ── Steps ── */}
      <section className="bg-muted/30 py-16 md:py-20">
        <div className="container">
          <h2 className="mb-12 text-center text-3xl font-bold">{t.home.steps.heading}</h2>
          <ol className="mx-auto grid max-w-3xl gap-10 md:grid-cols-3">
            {t.home.steps.items.map((st, i) => (
              <li key={i} className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground" aria-hidden="true">
                  {i + 1}
                </div>
                <h3 className="mt-4 text-lg font-semibold">{st.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{st.desc}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 text-center">
            <Button asChild size="lg">
              <Link to="/contact">
                {t.home.steps.cta}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Separator />

      {/* ── Support (Acompañamiento) ── */}
      <section className="container py-16 md:py-20">
        <div className="mx-auto max-w-xl text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <HeadsetIcon className="h-6 w-6 text-primary" />
          </div>
          <h2 className="mb-8 text-3xl font-bold">{t.home.support.heading}</h2>
          <ul className="space-y-3 text-left">
            {t.home.support.items.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Separator />

      {/* ── Includes ── */}
      <section className="container py-16 md:py-20">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="mb-8 text-3xl font-bold">{t.home.includes.heading}</h2>
          <ul className="space-y-3 text-left">
            {t.home.includes.items.map((f, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-muted-foreground">{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Separator />

      {/* ── Trust ── */}
      <section className="container py-16 md:py-20">
        <div className="mx-auto max-w-2xl rounded-xl border border-primary/20 bg-primary/5 p-8 text-center">
          <p className="text-lg font-medium text-foreground">
            {t.home.trust.text}
          </p>
        </div>
      </section>

      <Separator />

      {/* ── Audience ── */}
      <section className="container py-16 md:py-20">
        <div className="mx-auto max-w-xl text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Target className="h-6 w-6 text-primary" />
          </div>
          <h2 className="mb-8 text-3xl font-bold">{t.home.audience.heading}</h2>
          <ul className="space-y-3 text-left">
            {t.home.audience.items.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Separator />

      {/* ── Maintenance ── */}
      <section className="container py-16 md:py-20 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-6 text-3xl font-bold">{t.home.maintenance.heading}</h2>
          <p className="text-muted-foreground">{t.home.maintenance.desc}</p>
          <p className="mt-4 text-sm text-muted-foreground/80">{t.home.maintenance.note}</p>
        </div>
      </section>

      {/* ── Coming Soon ── */}
      <section className="container py-10 md:py-14">
        <div className="mx-auto max-w-md text-center">
          <h3 className="mb-4 text-lg font-semibold text-muted-foreground">{t.home.comingSoon.heading}</h3>
          <ul className="space-y-2 text-left">
            {t.home.comingSoon.items.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Separator />

      <Separator />

      <FaqSection />

      <CtaBand />

      {/* ── Contact ── */}
      <section id="contacto" className="container py-16 md:py-20">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="mb-6 text-3xl font-bold">{t.home.contact.heading}</h2>
          <p className="mb-8 text-muted-foreground">{t.home.contact.desc}</p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a href={getMailtoHref()}>
              <Button variant="outline" size="sm">
                <Mail className="mr-2 h-4 w-4" />
                {t.common.emailButton}
              </Button>
            </a>
            <a href={getWhatsAppHref()} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <MessageCircle className="mr-2 h-4 w-4" />
                {t.footer.whatsappButton}
              </Button>
            </a>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
