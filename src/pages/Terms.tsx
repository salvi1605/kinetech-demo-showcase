import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";

export function Terms() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/home" className="text-lg font-bold tracking-tight text-primary">
            AgendixPro
          </Link>
          <nav className="flex items-center gap-4">
            <Link to="/home" className="text-sm text-muted-foreground hover:text-foreground">Inicio</Link>
            <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground">Pricing</Link>
            <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground">Contacto</Link>
            <Link to="/login">
              <Button size="sm">Iniciar sesión</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-3xl py-12 md:py-16">
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link to="/home">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al inicio
            </Link>
          </Button>
        </div>

        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Términos del Servicio</h1>
        <p className="mt-2 text-sm text-muted-foreground">Última actualización: 7 de marzo de 2026</p>

        <Separator className="my-8" />

        <div className="space-y-8 text-[0.95rem] leading-relaxed text-foreground/90">
          {/* Introducción */}
          <section>
            <p>
              AgendixPro ofrece acceso a una plataforma web para gestión de agenda clínica y servicios
              de mantenimiento según el plan contratado. Al utilizar el servicio, el cliente acepta las
              condiciones descritas en este documento. Si no está de acuerdo con alguna de ellas,
              no debe utilizar la plataforma.
            </p>
          </section>

          {/* 1. Uso general */}
          <section>
            <h2 className="mb-3 text-xl font-semibold">1. Uso general del servicio</h2>
            <p>
              AgendixPro proporciona una herramienta web para organizar turnos, gestionar información
              de pacientes, configurar disponibilidad de profesionales y realizar seguimiento operativo
              de la clínica. El acceso se otorga mediante cuentas individuales con credenciales seguras.
            </p>
            <p className="mt-3">
              El servicio está destinado a clínicas, profesionales de salud y personal administrativo
              que necesiten gestionar su operación diaria de forma digital.
            </p>
          </section>

          {/* 2. Responsabilidades del cliente */}
          <section>
            <h2 className="mb-3 text-xl font-semibold">2. Responsabilidades del cliente</h2>
            <p className="mb-3">Al utilizar AgendixPro, el cliente se compromete a:</p>
            <ul className="list-disc space-y-1 pl-6 text-muted-foreground">
              <li>Proporcionar información veraz al crear su cuenta y configurar la clínica</li>
              <li>Mantener la confidencialidad de sus credenciales de acceso</li>
              <li>Utilizar la plataforma conforme a las leyes y regulaciones aplicables en su jurisdicción</li>
              <li>Asumir la responsabilidad sobre los datos que registra, especialmente información de pacientes</li>
              <li>No intentar acceder a cuentas o datos de otros usuarios</li>
            </ul>
            <p className="mt-3">
              AgendixPro proporciona la herramienta; el uso adecuado de la información y el cumplimiento
              de normativas de salud o protección de datos es responsabilidad del cliente.
            </p>
          </section>

          {/* 3. Alcance del mantenimiento mensual */}
          <section>
            <h2 className="mb-3 text-xl font-semibold">3. Alcance del mantenimiento mensual</h2>
            <p className="mb-3">El plan contratado incluye:</p>
            <ul className="list-disc space-y-1 pl-6 text-muted-foreground">
              <li>Acceso continuo a la plataforma web</li>
              <li>Soporte operativo para consultas y resolución de incidencias</li>
              <li>Mantenimiento técnico de la infraestructura</li>
              <li>Ajustes menores de configuración dentro del alcance acordado</li>
            </ul>
            <p className="mt-3">
              Desarrollos adicionales, integraciones externas no acordadas previamente o trabajos fuera
              del alcance definido en el plan no están incluidos y podrán cotizarse por separado.
            </p>
          </section>

          {/* 4. Limitaciones del servicio */}
          <section>
            <h2 className="mb-3 text-xl font-semibold">4. Limitaciones del servicio</h2>
            <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
              <li>
                AgendixPro no garantiza disponibilidad ininterrumpida. Pueden existir períodos de
                mantenimiento o situaciones técnicas que afecten temporalmente el acceso.
              </li>
              <li>
                No somos responsables por pérdidas derivadas de la imposibilidad de acceder al servicio,
                interrupciones temporales o errores en la plataforma.
              </li>
              <li>
                El cliente entiende que la plataforma es una herramienta de gestión y no sustituye
                el criterio profesional en decisiones clínicas.
              </li>
            </ul>
          </section>

          {/* 5. Privacidad */}
          <section>
            <h2 className="mb-3 text-xl font-semibold">5. Privacidad y datos</h2>
            <p>
              El tratamiento de datos personales se rige por nuestra{" "}
              <Link to="/privacy" className="font-medium text-primary hover:underline">
                Política de Privacidad
              </Link>
              . Al usar el servicio, el cliente acepta el procesamiento de información
              de acuerdo con dicha política.
            </p>
          </section>

          {/* 6. Cambios al servicio */}
          <section>
            <h2 className="mb-3 text-xl font-semibold">6. Cambios al servicio y a estos términos</h2>
            <p>
              Podemos actualizar funcionalidades de la plataforma o estos términos periódicamente.
              Los cambios relevantes se comunicarán con anticipación razonable a través de la plataforma
              o por correo electrónico. El uso continuado del servicio tras la notificación de cambios
              implica la aceptación de los mismos.
            </p>
          </section>

          {/* 7. Cancelación y Reembolsos */}
          <section id="cancelacion" className="rounded-lg border bg-muted/30 p-6">
            <h2 className="mb-4 text-xl font-semibold">7. Cancelación y Reembolsos</h2>

            <div className="space-y-4">
              <div>
                <h3 className="mb-1 font-medium">Solicitud de cancelación</h3>
                <p className="text-muted-foreground">
                  El cliente puede solicitar la cancelación del servicio en cualquier momento comunicándose
                  con nuestro equipo de soporte por correo electrónico o WhatsApp.
                </p>
              </div>

              <div>
                <h3 className="mb-1 font-medium">Vigencia de la cancelación</h3>
                <p className="text-muted-foreground">
                  La cancelación se hace efectiva al finalizar el período de facturación en curso.
                  El cliente mantiene acceso al servicio hasta ese momento.
                </p>
              </div>

              <div>
                <h3 className="mb-1 font-medium">Reembolsos</h3>
                <p className="text-muted-foreground">
                  Los pagos correspondientes al período de facturación en curso no son reembolsables.
                  La cancelación aplica hacia futuros períodos y no genera cargos adicionales una vez
                  procesada.
                </p>
              </div>

              <div>
                <h3 className="mb-1 font-medium">Errores de cobro</h3>
                <p className="text-muted-foreground">
                  Si el cliente identifica un error de cobro comprobable, puede contactar a soporte
                  para solicitar una revisión. Si se confirma el error, se procederá al ajuste o
                  reembolso correspondiente.
                </p>
              </div>

              <div>
                <h3 className="mb-1 font-medium">Datos tras la cancelación</h3>
                <p className="text-muted-foreground">
                  Tras la cancelación, los datos se conservarán por un período razonable según lo
                  indicado en nuestra Política de Privacidad, después del cual podrán ser eliminados.
                </p>
              </div>
            </div>
          </section>

          {/* 8. Contacto */}
          <section>
            <h2 className="mb-3 text-xl font-semibold">8. Contacto</h2>
            <p>
              Para consultas sobre estos términos, cancelaciones o cualquier aspecto del servicio,
              puedes escribirnos a{" "}
              <a href="mailto:agendixpro@gmail.com" className="font-medium text-primary hover:underline">
                agendixpro@gmail.com
              </a>{" "}
              o contactarnos por{" "}
              <a
                href="https://wa.me/12262244099"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
              >
                WhatsApp
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/50 py-8">
        <div className="container flex flex-col items-center gap-4 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} AgendixPro. Todos los derechos reservados.</span>
          <nav className="flex flex-wrap justify-center gap-4">
            <Link to="/home" className="hover:text-foreground">Inicio</Link>
            <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link to="/contact" className="hover:text-foreground">Contacto</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacidad</Link>
            <Link to="/cancellation-policy" className="hover:text-foreground">Cancelación y Reembolsos</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

export default Terms;
