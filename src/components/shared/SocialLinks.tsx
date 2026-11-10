import { Facebook, Instagram, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SOCIAL_LINKS } from "@/lib/socialLinks";

interface SocialLinksProps {
  /** Accessible name of the group, e.g. "Síguenos" / "Follow us". */
  label: string;
  /** Prefix for each link's accessible label, e.g. "AgendixPro en" / "AgendixPro on". */
  ariaPrefix: string;
  className?: string;
}

const ICONS = {
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
} as const;

export function SocialLinks({ label, ariaPrefix, className }: SocialLinksProps) {
  return (
    <nav aria-label={label} className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      {SOCIAL_LINKS.map((social) => {
        const Icon = ICONS[social.id as keyof typeof ICONS];
        return (
          <Button
            key={social.id}
            asChild
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5 font-medium"
          >
            <a
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${ariaPrefix} ${social.name}`}
              title={social.name}
            >
              {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
              {social.showName ? <span>{social.name}</span> : null}
            </a>
          </Button>
        );
      })}
    </nav>
  );
}
