import React from 'react';

type Severity = 'safe' | 'low' | 'medium' | 'high' | 'critical';

export function SeverityBadge({ severity, label }: { severity: Severity; label: string }) {
  const colorClasses = {
    safe: 'bg-sev-safe-soft text-sev-safe',
    low: 'bg-sev-low-soft text-sev-low',
    medium: 'bg-sev-medium-soft text-sev-medium',
    high: 'bg-sev-high-soft text-sev-high',
    critical: 'bg-sev-critical-soft text-sev-critical',
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-pill text-sm font-semibold ${colorClasses[severity]}`}>
      {label}
    </span>
  );
}
