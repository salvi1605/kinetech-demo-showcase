import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import { useLanguage } from "@/contexts/LanguageContext";

export function Terms() {
  const { t } = useLanguage();

  return (
    <PublicLayout>
      <div className="container max-w-3xl py-12 md:py-16">
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link to="/home">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t.common.backHome}
            </Link>
          </Button>
        </div>

        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{t.terms.heading}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t.common.lastUpdated}</p>

        <Separator className="my-8" />

        <div className="space-y-8 text-[0.95rem] leading-relaxed text-foreground/90">
          <section><p>{t.terms.intro}</p></section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">{t.terms.s1title}</h2>
            <p>{t.terms.s1body}</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">{t.terms.s2title}</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              {t.terms.s2items.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
            <p className="mt-3 text-sm text-muted-foreground italic">{t.terms.s2note}</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">{t.terms.s3title}</h2>
            <p>{t.terms.s3body}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t.terms.s3note}</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">{t.terms.s4title}</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              {t.terms.s4items.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">{t.terms.s5title}</h2>
            <p>
              {t.terms.s5body1}
              <Link to="/privacy" className="font-medium text-primary hover:underline">{t.terms.s5link}</Link>
              {t.terms.s5body2}
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">{t.terms.s6title}</h2>
            <p>{t.terms.s6body}</p>
          </section>

          <section id="cancelacion" className="rounded-lg border bg-muted/30 p-6">
            <h2 className="mb-4 text-xl font-semibold">{t.terms.s7title}</h2>
            <div className="space-y-4 text-muted-foreground">
              <div>
                <h3 className="mb-1 font-medium text-foreground">{t.terms.s7cancelTitle}</h3>
                <p>{t.terms.s7cancelBody}</p>
              </div>
              <div>
                <h3 className="mb-1 font-medium text-foreground">{t.terms.s7refundTitle}</h3>
                <p>{t.terms.s7refundBody}</p>
              </div>
              <div>
                <h3 className="mb-1 font-medium text-foreground">{t.terms.s7dataTitle}</h3>
                <p>{t.terms.s7dataBody}</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">{t.terms.s8title}</h2>
            <p>
              {t.terms.s8body1}
              <a href="mailto:agendixpro@gmail.com" className="font-medium text-primary hover:underline">agendixpro@gmail.com</a>
              {t.terms.s8body2}
              <a href="https://wa.me/12262244099" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">{t.terms.s8whatsapp}</a>.
            </p>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}

export default Terms;
