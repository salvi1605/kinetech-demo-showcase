import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

interface StrengthCriteria {
  label: string;
  met: boolean;
}

function getPasswordStrength(password: string): {
  score: number;
  level: "empty" | "weak" | "medium" | "strong" | "very-strong";
  criteria: StrengthCriteria[];
} {
  const criteria: StrengthCriteria[] = [
    { label: "Mínimo 8 caracteres", met: password.length >= 8 },
    { label: "Una letra mayúscula", met: /[A-Z]/.test(password) },
    { label: "Una letra minúscula", met: /[a-z]/.test(password) },
    { label: "Un número", met: /[0-9]/.test(password) },
    { label: "Un carácter especial", met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];

  const score = criteria.filter((c) => c.met).length;

  let level: "empty" | "weak" | "medium" | "strong" | "very-strong" = "empty";
  if (password.length === 0) {
    level = "empty";
  } else if (score <= 2) {
    level = "weak";
  } else if (score === 3) {
    level = "medium";
  } else if (score === 4) {
    level = "strong";
  } else {
    level = "very-strong";
  }

  return { score, level, criteria };
}

const levelConfig = {
  empty: { label: "", color: "bg-muted", textColor: "text-muted-foreground" },
  weak: { label: "Débil", color: "bg-destructive", textColor: "text-destructive" },
  medium: { label: "Media", color: "bg-yellow-500", textColor: "text-yellow-600" },
  strong: { label: "Fuerte", color: "bg-emerald-500", textColor: "text-emerald-600" },
  "very-strong": { label: "Muy fuerte", color: "bg-emerald-600", textColor: "text-emerald-700" },
};

export function PasswordStrengthIndicator({
  password,
  className,
}: PasswordStrengthIndicatorProps) {
  const { score, level, criteria } = useMemo(
    () => getPasswordStrength(password),
    [password]
  );

  const config = levelConfig[level];
  const barCount = 4;
  const filledBars = level === "empty" ? 0 : Math.min(score, barCount);

  if (password.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Strength bars */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1 flex-1">
          {Array.from({ length: barCount }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all duration-300",
                i < filledBars ? config.color : "bg-muted"
              )}
            />
          ))}
        </div>
        <span className={cn("text-xs font-medium min-w-16", config.textColor)}>
          {config.label}
        </span>
      </div>

      {/* Criteria checklist */}
      <ul className="space-y-1">
        {criteria.map((criterion, index) => (
          <li
            key={index}
            className={cn(
              "flex items-center gap-2 text-xs transition-colors duration-200",
              criterion.met ? "text-emerald-600" : "text-muted-foreground"
            )}
          >
            {criterion.met ? (
              <Check className="h-3 w-3 flex-shrink-0" />
            ) : (
              <X className="h-3 w-3 flex-shrink-0" />
            )}
            <span>{criterion.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
