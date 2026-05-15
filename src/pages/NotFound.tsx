import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { SearchX, Home, ArrowRight, CalendarDays, Users, ShieldCheck, FileText, Mail, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const { t } = useLanguage();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  const links = [
    { to: "/", label: t.notFound.links.home, icon: Home },
    { to: "/pricing", label: t.notFound.links.pricing, icon: Tag },
    { to: "/contact", label: t.notFound.links.contact, icon: Mail },
    { to: "/terms", label: t.notFound.links.terms, icon: FileText },
    { to: "/privacy", label: t.notFound.links.privacy, icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background px-4 py-12">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
          <SearchX className="h-10 w-10 text-primary" aria-hidden="true" />
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">
          404
        </h1>
        <p className="text-lg font-semibold text-foreground mb-1">
          {t.notFound.title}
        </p>
        <p className="text-muted-foreground mb-8">
          {t.notFound.message}
        </p>

        {/* CTA */}
        <Button asChild className="mb-10 w-full sm:w-auto" size="lg">
          <Link to="/" aria-label={t.notFound.backHome}>
            <Home className="mr-2 h-4 w-4" />
            {t.notFound.backHome}
          </Link>
        </Button>

        {/* Suggested links */}
        <div className="text-left">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
            {t.notFound.linksTitle}
          </p>
          <nav aria-label="Secciones principales">
            <ul className="space-y-2">
              {links.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      {label}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
