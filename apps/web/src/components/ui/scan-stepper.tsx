"use client";

import React from 'react';
import { motion } from 'framer-motion';

export type StepStatus = 'pending' | 'running' | 'done' | 'failed';

export interface StepItem {
  id: string;
  label: string;
  status: StepStatus;
  icon: React.ReactNode;
}

export function ScanStepper({ steps }: { steps: StepItem[] }) {
  return (
    <div className="flex flex-col gap-4">
      {steps.map((step, index) => {
        const isRunning = step.status === 'running';
        const isDone = step.status === 'done';
        const isFailed = step.status === 'failed';
        
        return (
          <div key={step.id} className="flex items-center gap-4 relative">
            {/* Connecting line */}
            {index < steps.length - 1 && (
              <div className="absolute left-4 top-10 bottom-[-1rem] w-[2px] bg-[var(--border-subtle)] -translate-x-1/2" />
            )}
            
            <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-[var(--bg-muted)] z-10 shrink-0">
              {isRunning && (
                <motion.div
                  className="absolute inset-[-4px] rounded-full border border-brand border-t-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, ease: "linear", repeat: Infinity }}
                />
              )}
              {isRunning && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-brand"
                  initial={{ scale: 1, opacity: 0.4 }}
                  animate={{ scale: 1.6, opacity: 0 }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
              <motion.div
                animate={
                  isRunning 
                    ? { scale: [1, 1.08, 1] } 
                    : { scale: 1 }
                }
                transition={isRunning ? { duration: 0.3 } : {}}
                className={`flex items-center justify-center w-full h-full ${
                  isRunning ? 'text-brand' : isDone ? 'text-sev-safe' : isFailed ? 'text-sev-critical' : 'text-tertiary'
                }`}
              >
                {isDone ? (
                  <svg className="w-5 h-5 text-sev-safe" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <motion.path
                      d="M20 6L9 17l-5-5"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                    />
                  </svg>
                ) : (
                  step.icon
                )}
              </motion.div>
            </div>
            <div className="flex-1">
              <span className={`text-sm font-medium ${
                isRunning ? 'text-brand' : isDone ? 'text-foreground' : 'text-tertiary'
              }`}>
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
