import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Mail, MessageCircle, Clock, Send, ShieldCheck, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import PublicLayout from "@/components/layout/PublicLayout";
import { useLanguage } from "@/contexts/LanguageContext";
const FORMSPREE_URL = "https://formspree.io/f/xeerorql";

export default function Contact() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [form, setForm] = useState({ name: "", clinic: "", email: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch(FORMSPREE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: form.name,
          clinic: form.clinic,
          email: form.email,
          message: form.message,
        }),
      });

      if (!res.ok) throw new Error("Formspree error");

      toast({ title: t.contact.toastTitle, description: t.contact.toastDesc });
      setForm({ name: "", clinic: "", email: "", message: "" });
    } catch (err) {
      console.error("Contact form error:", err);
      toast({
        title: t.contact.toastErrorTitle ?? "Error",
        description: t.contact.toastErrorDesc ?? "No se pudo enviar el mensaje. Intentá de nuevo.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <section className="container py-16 md:py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{t.contact.heading}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">{t.contact.subtitle}</p>
      </section>

      <div className="container grid gap-12 pb-16 md:grid-cols-2 md:gap-16">
        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">{t.contact.directContact}</h2>
            <div className="space-y-4">
              <a href="https://wa.me/12262244099" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                <MessageCircle className="h-5 w-5 text-primary" />
                <div>
                   <p className="font-medium">{t.contact.whatsapp}</p>
                   <p className="text-sm text-muted-foreground">{t.contact.whatsappAction}</p>
                </div>
              </a>
              <a href="mailto:agendixpro2026@gmail.com" className="flex items-center gap-3 rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">{t.contact.email}</p>
                  <p className="text-sm text-muted-foreground">{t.contact.emailAction}</p>
                </div>
              </a>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{t.contact.responseTime}</p>
                <p className="text-sm text-muted-foreground">{t.contact.responseTimeDesc}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{t.contact.commitment}</p>
                <p className="text-sm text-muted-foreground">{t.contact.commitmentDesc}</p>
              </div>
            </div>
          </div>
        </div>

        <Card className="border-muted">
          <CardContent className="p-6 md:p-8">
            <h2 className="text-xl font-semibold mb-1">{t.contact.formTitle}</h2>
            <p className="text-sm text-muted-foreground mb-6">{t.contact.formSubtitle}</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="c-name">{t.contact.name}</Label>
                <Input id="c-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t.contact.namePlaceholder} maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-clinic">{t.contact.clinic}</Label>
                <Input id="c-clinic" value={form.clinic} onChange={(e) => setForm({ ...form, clinic: e.target.value })} placeholder={t.contact.clinicPlaceholder} maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-email">{t.contact.emailLabel}</Label>
                <Input id="c-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder={t.contact.emailPlaceholder} maxLength={255} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-msg">{t.contact.message}</Label>
                <Textarea id="c-msg" rows={4} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder={t.contact.messagePlaceholder} maxLength={2000} />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {submitting ? (t.contact.sending ?? "Enviando...") : t.contact.send}
              </Button>
              <p className="text-xs text-center text-muted-foreground">{t.contact.formNote}</p>
            </form>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}
