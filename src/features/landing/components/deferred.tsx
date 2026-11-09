"use client";

import { lazy, type ReactNode, Suspense, useEffect, useRef, useState } from "react";

const BoardRail = lazy(() => import("./board-rail").then((mod) => ({ default: mod.BoardRail })));
const ScoreWeights = lazy(() =>
  import("./score-weights").then((mod) => ({ default: mod.ScoreWeights })),
);

/**
 * Shows the server-rendered `children` until the block is about to scroll into view, then swaps
 * in the animated version. The animation code (Motion) is not part of the page's first load.
 */
function WhenNear({ children, animated }: { children: ReactNode; animated: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>{near ? <Suspense fallback={children}>{animated}</Suspense> : children}</div>
  );
}

export function DeferredRail({ children }: { children: ReactNode }) {
  return <WhenNear animated={<BoardRail />}>{children}</WhenNear>;
}

export function DeferredWeights({ children }: { children: ReactNode }) {
  return <WhenNear animated={<ScoreWeights />}>{children}</WhenNear>;
}
