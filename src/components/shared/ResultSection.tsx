'use client';

import { useState, ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ResultSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  icon?: ReactNode;
}

export default function ResultSection({ title, children, defaultOpen = true, icon }: ResultSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-surface-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 bg-white hover:bg-surface-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-surface-400" /> : <ChevronDown className="h-4 w-4 text-surface-400" />}
      </button>
      {open && (
        <div className="p-4 bg-white border-t border-surface-100">
          {children}
        </div>
      )}
    </div>
  );
}
