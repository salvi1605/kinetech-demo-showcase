import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { SeoHead } from '@/components/shared/SeoHead';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MailX } from 'lucide-react';

/** Legacy links cannot be processed: managed email owns unsubscribe tokens. */
export default function Unsubscribe() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <SeoHead title="Enlace de baja anterior — AgendixPro" description="Información sobre enlaces anteriores de baja de correos de AgendixPro." path="/unsubscribe" />
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2"><MailX className="h-8 w-8 text-primary" aria-hidden="true" /></div>
          <CardTitle>Este enlace de baja ya no está disponible</CardTitle>
          <CardDescription>AgendixPro</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">No se ha realizado ninguna baja desde esta página.</p>
          <p className="text-sm text-muted-foreground">Para dejar de recibir correos, utiliza el enlace de baja al final de un correo reciente. Si solo tienes este enlace anterior, solicita a tu clínica que retire tu autorización de contacto por email.</p>
          <Button asChild className="w-full"><Link to="/">Volver al inicio</Link></Button>
        </CardContent>
      </Card>
    </div>
  );
}
