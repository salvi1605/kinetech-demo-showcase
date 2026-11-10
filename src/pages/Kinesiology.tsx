import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  Mail,
  MessageCircle,
  Quote,
  UserX,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import PublicLayout from "@/components/layout/PublicLayout";
import { SeoHead } from "@/components/shared/SeoHead";
import { useLanguage } from "@/contexts/LanguageContext";
import { getWhatsAppHref } from "@/utils/obfuscateContact";
import { CTAK_KINESIOLOGY_QUOTES, getKinesiologyOffer } from "@/lib/kinesiologyPage";
import { cn } from "@/lib/utils";

const howIcons = [CalendarCheck, UserX, Mail, BarChart3];

export default function Kinesiology() {
  const { t } = useLanguage();
  const k = t.kinesiology;
  const offer = getKinesiologyOffer(t);

  return (
    <PublicLayout>
      <SeoHead
        title={t.seo.kinesiology.title}
        description={t.seo.kinesiology.description}
        path="/kinesiologia"
      />

      {/* ── Gancho ── */}
      <section className="container py-20 text-center md:py-28">
        <h1 className="mx-auto max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          {k.hero.title}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">{k.hero.subtitle}</p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link to="/contact">
              {k.hero.cta}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href={getWhatsAppHref()} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
              {k.hero.ctaAlt}
            </a>
          </Button>
        </div>
      </section>

      {/* ── El problema ── */}
      <section className="container py-12 md:py-16">
        <h2 className="mb-10 text-center text-3xl font-bold">{k.problem.heading}</h2>
        <ul className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
          {k.problem.items.map((item, i) => (
            <li key={i} className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
              <p className="flex items-start gap-3 font-medium">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
                {item}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <Separator />

      {/* ── La solución ── */}
      <section className="container py-16 md:py-20">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-8 text-center text-3xl font-bold">{k.solution.heading}</h2>
          <div className="space-y-5 rounded-xl border border-primary/20 bg-primary/5 p-8 text-lg leading-relaxed">
            {k.solution.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            <p className="text-sm font-medium text-muted-foreground">— {k.solution.signature}</p>
          </div>
        </div>
      </section>

      <Separator />

      {/* ── Cómo funciona ── */}
      <section className="container py-16 md:py-20">
        <h2 className="mb-12 text-center text-3xl font-bold">{k.how.heading}</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {k.how.items.map((item, i) => {
            const Icon = howIcons[i];
            return (
              <div key={i} className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── La prueba (CTAK) ── */}
      <section className="bg-muted/30 py-16 md:py-20">
        <div className="container">
          <h2 className="text-center text-3xl font-bold">{k.proof.heading}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">{k.proof.intro}</p>
          <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
            {CTAK_KINESIOLOGY_QUOTES.map((item, i) => (
              <figure
                key={i}
                className={cn(
                  "flex flex-col rounded-xl border border-border/60 bg-card p-8 shadow-sm",
                  i === CTAK_KINESIOLOGY_QUOTES.length - 1 && "md:col-span-2 md:mx-auto md:w-full md:max-w-xl",
                )}
              >
                <Quote className="h-6 w-6 shrink-0 text-primary/40" aria-hidden="true" />
                <blockquote lang="es" className="mt-3 flex-1 text-lg leading-relaxed text-foreground">
                  «{item.quote}»
                </blockquote>
                <figcaption className="mt-6 border-t border-border/60 pt-4 text-sm font-medium text-muted-foreground">
                  {item.author === "telma" ? k.proof.telma : k.proof.gerardo}
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-muted-foreground/80">{k.proof.note}</p>
        </div>
      </section>

      {/* ── Oferta y llamado ── */}
      <section id="demo" className="container py-16 md:py-20">
        <div className="mx-auto max-w-lg text-center">
          <h2 className="text-3xl font-bold">{k.offer.heading}</h2>
          <p className="mt-4 text-lg text-muted-foreground">{k.offer.desc}</p>
        </div>

        <div className="mx-auto mt-10 max-w-lg rounded-xl border-2 border-primary/40 bg-card p-8 shadow-lg">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">{k.offer.planLabel}</p>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-4xl font-bold text-primary">{offer.price}</span>
            <span className="text-muted-foreground">{offer.perMonth}</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{offer.priceNote}</p>

          <div className="mt-6 space-y-1.5 border-t pt-4">
            <p className="text-sm font-semibold">{offer.setupTitle}</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold">{offer.setupPrice}</span>
              <span className="text-xs text-muted-foreground">{offer.setupOneTime}</span>
            </div>
            <p className="text-sm text-muted-foreground">{offer.setupBreakdown}</p>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <Button asChild size="lg" className="w-full">
              <Link to="/contact">
                {k.offer.cta}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full">
              <a href={getWhatsAppHref()} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                {k.offer.ctaAlt}
              </a>
            </Button>
          </div>

          <p className="mt-6 text-center text-sm">
            <Link
              to="/pricing"
              className="inline-flex min-h-[44px] items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {k.offer.pricingLink}
            </Link>
          </p>
        </div>
      </section>
    </PublicLayout>
  );
}
