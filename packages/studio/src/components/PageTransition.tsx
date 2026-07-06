import { useEffect, useRef, type JSX, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

/**
 * Wraps route content with a subtle fade-in on route change.
 *
 * Does NOT fade out old content (which caused a visible "flash" on every
 * tab switch).  Instead it immediately swaps to the new route and applies
 * a quick fade-in via a CSS class toggle, without remounting children.
 */
export function PageTransition({ children }: { readonly children: ReactNode }): JSX.Element {
  const location = useLocation();
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = divRef.current;
    if (!el) return;
    // Re-trigger the CSS animation by toggling the class
    el.classList.remove("page-fade-in");
    // Force reflow so the animation restarts
    void el.offsetWidth;
    el.classList.add("page-fade-in");
  }, [location.pathname]);

  return (
    <>
      <style>{`
        @keyframes pageFadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        .page-fade-in {
          animation: pageFadeIn 200ms ease-out;
        }
      `}</style>
      <div ref={divRef}>{children}</div>
    </>
  );
}
