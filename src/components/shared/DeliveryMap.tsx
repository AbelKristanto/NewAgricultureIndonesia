'use client';

import dynamic from 'next/dynamic';
import Spinner from '@/components/ui/Spinner';
import type { DeliveryMapPlan } from './DeliveryMapInner';

export type { DeliveryMapPlan };

const DeliveryMapInner = dynamic(() => import('./DeliveryMapInner'), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 items-center justify-center rounded-xl border border-surface-200 bg-surface-50">
      <Spinner size="lg" />
    </div>
  ),
});

interface DeliveryMapProps {
  plan: DeliveryMapPlan;
}

export default function DeliveryMap({ plan }: DeliveryMapProps) {
  return <DeliveryMapInner plan={plan} />;
}
