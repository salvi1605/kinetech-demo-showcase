import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import { ReactNode } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

interface PublicLayoutProps {
  children: ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  const { locale, toggleLocale, t } = useLanguage();

  const navLinks = [
    { to: "/home", label: t.nav.home },
    { to: "/pricing", label: t.nav.pricing },
    { to: "/contact", label: t.nav.contact },
    { to: "/terms", label: t.nav.terms },
    { to: "/privacy", label: t.nav.privacy },
  ];

  const footerLinks = [
    ...navLinks,
    { to: "/cancellation-policy", label: t.footer.cancellation },
  ];

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
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLocale}
              className="gap-1.5 text-xs font-semibold"
              aria-label="Toggle language"
            >
              <Globe className="h-4 w-4" />
              {locale === "es" ? "EN" : "ES"}
            </Button>
            <Button asChild size="sm">
              <Link to="/login">{t.nav.login}</Link>
            </Button>
          </nav>
          <div className="flex items-center gap-2 md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleLocale}
              aria-label="Toggle language"
            >
              <Globe className="h-4 w-4" />
            </Button>
            <Button asChild size="sm">
              <Link to="/login">{t.nav.login}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t bg-muted/50 py-8">
        <div className="container flex flex-col items-center gap-4 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} AgendixPro. {t.footer.rights}</span>
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
