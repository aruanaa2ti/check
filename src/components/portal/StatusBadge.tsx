import { cn } from "@/lib/utils";
import { statusTone, type Tone } from "@/lib/format";

const toneClasses: Record<Tone, string> = {
  success: "bg-brand/10 text-brand-dark ring-brand/20",
  warning: "bg-amber-100 text-amber-800 ring-amber-200",
  danger: "bg-red-100 text-red-700 ring-red-200",
  muted: "bg-muted text-muted-foreground ring-border",
};

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  const tone = statusTone(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        toneClasses[tone],
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", {
        "bg-brand": tone === "success",
        "bg-amber-500": tone === "warning",
        "bg-red-500": tone === "danger",
        "bg-muted-foreground": tone === "muted",
      })} />
      {label ?? status}
    </span>
  );
}
