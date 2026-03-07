import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  MessageCircle,
  Mail,
  Send,
  FileCheck,
  Zap,
} from "lucide-react";

const included = [
  "Acceso a la plataforma web",
  "Gestión de agenda y turnos",
  "Gestión básica de pacientes",
  "Soporte operativo",
  "Mantenimiento mensual",
  "Ajustes menores dentro del alcance acordado",
];

const notIncluded = [
  "Desarrollos grandes nuevos",
  "Integraciones externas no acordadas",
  "Trabajo fuera del alcance definido",
];

const steps = [
  {
    icon: Send,
    num: "1",
    title: "Contacto inicial",
    desc: "Escribinos por WhatsApp o email para contarnos las necesidades de tu clínica.",
  },
  {
    icon: FileCheck,
    num: "2",
    title: "Confirmación del alcance",
    desc: "Definimos juntos el alcance del servicio, funcionalidades incluidas y condiciones.",
  },
  {
    icon: Zap,
    num: "3",
    title: "Activación y cobro mensual",
    desc: "Activamos la plataforma y comienza el servicio con facturación mensual en USD.",
  },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/home" className="text-xl font-bold tracking-tight">
            AgendixPro
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/home">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Link>
          </Button>
        </div>
      </header>

      {/* Encabezado */}
      <section className="container py-16 text-center md:py-24">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          Planes y servicio
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          AgendixPro ofrece software de gestión clínica con mantenimiento y
          soporte continuo.
        </p>
      </section>

      {/* Tarjeta de plan */}
      <section className="container pb-16">
        <Card className="mx-auto max-w-lg border-primary/30">
          <CardContent className="p-8">
            <p className="text-sm font-medium uppercase tracking-wider text-primary">
              Plan Clínica
            </p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold">USD 100</span>
              <span className="text-muted-foreground">/ mes</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Precio inicial para clínica fundadora. Sujeto a ajuste en futuras
              versiones comerciales.
            </p>

            <Separator className="my-6" />

            <h3 className="mb-4 text-sm font-semibold">Qué incluye</h3>
            <ul className="space-y-3">
              {included.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>

            <Separator className="my-6" />

            <h3 className="mb-4 text-sm font-semibold">
              Qué no incluye por defecto
            </h3>
            <ul className="space-y-3">
              {notIncluded.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>

            <Separator className="my-6" />

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="flex-1">
                <a
                  href="https://wa.me/12262244099"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Hablar por WhatsApp
                </a>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <a href="mailto:agendixpro@gmail.com">
                  <Mail className="mr-2 h-4 w-4" />
                  Escribir por email
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Cómo se contrata */}
      <section className="border-t bg-muted/30 py-16">
        <div className="container">
          <h2 className="mb-12 text-center text-2xl font-bold sm:text-3xl">
            Cómo se contrata
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((st) => (
              <div
                key={st.num}
                className="flex flex-col items-center text-center"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold">
                  {st.num}
                </div>
                <h3 className="mt-4 text-lg font-semibold">{st.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {st.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/50 py-8">
        <div className="container flex flex-col items-center gap-4 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <span>
            © {new Date().getFullYear()} AgendixPro. Todos los derechos
            reservados.
          </span>
          <nav className="flex flex-wrap justify-center gap-4">
            <Link to="/home" className="hover:text-foreground">Inicio</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacidad</Link>
            <Link to="/terms" className="hover:text-foreground">Términos</Link>
            <Link to="/cancellation-policy" className="hover:text-foreground">
              Cancelación y Reembolsos
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
