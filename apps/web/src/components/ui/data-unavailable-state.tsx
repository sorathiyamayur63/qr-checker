import React from 'react';
import { ShieldAlertIcon } from '../icons';

export function DataUnavailableState({ reason }: { reason: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <ShieldAlertIcon className="w-8 h-8 text-[var(--text-tertiary)] mb-3 opacity-50" />
      <p className="text-[var(--text-secondary)] text-sm">{reason}</p>
    </div>
  );
}
