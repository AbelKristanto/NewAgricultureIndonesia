import { FarmerLogisticsPlan } from '@/types/farmer-operations';

interface DeliveryMapProps {
  plan: Pick<FarmerLogisticsPlan, 'pickup_lat' | 'pickup_lng' | 'current_lat' | 'current_lng' | 'destination_lat' | 'destination_lng'>;
}

export default function DeliveryMap({ plan }: DeliveryMapProps) {
  const points = [
    { label: 'Pickup', lat: Number(plan.pickup_lat), lng: Number(plan.pickup_lng), color: 'bg-green-600' },
    {
      label: 'Current',
      lat: Number(plan.current_lat ?? plan.pickup_lat),
      lng: Number(plan.current_lng ?? plan.pickup_lng),
      color: 'bg-primary-700',
    },
    { label: 'Buyer', lat: Number(plan.destination_lat), lng: Number(plan.destination_lng), color: 'bg-orange-500' },
  ];
  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latRange = Math.max(maxLat - minLat, 0.01);
  const lngRange = Math.max(maxLng - minLng, 0.01);

  return (
    <div className="relative h-72 overflow-hidden rounded-xl border border-primary-100 bg-[linear-gradient(90deg,#e2e8f0_1px,transparent_1px),linear-gradient(#e2e8f0_1px,transparent_1px)] bg-[size:28px_28px] bg-white">
      <div className="absolute inset-4 rounded-lg border border-dashed border-primary-200" />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polyline
          points={points.map((point) => {
            const x = 12 + ((point.lng - minLng) / lngRange) * 76;
            const y = 86 - ((point.lat - minLat) / latRange) * 72;
            return `${x},${y}`;
          }).join(' ')}
          fill="none"
          stroke="#15803d"
          strokeWidth="2"
          strokeDasharray="6 5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {points.map((point) => {
        const left = 12 + ((point.lng - minLng) / lngRange) * 76;
        const top = 86 - ((point.lat - minLat) / latRange) * 72;
        return (
          <div
            key={point.label}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            <div className={`h-4 w-4 rounded-full border-2 border-white shadow ${point.color}`} />
            <span className="mt-1 block whitespace-nowrap rounded bg-white/95 px-2 py-1 text-xs font-medium text-gray-700 shadow-sm">
              {point.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
