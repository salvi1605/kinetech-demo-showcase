import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar } from "lucide-react";

export function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/welcome" className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">KinesioTurnos</span>
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
            <CardTitle className="text-3xl">Política de Privacidad</CardTitle>
            <p className="text-sm text-muted-foreground">
              Última actualización: Enero 2026
            </p>
          </CardHeader>
          <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
            <h2>1. Información que Recopilamos</h2>
            <p>Recopilamos los siguientes tipos de información:</p>
            
            <h3>Información de Cuenta</h3>
            <ul>
              <li>Nombre completo y datos de contacto</li>
              <li>Correo electrónico</li>
              <li>Información de la clínica (nombre, dirección)</li>
            </ul>

            <h3>Información de Pacientes</h3>
            <ul>
              <li>Datos personales (nombre, fecha de nacimiento, documento)</li>
              <li>Información de contacto y emergencia</li>
              <li>Datos de obra social y cobertura</li>
              <li>Historial clínico y notas de evolución</li>
            </ul>

            <h3>Información de Uso</h3>
            <ul>
              <li>Registros de acceso y actividad</li>
              <li>Datos de dispositivo y navegador</li>
              <li>Preferencias de configuración</li>
            </ul>

            <h2>2. Cómo Usamos la Información</h2>
            <p>Utilizamos la información recopilada para:</p>
            <ul>
              <li>Proporcionar y mantener el Servicio</li>
              <li>Gestionar cuentas de usuario y autenticación</li>
              <li>Procesar y almacenar datos de turnos y pacientes</li>
              <li>Enviar notificaciones relacionadas con el servicio</li>
              <li>Mejorar y optimizar la plataforma</li>
              <li>Cumplir con obligaciones legales</li>
            </ul>

            <h2>3. Protección de Datos</h2>
            <p>
              Implementamos medidas de seguridad técnicas y organizativas para 
              proteger sus datos, incluyendo:
            </p>
            <ul>
              <li>Cifrado de datos en tránsito (HTTPS/TLS)</li>
              <li>Cifrado de datos en reposo</li>
              <li>Control de acceso basado en roles (RLS)</li>
              <li>Autenticación segura con contraseñas hasheadas</li>
              <li>Auditoría de accesos y cambios</li>
            </ul>

            <h2>4. Compartir Información</h2>
            <p>
              No vendemos ni alquilamos su información personal. Solo compartimos 
              datos en los siguientes casos:
            </p>
            <ul>
              <li>Con su consentimiento explícito</li>
              <li>Para cumplir con requerimientos legales</li>
              <li>Con proveedores de servicios que procesan datos en nuestro nombre</li>
            </ul>

            <h2>5. Retención de Datos</h2>
            <p>
              Conservamos sus datos mientras su cuenta esté activa o según sea 
              necesario para proporcionarle servicios. Los datos de pacientes 
              se conservan según las regulaciones de registros médicos aplicables.
            </p>

            <h2>6. Sus Derechos</h2>
            <p>Usted tiene derecho a:</p>
            <ul>
              <li>Acceder a sus datos personales</li>
              <li>Rectificar datos inexactos</li>
              <li>Solicitar la eliminación de sus datos</li>
              <li>Oponerse al procesamiento de sus datos</li>
              <li>Exportar sus datos en formato portable</li>
            </ul>

            <h2>7. Cookies y Tecnologías Similares</h2>
            <p>
              Utilizamos cookies esenciales para el funcionamiento del Servicio, 
              incluyendo autenticación y preferencias de sesión. No utilizamos 
              cookies de seguimiento publicitario.
            </p>

            <h2>8. Cambios a esta Política</h2>
            <p>
              Podemos actualizar esta Política de Privacidad periódicamente. 
              Le notificaremos sobre cambios significativos publicando la nueva 
              política en esta página.
            </p>

            <h2>9. Contacto</h2>
            <p>
              Para consultas sobre privacidad, puede contactarnos a través de 
              los canales de soporte disponibles en la plataforma.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default Privacy;
