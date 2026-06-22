'use client';

import { useState } from 'react';
import { Info, X } from 'lucide-react';

interface FormInfoButtonProps {
  title: string;
  description: string;
  tips?: string[];
}

export default function FormInfoButton({ title, description, tips = [] }: FormInfoButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        aria-expanded={open}
      >
        <Info className="h-3.5 w-3.5" />
        Info
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-surface-200 bg-white p-4 text-sm shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-gray-900">{title}</p>
              <p className="mt-1 text-surface-600">{description}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-surface-400 hover:bg-surface-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label="Close info"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {tips.length > 0 && (
            <ul className="mt-3 space-y-2 text-xs text-surface-600">
              {tips.map((tip) => (
                <li key={tip} className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-500" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
