import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Globe, Mail, MessageCircle, Menu } from "lucide-react";
import { ReactNode, useState } from "react";
import { AnimatedMenuItems } from "@/components/shared/AnimatedMenuItems";
import { useLanguage } from "@/contexts/LanguageContext";
import { getMailtoHref, getWhatsAppHref } from "@/utils/obfuscateContact";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface PublicLayoutProps {
  children: ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  const { locale, toggleLocale, t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);

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
      {/* Header — fixed */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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

          {/* Mobile controls */}
          <div className="flex items-center gap-2 md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          {/* Mobile sheet */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="text-left">AgendixPro</SheetTitle>
              </SheetHeader>
              <AnimatedMenuItems variant="fadeInRight" className="flex flex-col gap-1">
                {[...navLinks, { to: "/cancellation-policy", label: t.footer.cancellation }].map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </AnimatedMenuItems>
              <div className="mt-6 flex flex-col gap-3 border-t pt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { toggleLocale(); }}
                  className="gap-1.5 justify-start"
                >
                  <Globe className="h-4 w-4" />
                  {locale === "es" ? "English" : "Español"}
                </Button>
                <Button asChild size="sm">
                  <Link to="/login" onClick={() => setMobileOpen(false)}>
                    {t.nav.login}
                  </Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-16" />

      {/* Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t bg-muted/50 py-10">
        <div className="container space-y-6">
          {/* Identity row */}
          <div className="flex flex-col items-center gap-2 text-center sm:items-start sm:text-left">
            <span className="text-lg font-bold">AgendixPro</span>
            <span className="text-sm text-muted-foreground">{t.footer.tagline}</span>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-muted-foreground">{t.footer.contactLabel}</span>
              <a href={getMailtoHref()}>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {t.footer.emailButton}
                </Button>
              </a>
              <a href="https://wa.me/12262244099" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                  <MessageCircle className="h-3.5 w-3.5" />
                  {t.footer.whatsappButton}
                </Button>
              </a>
            </div>
          </div>

          {/* Links + copyright */}
          <div className="flex flex-col items-center gap-4 border-t pt-6 text-sm text-muted-foreground sm:flex-row sm:justify-between">
            <span>© {new Date().getFullYear()} AgendixPro. {t.footer.rights}</span>
            <nav className="flex flex-wrap justify-center gap-4">
              {footerLinks.map((link) => (
                <Link key={link.to} to={link.to} className="hover:text-foreground transition-colors">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
