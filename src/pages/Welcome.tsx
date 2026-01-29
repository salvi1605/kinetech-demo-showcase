import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, Clock, Shield, BarChart3, Smartphone } from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Agenda Inteligente",
    description: "Gestiona turnos con vista semanal, filtros por profesional y múltiples sub-slots por bloque."
  },
  {
    icon: Users,
    title: "Gestión de Pacientes",
    description: "Historial clínico completo, documentos, notas de evolución y datos de obra social."
  },
  {
    icon: Clock,
    title: "Disponibilidad Flexible",
    description: "Configura horarios por profesional, excepciones y feriados personalizados."
  },
  {
    icon: Shield,
    title: "Seguridad Empresarial",
    description: "Multi-tenancy, roles granulares (admin, recepcionista, profesional) y RLS en base de datos."
  },
  {
    icon: BarChart3,
    title: "Reportes y Métricas",
    description: "Visualiza estadísticas de turnos, no-shows y ocupación por período."
  },
  {
    icon: Smartphone,
    title: "Diseño Responsive",
    description: "Funciona perfectamente en desktop, tablet y móvil con navegación optimizada."
  }
];

export function Welcome() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Agendix</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground">
              Términos
            </Link>
            <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
              Privacidad
            </Link>
            <Button asChild variant="outline" size="sm">
              <Link to="/login">Iniciar Sesión</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Gestión de Turnos{" "}
          <span className="text-primary">Profesional</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Sistema completo para clínicas y consultorios. Agenda turnos, gestiona pacientes, 
          controla disponibilidad y mantén el historial clínico en un solo lugar.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Button asChild size="lg">
            <Link to="/login">Comenzar Gratis</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/login">Ver Demo</Link>
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container py-16">
        <h2 className="mb-12 text-center text-3xl font-bold">
          Todo lo que necesitas para tu clínica
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="border-muted">
              <CardHeader>
                <feature.icon className="h-10 w-10 text-primary" />
                <CardTitle className="mt-4">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-16">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="flex flex-col items-center gap-6 py-12 text-center">
            <h2 className="text-3xl font-bold">¿Listo para optimizar tu clínica?</h2>
            <p className="max-w-xl text-primary-foreground/80">
              Únete a profesionales de la salud que ya gestionan sus turnos de forma eficiente.
            </p>
            <Button asChild size="lg" variant="secondary">
              <Link to="/login">Crear Cuenta Gratis</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/50 py-8">
        <div className="container flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>© 2026 Agendix. Todos los derechos reservados.</span>
          </div>
          <nav className="flex gap-6 text-sm text-muted-foreground">
            <Link to="/terms" className="hover:text-foreground">Términos</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacidad</Link>
            <Link to="/login" className="hover:text-foreground">Acceder</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

export default Welcome;
