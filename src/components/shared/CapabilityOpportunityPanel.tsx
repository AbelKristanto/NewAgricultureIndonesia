'use client';

import { LucideIcon } from 'lucide-react';
import Button from '@/components/ui/Button';

export interface CapabilityOpportunity {
  id: string;
  title: string;
  subtitle: string;
  leftLabel: string;
  rightLabel: string;
  metric: string;
  status: string;
  insight: string;
  actionLabel: string;
}

interface CapabilityOpportunityPanelProps {
  title: string;
  description: string;
  icon: LucideIcon;
  opportunities: CapabilityOpportunity[];
  onSelect: (opportunity: CapabilityOpportunity) => void;
}

export default function CapabilityOpportunityPanel({
  title,
  description,
  icon: Icon,
  opportunities,
  onSelect,
}: CapabilityOpportunityPanelProps) {
  return (
    <section className="rounded-xl border border-surface-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary-50 p-2 text-primary-700">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="mt-1 text-sm text-surface-600">{description}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        {opportunities.map((opportunity) => (
          <article key={opportunity.id} className="rounded-lg border border-surface-200 bg-surface-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-gray-900">{opportunity.title}</h3>
                <p className="mt-1 text-sm text-surface-600">{opportunity.subtitle}</p>
              </div>
              <span className="shrink-0 rounded-full bg-primary-100 px-2 py-1 text-xs font-medium text-primary-800">
                {opportunity.metric}
              </span>
            </div>

            <div className="mt-3 rounded-lg border border-white bg-white p-3 text-sm">
              <div className="flex items-center justify-between gap-2 text-xs font-medium uppercase tracking-wide text-surface-500">
                <span>{opportunity.leftLabel}</span>
                <span className="text-primary-600">-&gt;</span>
                <span>{opportunity.rightLabel}</span>
              </div>
              <p className="mt-2 text-gray-700">{opportunity.insight}</p>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-surface-500">{opportunity.status}</span>
              <Button type="button" size="sm" variant="outline" onClick={() => onSelect(opportunity)}>
                {opportunity.actionLabel}
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
