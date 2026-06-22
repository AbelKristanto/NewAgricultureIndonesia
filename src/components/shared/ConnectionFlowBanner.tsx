'use client';

import { LucideIcon } from 'lucide-react';

interface ConnectionFlowBannerProps {
  title: string;
  description: string;
  leftLabel: string;
  rightLabel: string;
  leftIcon: LucideIcon;
  rightIcon: LucideIcon;
}

export default function ConnectionFlowBanner({
  title,
  description,
  leftLabel,
  rightLabel,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
}: ConnectionFlowBannerProps) {
  return (
    <div className="rounded-xl border border-primary-100 bg-primary-50/60 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary-900">{title}</p>
          <p className="mt-1 text-sm text-surface-600">{description}</p>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-white px-3 py-2 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
            <LeftIcon className="h-4 w-4 text-primary-700" />
            {leftLabel}
          </div>
          <div className="h-px w-8 bg-primary-300" />
          <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-700">
            match
          </span>
          <div className="h-px w-8 bg-primary-300" />
          <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
            <RightIcon className="h-4 w-4 text-primary-700" />
            {rightLabel}
          </div>
        </div>
      </div>
    </div>
  );
}
