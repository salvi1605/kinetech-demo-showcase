import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar } from "lucide-react";

export function Terms() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/welcome" className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Agendix</span>
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/welcome">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Link>
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-3xl py-12">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Términos de Servicio</CardTitle>
            <p className="text-sm text-muted-foreground">
              Última actualización: Enero 2026
            </p>
          </CardHeader>
          <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
            <h2>1. Aceptación de los Términos</h2>
            <p>
              Al acceder y utilizar Agendix ("el Servicio"), usted acepta estar 
              sujeto a estos Términos de Servicio. Si no está de acuerdo con alguna 
              parte de los términos, no podrá acceder al Servicio.
            </p>

            <h2>2. Descripción del Servicio</h2>
            <p>
              Agendix es una plataforma de gestión de turnos diseñada para 
              clínicas de kinesiología y profesionales de la salud. El servicio incluye:
            </p>
            <ul>
              <li>Gestión de agenda y turnos</li>
              <li>Administración de pacientes</li>
              <li>Historial clínico digital</li>
              <li>Control de disponibilidad profesional</li>
            </ul>

            <h2>3. Cuentas de Usuario</h2>
            <p>
              Para utilizar el Servicio, debe crear una cuenta proporcionando 
              información precisa y completa. Usted es responsable de mantener 
              la confidencialidad de su contraseña y de todas las actividades 
              que ocurran bajo su cuenta.
            </p>

            <h2>4. Uso Aceptable</h2>
            <p>Usted se compromete a:</p>
            <ul>
              <li>Usar el Servicio solo para fines legales</li>
              <li>No intentar acceder a cuentas de otros usuarios</li>
              <li>No transmitir virus o código malicioso</li>
              <li>Cumplir con todas las leyes y regulaciones aplicables</li>
            </ul>

            <h2>5. Privacidad y Datos</h2>
            <p>
              El tratamiento de datos personales se rige por nuestra{" "}
              <Link to="/privacy" className="text-primary hover:underline">
                Política de Privacidad
              </Link>
              . Al usar el Servicio, usted consiente el procesamiento de sus 
              datos de acuerdo con dicha política.
            </p>

            <h2>6. Propiedad Intelectual</h2>
            <p>
              El Servicio y su contenido original, características y funcionalidad 
              son propiedad de Agendix y están protegidos por leyes de 
              derechos de autor y marcas registradas.
            </p>

            <h2>7. Limitación de Responsabilidad</h2>
            <p>
              En ningún caso Agendix será responsable por daños indirectos, 
              incidentales, especiales o consecuentes que resulten del uso o la 
              imposibilidad de usar el Servicio.
            </p>

            <h2>8. Modificaciones</h2>
            <p>
              Nos reservamos el derecho de modificar estos términos en cualquier 
              momento. Los cambios entrarán en vigor inmediatamente después de 
              su publicación en el Servicio.
            </p>

            <h2>9. Contacto</h2>
            <p>
              Si tiene preguntas sobre estos Términos, contáctenos a través de 
              los canales de soporte disponibles en la plataforma.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default Terms;
