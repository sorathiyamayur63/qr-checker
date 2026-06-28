"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { RedirectHop } from '@qr/shared';
import { LinkChainIcon } from '../icons';

export function RedirectChainDiagram({ hops, finalUrl }: { hops: RedirectHop[], finalUrl: string }) {
  const nodes = [...hops.map(h => h.url), finalUrl];

  return (
    <div className="flex flex-col gap-4 py-4 w-full overflow-x-auto overflow-y-hidden">
      <div className="flex items-center min-w-max px-2">
        {nodes.map((url, i) => {
          const isLast = i === nodes.length - 1;
          const hostname = (() => {
            try { return new URL(url).hostname; } catch { return url; }
          })();

          return (
            <React.Fragment key={`${i}-${url}`}>
              <div className="flex flex-col items-center gap-2">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${isLast ? 'border-brand bg-brand-soft text-brand' : 'border-subtle bg-muted text-tertiary'}`}>
                  {isLast ? <LinkChainIcon className="w-5 h-5" /> : <span className="text-sm font-mono font-medium">{i + 1}</span>}
                </div>
                <span className="text-xs font-mono max-w-[120px] truncate" title={url}>{hostname}</span>
              </div>

              {!isLast && (
                <div className="relative w-16 h-[2px] mx-2 bg-[var(--bg-muted)] -translate-y-3">
                  <motion.div
                    className="absolute inset-0 bg-brand origin-left"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.4, delay: i * 0.15, ease: [0.4, 0, 0.2, 1] }}
                  />
                  {/* Subtle looping dot after complete */}
                  <motion.div
                    className="absolute w-1.5 h-1.5 rounded-full bg-brand top-1/2 -translate-y-1/2 shadow-[0_0_4px_var(--brand)]"
                    initial={{ left: 0, opacity: 0 }}
                    animate={{ left: '100%', opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 3, delay: (nodes.length * 0.15) + (i * 0.5), repeat: Infinity, ease: "linear" }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
