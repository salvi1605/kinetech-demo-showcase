import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";

export function Privacy() {
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

        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Política de Privacidad</h1>
        <p className="mt-2 text-sm text-muted-foreground">Última actualización: 7 de marzo de 2026</p>

        <Separator className="my-8" />

        <div className="space-y-8 text-[0.95rem] leading-relaxed text-foreground/90">
          <section>
            <p>
              AgendixPro es una plataforma web diseñada para la gestión de agenda y operación de clínicas de salud.
              Para poder ofrecer el servicio, recopilamos cierta información básica de los usuarios y de los datos
              que estos registran dentro de la plataforma. Esta política describe de forma sencilla qué información
              manejamos, cómo la usamos y cómo la protegemos.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">1. Información que recopilamos</h2>
            <div className="space-y-4">
              <div>
                <h3 className="mb-1 font-medium">Información de cuenta</h3>
                <p className="text-muted-foreground">
                  Al registrarse, se solicita nombre, dirección de email y nombre de la clínica o consultorio.
                  Esta información es necesaria para crear y administrar la cuenta del usuario.
                </p>
              </div>
              <div>
                <h3 className="mb-1 font-medium">Información registrada por el usuario</h3>
                <p className="text-muted-foreground">
                  Los usuarios pueden registrar datos de pacientes, turnos, notas clínicas, documentos y
                  configuraciones operativas. AgendixPro almacena esta información en nombre del usuario
                  para el funcionamiento del servicio.
                </p>
              </div>
              <div>
                <h3 className="mb-1 font-medium">Información técnica</h3>
                <p className="text-muted-foreground">
                  Podemos recopilar información técnica básica como tipo de navegador, sistema operativo
                  y cookies esenciales para el funcionamiento de la plataforma.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">2. Uso de la información</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Proveer y mantener el funcionamiento de la plataforma.</li>
              <li>Gestionar cuentas de usuario y accesos.</li>
              <li>Comunicar actualizaciones relevantes del servicio.</li>
              <li>Responder consultas de soporte.</li>
            </ul>
            <p className="mt-3 text-sm text-muted-foreground italic">
              No vendemos, alquilamos ni compartimos información personal con terceros con fines
              comerciales o publicitarios.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">3. Almacenamiento y seguridad</h2>
            <p className="text-muted-foreground">
              La información se almacena en servidores seguros con conexiones cifradas (HTTPS).
              Implementamos medidas técnicas razonables para proteger los datos, incluyendo
              cifrado en tránsito, control de acceso basado en roles y políticas de seguridad
              a nivel de base de datos.
            </p>
            <p className="mt-2 text-sm text-muted-foreground italic">
              Si bien tomamos precauciones razonables, ningún sistema es completamente inmune
              a riesgos de seguridad.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">4. Proveedores externos</h2>
            <p className="text-muted-foreground">
              AgendixPro puede utilizar servicios de terceros para infraestructura, procesamiento
              de pagos o funcionalidades específicas. Estos proveedores están sujetos a sus
              propias políticas de privacidad. Seleccionamos proveedores que ofrezcan niveles
              razonables de seguridad y protección de datos.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">5. Retención de datos</h2>
            <p className="text-muted-foreground">
              Los datos se conservan mientras la cuenta del usuario esté activa y el servicio
              esté contratado. Tras la cancelación del servicio, los datos se conservarán durante
              un plazo razonable para facilitar reactivación o exportación, y luego podrán ser
              eliminados permanentemente.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">6. Responsabilidad del usuario</h2>
            <p className="text-muted-foreground">
              El usuario es responsable de utilizar la plataforma conforme a las leyes y regulaciones
              aplicables en su jurisdicción, incluyendo normativas de protección de datos de salud
              que pudieran aplicar. AgendixPro proporciona herramientas de gestión, pero la
              responsabilidad sobre el tratamiento de datos sensibles recae en el usuario o la
              institución que opera la plataforma.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">7. Cambios a esta política</h2>
            <p className="text-muted-foreground">
              Podemos actualizar esta política de privacidad periódicamente. Los cambios relevantes
              serán comunicados a través de la plataforma o por email. El uso continuado del servicio
              después de una actualización implica la aceptación de los nuevos términos.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">8. Contacto para consultas de privacidad</h2>
            <p>
              Para cualquier consulta relacionada con esta política o con el tratamiento de tus datos,
              puedes escribirnos a{" "}
              <a href="mailto:agendixpro@gmail.com" className="font-medium text-primary hover:underline">
                agendixpro@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}

export default Privacy;
