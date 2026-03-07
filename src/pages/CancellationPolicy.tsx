import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";

export default function CancellationPolicy() {
  return (
    <PublicLayout>
      <main className="container py-16 md:py-24">
        <article className="prose prose-neutral dark:prose-invert mx-auto max-w-2xl">
          <div className="mb-6 not-prose">
            <Button asChild variant="ghost" size="sm">
              <Link to="/home">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al inicio
              </Link>
            </Button>
          </div>

          <h1>Política de Cancelación y Reembolsos</h1>
          <p className="text-muted-foreground">Última actualización: marzo 2026</p>

          <h2>1. Cancelación del servicio</h2>
          <p>
            El cliente puede cancelar su suscripción a AgendixPro en cualquier momento
            notificando por escrito al equipo de soporte con al menos 15 días de
            anticipación al próximo período de facturación.
          </p>

          <h2>2. Efecto de la cancelación</h2>
          <p>
            Una vez procesada la cancelación, el acceso al sistema se mantendrá activo
            hasta el final del período ya facturado. No se realizarán cobros adicionales
            a partir de la fecha efectiva de cancelación.
          </p>

          <h2>3. Reembolsos</h2>
          <p>
            Los pagos realizados corresponden al período de servicio contratado y no son
            reembolsables de forma parcial. En caso de circunstancias excepcionales, el
            equipo de AgendixPro evaluará cada solicitud de forma individual.
          </p>

          <h2>4. Datos del cliente</h2>
          <p>
            Tras la cancelación, los datos del cliente se conservarán durante un plazo
            de 30 días para facilitar la exportación o reactivación. Luego de ese
            período, los datos serán eliminados de forma permanente, salvo obligación
            legal que indique lo contrario.
          </p>

          <h2>5. Contacto</h2>
          <p>
            Para solicitar una cancelación o consultar sobre reembolsos, escribí a{" "}
            <a href="mailto:agendixpro@gmail.com" className="text-primary hover:underline">
              agendixpro@gmail.com
            </a>.
          </p>
        </article>
      </main>
    </PublicLayout>
  );
}
