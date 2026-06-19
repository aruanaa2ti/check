import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const COOKIE_KEY = "a2ti_cookie_notice_accepted_v2";

export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(localStorage.getItem(COOKIE_KEY) !== "true");
  }, []);

  const accept = () => {
    localStorage.setItem(COOKIE_KEY, "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-5 left-4 right-4 z-[60] rounded-lg border border-border bg-card/95 p-3 shadow-soft backdrop-blur lg:left-1/2 lg:right-auto lg:w-[860px] lg:-translate-x-1/2">
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <p className="min-w-0 text-center text-xs leading-relaxed text-muted-foreground lg:whitespace-nowrap">
          Este site utiliza cookies para melhorar sua experiência. Ao continuar você concorda com nossa{" "}
          <Link to="/politica" className="font-medium text-primary hover:underline">
            Política de Privacidade
          </Link>
          .
        </p>
        <button
          onClick={accept}
          className="inline-flex shrink-0 items-center justify-center rounded-md bg-gradient-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow transition hover:opacity-90"
        >
          Concordo
        </button>
      </div>
    </div>
  );
}
