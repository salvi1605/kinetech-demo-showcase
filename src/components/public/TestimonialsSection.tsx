import { Quote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";

export function TestimonialsSection() {
  const { t } = useLanguage();

  return (
    <section id="testimonios" className="bg-muted/30 py-16 md:py-20">
      <div className="container">
        <h2 className="text-center text-3xl font-bold">{t.home.testimonials.heading}</h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
          {t.home.testimonials.intro}
        </p>

        <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
          {t.home.testimonials.items.map((item, i) => (
            <figure
              key={i}
              className="flex flex-col rounded-xl border border-border/60 bg-card p-8 shadow-sm"
            >
              <Badge variant="secondary" className="w-fit">
                {item.period}
              </Badge>
              <Quote className="mt-5 h-6 w-6 shrink-0 text-primary/40" aria-hidden="true" />
              <blockquote className="mt-3 flex-1 leading-relaxed text-foreground">
                {item.quote}
              </blockquote>
              <figcaption className="mt-6 border-t border-border/60 pt-4 text-sm font-medium text-muted-foreground">
                {t.home.testimonials.author}
              </figcaption>
            </figure>
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-muted-foreground/80">
          {t.home.testimonials.note}
        </p>
      </div>
    </section>
  );
}
