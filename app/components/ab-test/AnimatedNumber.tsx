'use client';
import React, { useState, useEffect, useRef } from 'react';

interface Props {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

export default function AnimatedNumber({
  value,
  decimals = 2,
  prefix = '',
  suffix = '',
}: Props) {
  const [display, setDisplay] = useState(value);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    const duration = 700;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startRef.current = null;

    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const prog = Math.min((ts - startRef.current) / duration, 1);
      const ease = 1 - Math.pow(1 - prog, 3);
      const next = from + (to - from) * ease;
      setDisplay(next);
      if (prog < 1) rafRef.current = requestAnimationFrame(step);
      else fromRef.current = to;
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  return (
    <>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </>
  );
}