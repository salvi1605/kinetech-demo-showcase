import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";

export function Privacy() {
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

        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Política de Privacidad</h1>
        <p className="mt-2 text-sm text-muted-foreground">Última actualización: 7 de marzo de 2026</p>

        <Separator className="my-8" />

        <div className="space-y-8 text-[0.95rem] leading-relaxed text-foreground/90">
          {/* Introducción */}
          <section>
            <p>
              AgendixPro es una plataforma web diseñada para la gestión de agenda y operación de clínicas de salud.
              Para poder ofrecer el servicio, recopilamos cierta información básica de los usuarios y de los datos
              que estos registran dentro de la plataforma. Esta política describe de forma sencilla qué información
              manejamos, cómo la usamos y cómo la protegemos.
            </p>
          </section>

          {/* 1. Información que se recopila */}
          <section>
            <h2 className="mb-3 text-xl font-semibold">1. Información que recopilamos</h2>
            <p className="mb-3">Recopilamos únicamente la información necesaria para operar el servicio:</p>

            <h3 className="mb-2 font-medium">Información de cuenta</h3>
            <ul className="mb-4 list-disc space-y-1 pl-6 text-muted-foreground">
              <li>Nombre del usuario y datos de contacto (correo electrónico, teléfono)</li>
              <li>Nombre de la clínica o empresa</li>
              <li>Credenciales de acceso (la contraseña se almacena de forma cifrada y no es visible para nosotros)</li>
            </ul>

            <h3 className="mb-2 font-medium">Información registrada por el usuario</h3>
            <ul className="mb-4 list-disc space-y-1 pl-6 text-muted-foreground">
              <li>Datos de pacientes que el usuario carga en la plataforma (nombre, contacto, información clínica básica)</li>
              <li>Turnos, notas y registros operativos</li>
              <li>Configuraciones y preferencias de la clínica</li>
            </ul>

            <h3 className="mb-2 font-medium">Información técnica</h3>
            <ul className="list-disc space-y-1 pl-6 text-muted-foreground">
              <li>Datos básicos de navegación (tipo de dispositivo, navegador) para mejorar el funcionamiento del servicio</li>
              <li>Cookies esenciales para autenticación y sesión; no utilizamos cookies publicitarias</li>
            </ul>
          </section>

          {/* 2. Uso de la información */}
          <section>
            <h2 className="mb-3 text-xl font-semibold">2. Uso de la información</h2>
            <p className="mb-3">Usamos la información recopilada para:</p>
            <ul className="list-disc space-y-1 pl-6 text-muted-foreground">
              <li>Proveer, mantener y mejorar el servicio</li>
              <li>Gestionar cuentas de usuario y autenticación</li>
              <li>Procesar y almacenar los datos de turnos, pacientes y configuraciones que el usuario registra</li>
              <li>Comunicarnos con el usuario sobre temas operativos del servicio</li>
            </ul>
            <p className="mt-3">No vendemos, alquilamos ni compartimos la información con terceros con fines comerciales o publicitarios.</p>
          </section>

          {/* 3. Almacenamiento y seguridad */}
          <section>
            <h2 className="mb-3 text-xl font-semibold">3. Almacenamiento y seguridad</h2>
            <p className="mb-3">
              Los datos se almacenan en servidores de proveedores de infraestructura reconocidos.
              Aplicamos medidas de seguridad razonables para proteger la información, incluyendo:
            </p>
            <ul className="list-disc space-y-1 pl-6 text-muted-foreground">
              <li>Cifrado de datos en tránsito (HTTPS)</li>
              <li>Control de acceso basado en roles</li>
              <li>Contraseñas almacenadas de forma cifrada</li>
            </ul>
            <p className="mt-3 text-muted-foreground">
              Ningún sistema es completamente infalible. Tomamos precauciones razonables, pero no podemos
              garantizar seguridad absoluta frente a todos los riesgos posibles.
            </p>
          </section>

          {/* 4. Proveedores externos */}
          <section>
            <h2 className="mb-3 text-xl font-semibold">4. Proveedores externos</h2>
            <p>
              Para operar el servicio utilizamos proveedores de infraestructura y servicios técnicos
              (alojamiento, bases de datos, procesamiento de pagos). Estos proveedores acceden solo a la
              información necesaria para cumplir su función y están sujetos a sus propias políticas de
              privacidad y seguridad. No compartimos información de usuarios con terceros fuera de lo
              necesario para la operación del servicio.
            </p>
          </section>

          {/* 5. Retención de datos */}
          <section>
            <h2 className="mb-3 text-xl font-semibold">5. Retención de datos</h2>
            <p>
              Conservamos los datos mientras la cuenta del usuario se encuentre activa y el servicio esté vigente.
              Si se cancela el servicio, los datos se conservarán por un período razonable según lo indicado
              en nuestros términos de servicio, tras el cual podrán ser eliminados.
            </p>
          </section>

          {/* 6. Responsabilidad del usuario */}
          <section>
            <h2 className="mb-3 text-xl font-semibold">6. Responsabilidad del usuario</h2>
            <p>
              El usuario es responsable de utilizar la plataforma conforme a las leyes y regulaciones
              aplicables en su jurisdicción, especialmente en lo relacionado con la gestión de datos
              de pacientes y salud. AgendixPro proporciona la herramienta; el uso adecuado de la
              información registrada es responsabilidad del usuario o la clínica que opera el servicio.
            </p>
          </section>

          {/* 7. Cambios a esta política */}
          <section>
            <h2 className="mb-3 text-xl font-semibold">7. Cambios a esta política</h2>
            <p>
              Podemos actualizar esta política periódicamente. Los cambios relevantes se comunicarán
              a través de la plataforma o por correo electrónico. La fecha de última actualización
              se indica al inicio de este documento.
            </p>
          </section>

          {/* 8. Contacto */}
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
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/50 py-8">
        <div className="container flex flex-col items-center gap-4 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} AgendixPro. Todos los derechos reservados.</span>
          <nav className="flex flex-wrap justify-center gap-4">
            <Link to="/home" className="hover:text-foreground">Inicio</Link>
            <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link to="/contact" className="hover:text-foreground">Contacto</Link>
            <Link to="/terms" className="hover:text-foreground">Términos</Link>
            <Link to="/cancellation-policy" className="hover:text-foreground">Cancelación y Reembolsos</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

export default Privacy;
