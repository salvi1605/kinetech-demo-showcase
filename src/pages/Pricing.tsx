import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  XCircle,
  MessageCircle,
  Mail,
  Send,
  FileCheck,
  Zap,
} from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";

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
    <PublicLayout>
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
            <p className="mt-2 text-sm text-muted-foreground">
              Acceso completo a la plataforma + mantenimiento mensual.
            </p>

            <Separator className="my-6" />

            <p className="mb-3 text-sm font-semibold">Incluye:</p>
            <ul className="space-y-2">
              {included.map((i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="text-muted-foreground">{i}</span>
                </li>
              ))}
            </ul>

            <Separator className="my-6" />

            <p className="mb-3 text-sm font-semibold">No incluye:</p>
            <ul className="space-y-2">
              {notIncluded.map((n) => (
                <li key={n} className="flex items-start gap-2 text-sm">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive/70" />
                  <span className="text-muted-foreground">{n}</span>
                </li>
              ))}
            </ul>

            <Separator className="my-6" />

            <div className="flex flex-col items-center gap-3">
              <a
                href="https://wa.me/12262244099"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button className="w-full" size="lg">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Contactar por WhatsApp
                </Button>
              </a>
              <a
                href="mailto:agendixpro@gmail.com"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="h-4 w-4" />
                Mándanos un Correo
              </a>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Cómo empezar */}
      <section className="bg-muted/30 py-16">
        <div className="container">
          <h2 className="mb-12 text-center text-2xl font-bold">
            ¿Cómo empezar?
          </h2>
          <div className="mx-auto grid max-w-3xl gap-10 md:grid-cols-3">
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
    </PublicLayout>
  );
}
