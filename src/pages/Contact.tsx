import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Mail, MessageCircle, Clock, Send, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import PublicLayout from "@/components/layout/PublicLayout";

export default function Contact() {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", clinic: "", email: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: "Mensaje enviado", description: "Nos pondremos en contacto a la brevedad." });
    setForm({ name: "", clinic: "", email: "", message: "" });
  };

  return (
    <PublicLayout>
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
          <div>
            <h2 className="text-xl font-semibold mb-4">Contacto directo</h2>
            <div className="space-y-4">
              <a
                href="https://wa.me/12262244099"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
              >
                <MessageCircle className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">WhatsApp</p>
                  <p className="text-sm text-muted-foreground">+1 (226) 224-4099</p>
                </div>
              </a>
              <a
                href="mailto:agendixpro@gmail.com"
                className="flex items-center gap-3 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
              >
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">Mándanos un Correo</p>
                </div>
              </a>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Tiempo de respuesta</p>
                <p className="text-sm text-muted-foreground">Respondemos dentro de las 24 horas hábiles.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Compromiso</p>
                <p className="text-sm text-muted-foreground">
                  Sin compromisos iniciales. Consultá libremente sobre el servicio.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <Card className="border-muted">
          <CardContent className="p-6 md:p-8">
            <h2 className="text-xl font-semibold mb-1">Enviar mensaje</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Completá el formulario y te responderemos a la brevedad.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="c-name">Nombre</Label>
                <Input
                  id="c-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Tu nombre"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-clinic">Clínica / Consultorio</Label>
                <Input
                  id="c-clinic"
                  value={form.clinic}
                  onChange={(e) => setForm({ ...form, clinic: e.target.value })}
                  placeholder="Nombre de la clínica (opcional)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-email">Email</Label>
                <Input
                  id="c-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="tu@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-msg">Mensaje</Label>
                <Textarea
                  id="c-msg"
                  rows={4}
                  required
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
    </PublicLayout>
  );
}
