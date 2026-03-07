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

const scrollTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
};

const solves = [
  {
    icon: CalendarCheck,
    title: "Gestión de agenda y turnos",
    desc: "Organiza la agenda diaria de cada profesional con turnos, estados y seguimiento en tiempo real.",
  },
  {
    icon: Users,
    title: "Gestión de pacientes",
    desc: "Registra datos personales, clínicos, obra social y documentos de cada paciente en un solo lugar.",
  },
  {
    icon: Clock,
    title: "Disponibilidad de profesionales",
    desc: "Configura franjas horarias, excepciones y feriados para cada profesional de forma flexible.",
  },
  {
    icon: Activity,
    title: "Operación diaria de la clínica",
    desc: "Controla asistencia, no-shows, reportes operativos y seguimiento de tratamientos.",
  },
  {
    icon: HeadsetIcon,
    title: "Soporte y mantenimiento continuo",
    desc: "Acompañamiento permanente para resolver dudas, ajustar configuraciones y mejorar el sistema.",
  },
];

const features = [
  "Agenda por profesional con vista semanal",
  "Registro completo de pacientes",
  "Gestión de disponibilidad y excepciones",
  "Seguimiento operativo y reportes",
  "Acceso web para todo el equipo",
];

const steps = [
  {
    icon: Settings,
    num: "1",
    title: "Configuración inicial",
    desc: "Creamos la clínica, profesionales, horarios y tratamientos según las necesidades del equipo.",
  },
  {
    icon: UserPlus,
    num: "2",
    title: "Acceso del equipo",
    desc: "Cada miembro recibe su usuario con el rol y permisos correspondientes para comenzar a operar.",
  },
  {
    icon: Sparkles,
    num: "3",
    title: "Soporte y mejora continua",
    desc: "Mantenimiento mensual, actualizaciones y asistencia para que el sistema evolucione con la clínica.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <span className="text-xl font-bold tracking-tight">AgendixPro</span>
          <nav className="hidden items-center gap-6 sm:flex">
            <button
              onClick={() => scrollTo("funcionalidades")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Funcionalidades
            </button>
            <Link
              to="/contact"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Contacto
            </Link>
            <Button asChild size="sm">
              <Link to="/login">Iniciar Sesión</Link>
            </Button>
          </nav>
          <Button asChild size="sm" className="sm:hidden">
            <Link to="/login">Iniciar Sesión</Link>
          </Button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="container py-20 text-center md:py-28">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          AgendixPro
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg font-medium text-muted-foreground sm:text-xl">
          Software de agenda y gestión para clínicas y profesionales de salud.
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
          AgendixPro ayuda a organizar turnos, pacientes, profesionales,
          disponibilidad y operación diaria desde una sola plataforma web.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button size="lg" onClick={() => scrollTo("contacto")}>
            Solicitar información
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => scrollTo("funcionalidades")}
          >
            Ver funcionalidades
          </Button>
        </div>
      </section>

      <Separator />

      {/* ── Qué resuelve ── */}
      <section className="container py-16 md:py-20">
        <h2 className="mb-12 text-center text-3xl font-bold">Qué resuelve</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {solves.map((s) => (
            <Card key={s.title} className="border-border">
              <CardContent className="flex flex-col gap-3 p-6">
                <s.icon className="h-8 w-8 text-primary" />
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator />

      {/* ── Funcionalidades principales ── */}
      <section id="funcionalidades" className="container py-16 md:py-20">
        <h2 className="mb-10 text-center text-3xl font-bold">
          Funcionalidades principales
        </h2>
        <ul className="mx-auto max-w-xl space-y-4">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <span className="text-base">{f}</span>
            </li>
          ))}
        </ul>
      </section>

      <Separator />

      {/* ── Cómo funciona ── */}
      <section className="container py-16 md:py-20">
        <h2 className="mb-12 text-center text-3xl font-bold">Cómo funciona</h2>
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((st) => (
            <div key={st.num} className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold">
                {st.num}
              </div>
              <h3 className="mt-4 text-lg font-semibold">{st.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{st.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      {/* ── Modelo de servicio ── */}
      <section className="container py-16 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-6 text-3xl font-bold">Modelo de servicio</h2>
          <p className="text-muted-foreground">
            AgendixPro se ofrece como un servicio con mantenimiento mensual y
            soporte incluido. El equipo de desarrollo acompaña a cada clínica
            con actualizaciones, ajustes de configuración y asistencia continua
            para que el sistema funcione de manera óptima en todo momento.
          </p>
        </div>
      </section>

      <Separator />

      {/* ── Contacto ── */}
      <section id="contacto" className="container py-16 md:py-20">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="mb-6 text-3xl font-bold">Contacto</h2>
          <p className="mb-8 text-muted-foreground">
            Contáctanos para conocer disponibilidad, alcance y condiciones del
            servicio.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href="mailto:agendixpro@gmail.com"
              className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              <Mail className="h-4 w-4" />
              agendixpro@gmail.com
            </a>
            <a
              href="https://wa.me/12262244099"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                <MessageCircle className="mr-2 h-4 w-4" />
                WhatsApp
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t bg-muted/50 py-8">
        <div className="container flex flex-col items-center gap-4 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} AgendixPro. Todos los derechos reservados.</span>
          <nav className="flex flex-wrap justify-center gap-4">
            <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link to="/contact" className="hover:text-foreground">Contacto</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacidad</Link>
            <Link to="/terms" className="hover:text-foreground">Términos</Link>
            <Link to="/cancellation-policy" className="hover:text-foreground">Cancelación y Reembolsos</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
