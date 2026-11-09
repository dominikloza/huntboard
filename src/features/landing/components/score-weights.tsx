"use client";

import {
  animate,
  LazyMotion,
  m,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useEffect, useRef } from "react";

import { PARTS, WeightContent, WeightsLegend, weightClass } from "./weights-parts";

const loadFeatures = () => import("./motion-features").then((mod) => mod.default);

const EASE = [0.2, 0.8, 0.2, 1] as const;

/** One weight: the bar is uncovered left to right while its number counts up from 0. */
function Weight({
  label,
  percent,
  index,
  armed,
  shown,
}: {
  label: string;
  percent: number;
  index: number;
  armed: boolean;
  shown: boolean;
}) {
  const value = useMotionValue(armed && !shown ? 0 : percent);
  const rounded = useTransform(value, (v) => Math.round(v));

  useEffect(() => {
    if (!armed || !shown) return;
    const controls = animate(value, percent, { duration: 1.1, delay: index * 0.15, ease: EASE });
    return () => controls.stop();
  }, [armed, shown, value, percent, index]);

  return (
    <m.li
      style={{ flexGrow: percent }}
      initial={armed && !shown ? { clipPath: "inset(0 100% 0 0)" } : false}
      animate={{ clipPath: armed && !shown ? "inset(0 100% 0 0)" : "inset(0 0% 0 0)" }}
      transition={{ duration: 0.7, delay: index * 0.15, ease: EASE }}
      className={weightClass(index)}
    >
      <WeightContent
        index={index}
        label={label}
        percent={percent}
        number={<m.span>{rounded}</m.span>}
      />
    </m.li>
  );
}

/**
 * Animated version of StaticWeights, mounted just before the bar scrolls into view
 * (deferred.tsx): the bars are uncovered and the numbers count up from 0. With reduced motion
 * they stay final.
 */
export function ScoreWeights() {
  const ref = useRef<HTMLOListElement>(null);
  const shown = useInView(ref, { once: true, amount: 0.8 });
  const armed = !useReducedMotion();

  return (
    <LazyMotion features={loadFeatures} strict>
      <ol ref={ref} className="flex h-16 gap-1.5">
        {PARTS.map((part, index) => (
          <Weight
            key={part.key}
            label={part.label}
            percent={part.percent}
            index={index}
            armed={armed}
            shown={shown}
          />
        ))}
      </ol>
      <WeightsLegend />
    </LazyMotion>
  );
}
