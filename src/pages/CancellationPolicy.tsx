import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import { getMailtoHref } from "@/utils/obfuscateContact";
import { useLanguage } from "@/contexts/LanguageContext";

export default function CancellationPolicy() {
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

        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{t.cancellation.heading}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t.cancellation.lastUpdated}</p>

        <Separator className="my-8" />

        <div className="space-y-8 text-[0.95rem] leading-relaxed text-foreground/90">
          <section>
            <h2 className="mb-3 text-xl font-semibold">{t.cancellation.s1title}</h2>
            <p className="text-muted-foreground">{t.cancellation.s1body}</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">{t.cancellation.s2title}</h2>
            <p className="text-muted-foreground">{t.cancellation.s2body}</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">{t.cancellation.s3title}</h2>
            <p className="text-muted-foreground">{t.cancellation.s3body}</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">{t.cancellation.s4title}</h2>
            <p className="text-muted-foreground">{t.cancellation.s4body}</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">{t.cancellation.s5title}</h2>
            <p>
              {t.cancellation.s5body}
              <a href={getMailtoHref()} className="font-medium text-primary hover:underline">
                {t.cancellation.s5emailButton}
              </a>.
            </p>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
