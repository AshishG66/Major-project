import React, { useEffect, useRef } from 'react';
import { useMotionValue, useSpring, useTransform, animate } from 'framer-motion';

interface SpringCounterProps {
  value: number;
  className?: string;
}

export default function SpringCounter({ value, className }: SpringCounterProps) {
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { stiffness: 70, damping: 18 });
  const displayValue = useTransform(springValue, (latest) => Math.round(latest));
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const animation = animate(motionValue, value, { duration: 0.8, ease: 'easeOut' });
    return () => animation.stop();
  }, [value, motionValue]);

  useEffect(() => {
    if (ref.current) {
      ref.current.textContent = Math.round(value).toString();
    }
    return displayValue.on('change', (latest) => {
      if (ref.current) {
        ref.current.textContent = latest.toLocaleString();
      }
    });
  }, [displayValue, value]);

  return <span ref={ref} className={className}>{Math.round(value)}</span>;
}
