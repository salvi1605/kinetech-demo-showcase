import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  CalendarCheck,
  Users,
  Clock,
  Activity,
  HeadsetIcon,
  CheckCircle2,
  Mail,
  MessageCircle,
  ArrowRight,
  Settings,
  UserPlus,
  Sparkles,
} from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import { useLanguage } from "@/contexts/LanguageContext";

const solveIcons = [CalendarCheck, Users, Clock, Activity, HeadsetIcon];
const stepIcons = [Settings, UserPlus, Sparkles];

export default function Home() {
  const { t } = useLanguage();

  return (
    <PublicLayout>
      {/* ── Hero ── */}
      <section className="container py-20 text-center md:py-28">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          {t.home.hero.title}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg font-medium text-muted-foreground sm:text-xl">
          {t.home.hero.subtitle}
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
          {t.home.hero.desc}
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Button asChild size="lg">
            <Link to="/contact">
              {t.home.hero.cta}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/pricing">{t.home.hero.ctaAlt}</Link>
          </Button>
        </div>
      </section>

      <Separator />

      {/* ── Qué resuelve ── */}
      <section id="funcionalidades" className="container py-16 md:py-20">
        <h2 className="mb-12 text-center text-3xl font-bold">
          {t.home.solves.heading}
        </h2>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {t.home.solves.items.map((s, i) => {
            const Icon = solveIcons[i];
            return (
              <Card key={i} className="border-muted">
                <CardContent className="flex flex-col items-start gap-3 p-6">
                  <Icon className="h-8 w-8 text-primary" />
                  <h3 className="text-lg font-semibold">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <Separator />

      {/* ── Incluye ── */}
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

      {/* ── Cómo funciona ── */}
      <section className="container py-16 md:py-20">
        <h2 className="mb-12 text-center text-3xl font-bold">
          {t.home.howItWorks.heading}
        </h2>
        <div className="mx-auto grid max-w-3xl gap-10 md:grid-cols-3">
          {t.home.howItWorks.steps.map((st, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold">
                {i + 1}
              </div>
              <h3 className="mt-4 text-lg font-semibold">{st.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{st.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      {/* ── Mantenimiento ── */}
      <section className="container py-16 md:py-20 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-6 text-3xl font-bold">{t.home.maintenance.heading}</h2>
          <p className="text-muted-foreground">{t.home.maintenance.desc}</p>
        </div>
      </section>

      <Separator />

      {/* ── Contacto ── */}
      <section id="contacto" className="container py-16 md:py-20">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="mb-6 text-3xl font-bold">{t.home.contact.heading}</h2>
          <p className="mb-8 text-muted-foreground">{t.home.contact.desc}</p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href="mailto:agendixpro@gmail.com"
              className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              <Mail className="h-4 w-4" />
              agendixpro@gmail.com
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
