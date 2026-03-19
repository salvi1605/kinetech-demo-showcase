import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import PublicLayout from "@/components/layout/PublicLayout";
import { getMailtoHref } from "@/utils/obfuscateContact";
import { useLanguage } from "@/contexts/LanguageContext";

export function Privacy() {
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

        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{t.privacy.heading}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t.common.lastUpdated}</p>

        <Separator className="my-8" />

        <div className="space-y-8 text-[0.95rem] leading-relaxed text-foreground/90">
          <section><p>{t.privacy.intro}</p></section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">{t.privacy.s1title}</h2>
            <div className="space-y-4">
              <div>
                <h3 className="mb-1 font-medium">{t.privacy.s1accountTitle}</h3>
                <p className="text-muted-foreground">{t.privacy.s1accountBody}</p>
              </div>
              <div>
                <h3 className="mb-1 font-medium">{t.privacy.s1userTitle}</h3>
                <p className="text-muted-foreground">{t.privacy.s1userBody}</p>
              </div>
              <div>
                <h3 className="mb-1 font-medium">{t.privacy.s1techTitle}</h3>
                <p className="text-muted-foreground">{t.privacy.s1techBody}</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">{t.privacy.s2title}</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              {t.privacy.s2items.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
            <p className="mt-3 text-sm text-muted-foreground italic">{t.privacy.s2note}</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">{t.privacy.s3title}</h2>
            <p className="text-muted-foreground">{t.privacy.s3body}</p>
            <p className="mt-2 text-sm text-muted-foreground italic">{t.privacy.s3note}</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">{t.privacy.s4title}</h2>
            <p className="text-muted-foreground">{t.privacy.s4body}</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">{t.privacy.s5title}</h2>
            <p className="text-muted-foreground">{t.privacy.s5body}</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">{t.privacy.s6title}</h2>
            <p className="text-muted-foreground">{t.privacy.s6body}</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">{t.privacy.s7title}</h2>
            <p className="text-muted-foreground">{t.privacy.s7body}</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">{t.privacy.s8title}</h2>
            <p>
              {t.privacy.s8body}
              <a href={getMailtoHref()} className="font-medium text-primary hover:underline">{t.privacy.s8emailButton}</a>.
            </p>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}

export default Privacy;
