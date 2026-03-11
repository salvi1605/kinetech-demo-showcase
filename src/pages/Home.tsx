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
  Image,
  Target,
} from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import previewAgenda from "@/assets/preview-agenda.jpg";
import previewPaciente from "@/assets/preview-paciente.jpg";
import previewHistorial from "@/assets/preview-historial.jpg";

const featureIcons = [CalendarCheck, Users, Clock, Activity];
const previewImages = [previewAgenda, previewPaciente, previewHistorial];

export default function Home() {
  const { t } = useLanguage();

  return (
    <PublicLayout>
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
            <a href="https://wa.me/12262244099" target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 h-4 w-4" />
              {t.home.hero.ctaAlt}
            </a>
          </Button>
        </div>
      </section>

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
              {/* Placeholder image area */}
              <div className="flex h-48 items-center justify-center bg-muted/50">
                <Image className="h-12 w-12 text-muted-foreground/40" />
              </div>
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

      <Separator />

      {/* ── Contact ── */}
      <section id="contacto" className="container py-16 md:py-20">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="mb-6 text-3xl font-bold">{t.home.contact.heading}</h2>
          <p className="mb-8 text-muted-foreground">{t.home.contact.desc}</p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a href="mailto:agendixpro2026@gmail.com">
              <Button variant="outline" size="sm">
                <Mail className="mr-2 h-4 w-4" />
                {t.common.emailButton}
              </Button>
            </a>
            <a href="https://wa.me/12262244099" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <MessageCircle className="mr-2 h-4 w-4" />
                WhatsApp
              </Button>
            </a>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
