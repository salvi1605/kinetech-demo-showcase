import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";

export function Terms() {
  return (
    <PublicLayout>
      <div className="container max-w-3xl py-12 md:py-16">
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
          <section>
            <p>
              AgendixPro ofrece acceso a una plataforma web para gestión de agenda clínica y servicios
              de mantenimiento según el plan contratado. Al utilizar el servicio, el cliente acepta las
              condiciones descritas en este documento. Si no está de acuerdo con alguna de ellas,
              no debe utilizar la plataforma.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">1. Uso general del servicio</h2>
            <p>
              AgendixPro proporciona herramientas para organizar turnos, registrar pacientes,
              gestionar disponibilidad de profesionales y realizar seguimiento operativo dentro de
              clínicas y consultorios de salud. El acceso se otorga mediante cuentas de usuario
              individuales asociadas a una clínica registrada en la plataforma.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">2. Responsabilidades del cliente</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Usar la plataforma conforme a las leyes y regulaciones aplicables en su jurisdicción.</li>
              <li>Mantener la confidencialidad de sus credenciales de acceso.</li>
              <li>No compartir cuentas de usuario entre personas diferentes.</li>
              <li>Asegurarse de que la información registrada (pacientes, turnos, etc.) sea precisa y esté debidamente autorizada.</li>
              <li>Cumplir con sus propias obligaciones profesionales y normativas de salud según corresponda.</li>
            </ul>
            <p className="mt-3 text-sm text-muted-foreground italic">
              AgendixPro no se responsabiliza por el uso indebido de la plataforma ni por el incumplimiento
              de regulaciones locales por parte del cliente.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">3. Alcance del mantenimiento mensual</h2>
            <p>
              El plan mensual incluye acceso a la plataforma, mantenimiento técnico general,
              corrección de errores dentro del alcance existente, ajustes menores de configuración
              y soporte operativo básico. El alcance específico del mantenimiento se define al
              momento de la contratación y puede variar según el plan acordado.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              No se incluyen desarrollos de funcionalidades nuevas fuera del alcance acordado,
              integraciones con sistemas externos no contempladas, ni trabajo adicional sin
              acuerdo previo.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">4. Limitaciones del servicio</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>AgendixPro es una herramienta de gestión operativa; no constituye software médico certificado ni reemplaza el criterio profesional.</li>
              <li>No garantizamos disponibilidad ininterrumpida del servicio. Si bien trabajamos para mantener la plataforma operativa, pueden ocurrir interrupciones por mantenimiento o causas externas.</li>
              <li>No nos hacemos responsables por pérdidas derivadas del uso o imposibilidad de uso de la plataforma.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">5. Privacidad y datos</h2>
            <p>
              El tratamiento de datos personales se rige por nuestra{" "}
              <Link to="/privacy" className="font-medium text-primary hover:underline">
                Política de Privacidad
              </Link>
              . Al utilizar AgendixPro, el cliente acepta los términos descritos en dicha política.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">6. Cambios al servicio</h2>
            <p>
              AgendixPro se reserva el derecho de modificar funcionalidades, precios o condiciones
              del servicio. Los cambios relevantes serán comunicados con anticipación razonable.
              El uso continuado de la plataforma después de un cambio implica la aceptación
              de las nuevas condiciones.
            </p>
          </section>

          <section id="cancelacion" className="rounded-lg border bg-muted/30 p-6">
            <h2 className="mb-4 text-xl font-semibold">7. Cancelación y Reembolsos</h2>
            <div className="space-y-4 text-muted-foreground">
              <div>
                <h3 className="mb-1 font-medium text-foreground">Cancelación</h3>
                <p>
                  El cliente puede solicitar la cancelación de su suscripción en cualquier momento
                  contactando al equipo de soporte. La cancelación se aplicará a los futuros períodos
                  de facturación; el acceso al servicio se mantendrá activo hasta el final del
                  período en curso ya pagado.
                </p>
              </div>
              <div>
                <h3 className="mb-1 font-medium text-foreground">Reembolsos</h3>
                <p>
                  Los pagos ya procesados correspondientes al período de facturación en curso
                  no son reembolsables, salvo en caso de error de cobro comprobable.
                  Si el cliente identifica un cobro incorrecto, puede contactar a soporte para
                  que se realice una revisión del caso.
                </p>
              </div>
              <div>
                <h3 className="mb-1 font-medium text-foreground">Datos tras cancelación</h3>
                <p>
                  Una vez cancelado el servicio, los datos del cliente se conservarán durante
                  un plazo razonable para facilitar una eventual reactivación o exportación.
                  Pasado ese plazo, los datos podrán ser eliminados de forma permanente.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">8. Contacto</h2>
            <p>
              Para cualquier consulta sobre estos términos, puedes escribirnos a{" "}
              <a
                href="mailto:agendixpro@gmail.com"
                className="font-medium text-primary hover:underline"
              >
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
      </div>
    </PublicLayout>
  );
}

export default Terms;
