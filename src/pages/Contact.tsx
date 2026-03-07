import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, MessageCircle, Clock, Send, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Contact() {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", clinic: "", email: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: "Mensaje enviado", description: "Nos pondremos en contacto a la brevedad." });
    setForm({ name: "", clinic: "", email: "", message: "" });
  };

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
            <Link to="/login">
              <Button size="sm">Iniciar sesión</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Encabezado */}
      <section className="container py-16 md:py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Contacto</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Si quieres conocer AgendixPro, validar disponibilidad o consultar condiciones del servicio, escríbenos.
        </p>
      </section>

      <div className="container grid gap-12 pb-16 md:grid-cols-2 md:gap-16">
        {/* Contacto directo */}
        <div className="space-y-8">
          <Card>
            <CardContent className="space-y-6 p-6">
              <h2 className="text-xl font-semibold">Contacto directo</h2>

              <a
                href="mailto:agendixpro@gmail.com"
                className="flex items-center gap-3 text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                <Mail className="h-5 w-5 text-primary" />
                agendixpro@gmail.com
              </a>

              <a
                href="https://wa.me/12262244099"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="w-full" size="lg">
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Hablar por WhatsApp
                </Button>
              </a>

              <div className="flex items-start gap-2 rounded-md bg-muted/60 p-3 text-sm text-muted-foreground">
                <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Respondemos habitualmente en menos de 24 horas hábiles.</span>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-start gap-3 rounded-lg border p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="text-sm text-muted-foreground">
              AgendixPro es una plataforma web para gestión clínica y operación de agenda.
            </p>
          </div>
        </div>

        {/* Formulario */}
        <Card>
          <CardContent className="p-6">
            <h2 className="mb-6 text-xl font-semibold">Envíanos un mensaje</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Tu nombre completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clinic">Clínica / Empresa</Label>
                <Input
                  id="clinic"
                  value={form.clinic}
                  onChange={(e) => setForm({ ...form, clinic: e.target.value })}
                  placeholder="Nombre de tu clínica o empresa"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="correo@ejemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Mensaje</Label>
                <Textarea
                  id="message"
                  required
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Cuéntanos qué necesitas"
                />
              </div>
              <Button type="submit" className="w-full" size="lg">
                <Send className="mr-2 h-4 w-4" />
                Enviar mensaje
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                El formulario es solo visual por ahora. Para respuesta inmediata, usa WhatsApp o email.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Footer */}
      <footer className="border-t bg-muted/50 py-8">
        <div className="container flex flex-col items-center gap-4 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} AgendixPro. Todos los derechos reservados.</span>
          <nav className="flex flex-wrap justify-center gap-4">
            <Link to="/home" className="hover:text-foreground">Inicio</Link>
            <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacidad</Link>
            <Link to="/terms" className="hover:text-foreground">Términos</Link>
            <Link to="/cancellation-policy" className="hover:text-foreground">Cancelación y Reembolsos</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
