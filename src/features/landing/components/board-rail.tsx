"use client";

import { LazyMotion, m, MotionConfig, useMotionValueEvent, useScroll } from "motion/react";
import { useRef, useState } from "react";

import { RailCard, RailColumns, STOPS, stopAt } from "./rail-parts";

const loadFeatures = () => import("./motion-features").then((mod) => mod.default);

/**
 * Landing page illustration (ADR 014): one folder moves through the columns as the page scrolls.
 * The move is a Motion layout animation (shared `layoutId`), so the card flies from one column
 * to the next with a spring and is lifted like a dragged card while it travels. With reduced
 * motion the card jumps without animating. Loaded only when the rail comes near (deferred.tsx).
 */
export function BoardRail() {
  const ref = useRef<HTMLDivElement>(null);
  const [stop, setStop] = useState(0);
  const [moving, setMoving] = useState(false);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.8", "end 0.3"] });
  useMotionValueEvent(scrollYProgress, "change", (progress) => setStop(stopAt(progress)));

  const current = STOPS[stop] ?? STOPS[0];

  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">
        <div ref={ref}>
          <RailColumns
            status={current.status}
            card={
              <m.div
                layoutId="landing-rail-card"
                transition={{ type: "spring", stiffness: 260, damping: 26, mass: 0.9 }}
                initial={false}
                animate={{ rotate: moving ? -3 : -1, scale: moving ? 1.04 : 1 }}
                onLayoutAnimationStart={() => setMoving(true)}
                onLayoutAnimationComplete={() => setMoving(false)}
                className="relative z-10"
              >
                <RailCard stamp={current.stamp} lifted={moving} />
              </m.div>
            }
          />
        </div>
      </MotionConfig>
    </LazyMotion>
  );
}
