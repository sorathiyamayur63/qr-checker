"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

type Severity = 'safe' | 'low' | 'medium' | 'high' | 'critical';

const severityColors: Record<Severity, string> = {
  safe: 'var(--sev-safe)',
  low: 'var(--sev-low)',
  medium: 'var(--sev-medium)',
  high: 'var(--sev-high)',
  critical: 'var(--sev-critical)',
};

export function RiskGauge({ score, severity }: { score: number; severity: Severity }) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    // Simple count up
    const start = 0;
    const end = score;
    if (start === end) return;
    
    const totalDuration = 900;
    let startTime: number;

    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / totalDuration, 1);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.floor(ease * end));
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setAnimatedScore(end);
      }
    };
    requestAnimationFrame(animate);
  }, [score]);

  // 270 degree arc setup
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  // 270 degrees is 3/4 of the circle, so we leave 1/4 blank at the bottom
  const strokeDasharray = `${circumference * 0.75} ${circumference * 0.25}`;
  const targetOffset = circumference * 0.75 * (1 - score / 100);
  const initialOffset = circumference * 0.75;

  return (
    <div className="relative flex items-center justify-center w-48 h-48 mx-auto">
      <svg className="absolute inset-0 w-full h-full transform rotate-[135deg]" viewBox="0 0 140 140">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="var(--bg-muted)"
          strokeWidth="12"
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
        />
        <motion.circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={severityColors[severity]}
          strokeWidth="12"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={initialOffset}
          strokeLinecap="round"
          initial={{ strokeDashoffset: initialOffset }}
          animate={{ strokeDashoffset: targetOffset }}
          transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
        />
      </svg>
      <div className="flex flex-col items-center justify-center translate-y-2">
        <span className="text-4xl font-bold text-foreground">{animatedScore}</span>
        <span className="text-sm font-semibold capitalize mt-1" style={{ color: severityColors[severity] }}>
          {severity}
        </span>
      </div>
    </div>
  );
}
