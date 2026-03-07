import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, ArrowLeft } from "lucide-react";

const included = [
  "Plataforma web completa para gestión de turnos y pacientes",
  "Configuración inicial personalizada",
  "Acceso para todo el equipo con roles diferenciados",
  "Soporte técnico y funcional continuo",
  "Actualizaciones y mejoras incluidas",
  "Respaldo y seguridad de datos",
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/home" className="text-xl font-bold tracking-tight">AgendixPro</Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/home"><ArrowLeft className="mr-2 h-4 w-4" />Volver</Link>
          </Button>
        </div>
      </header>

      <main className="container py-16 md:py-24">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-3xl font-bold sm:text-4xl">Modelo de servicio y precios</h1>
          <p className="mt-4 text-muted-foreground">
            AgendixPro se ofrece como un servicio integral con suscripción mensual.
            El precio se define según el tamaño de la clínica, la cantidad de
            profesionales y las necesidades específicas de cada equipo.
          </p>

          <Card className="mt-10 border-border">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Qué incluye el servicio</h2>
              <ul className="space-y-3">
                {included.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <p className="mt-8 text-sm text-muted-foreground">
            Para conocer tarifas y condiciones específicas, escribinos a{" "}
            <a href="mailto:contacto@agendixpro.com" className="text-primary hover:underline">
              contacto@agendixpro.com
            </a>{" "}
            o por WhatsApp.
          </p>
        </div>
      </main>

      <footer className="border-t bg-muted/50 py-6">
        <div className="container text-center text-sm text-muted-foreground">
          <Link to="/home" className="hover:text-foreground">← Volver a AgendixPro</Link>
        </div>
      </footer>
    </div>
  );
}
