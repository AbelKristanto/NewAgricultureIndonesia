'use client';

import Spinner from '@/components/ui/Spinner';

interface LoadingOverlayProps {
  title: string;
  description?: string;
}

export default function LoadingOverlay({ title, description }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-surface-200 bg-white p-6 text-center shadow-lg">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-50">
          <Spinner size="md" />
        </div>
        <p className="mt-4 text-base font-semibold text-gray-900">{title}</p>
        {description && <p className="mt-2 text-sm text-surface-500">{description}</p>}
      </div>
    </div>
  );
}
