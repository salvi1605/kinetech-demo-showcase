import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

const navLinks = [
  { to: "/home", label: "Inicio" },
  { to: "/pricing", label: "Precios" },
  { to: "/contact", label: "Contacto" },
  { to: "/terms", label: "Términos" },
  { to: "/privacy", label: "Privacidad" },
];

const footerLinks = [
  { to: "/home", label: "Inicio" },
  { to: "/pricing", label: "Precios" },
  { to: "/contact", label: "Contacto" },
  { to: "/terms", label: "Términos" },
  { to: "/privacy", label: "Privacidad" },
  { to: "/cancellation-policy", label: "Cancelación y Reembolsos" },
];

interface PublicLayoutProps {
  children: ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/home" className="text-xl font-bold tracking-tight">
            AgendixPro
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Button asChild size="sm">
              <Link to="/login">Iniciar Sesión</Link>
            </Button>
          </nav>
          <Button asChild size="sm" className="md:hidden">
            <Link to="/login">Iniciar Sesión</Link>
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t bg-muted/50 py-8">
        <div className="container flex flex-col items-center gap-4 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} AgendixPro. Todos los derechos reservados.</span>
          <nav className="flex flex-wrap justify-center gap-4">
            {footerLinks.map((link) => (
              <Link key={link.to} to={link.to} className="hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
