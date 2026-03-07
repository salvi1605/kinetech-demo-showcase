import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import { useLanguage } from "@/contexts/LanguageContext";

export default function CancellationPolicy() {
  const { t } = useLanguage();

  return (
    <PublicLayout>
      <main className="container py-16 md:py-24">
        <article className="prose prose-neutral dark:prose-invert mx-auto max-w-2xl">
          <div className="mb-6 not-prose">
            <Button asChild variant="ghost" size="sm">
              <Link to="/home">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t.common.backHome}
              </Link>
            </Button>
          </div>

          <h1>{t.cancellation.heading}</h1>
          <p className="text-muted-foreground">{t.cancellation.lastUpdated}</p>

          <h2>{t.cancellation.s1title}</h2>
          <p>{t.cancellation.s1body}</p>

          <h2>{t.cancellation.s2title}</h2>
          <p>{t.cancellation.s2body}</p>

          <h2>{t.cancellation.s3title}</h2>
          <p>{t.cancellation.s3body}</p>

          <h2>{t.cancellation.s4title}</h2>
          <p>{t.cancellation.s4body}</p>

          <h2>{t.cancellation.s5title}</h2>
          <p>
            {t.cancellation.s5body}
            <a href="mailto:agendixpro@gmail.com" className="text-primary hover:underline">
              agendixpro@gmail.com
            </a>.
          </p>
        </article>
      </main>
    </PublicLayout>
  );
}
