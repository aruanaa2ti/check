import { cn } from "@/lib/utils";
import logoBlack from "@/assets/logo-black.png";
import logoWhite from "@/assets/logo-white.png";

export function Logo({
  variant = "dark",
  className,
}: {
  variant?: "dark" | "light";
  className?: string;
}) {
  return (
    <img
      src={variant === "light" ? logoWhite : logoBlack}
      alt="A2 Soluções em T.I."
      className={cn("block object-contain", className)}
    />
  );
}
