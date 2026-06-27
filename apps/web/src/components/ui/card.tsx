import React from 'react';

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-background shadow-sm border border-subtle rounded-md p-4 sm:p-6 transition-all hover:-translate-y-[2px] hover:shadow-md ${className}`}>
      {children}
    </div>
  );
}
