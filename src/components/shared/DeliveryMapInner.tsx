'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L, { LatLngBoundsExpression, LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FarmerLogisticsPlan } from '@/types/farmer-operations';
import { useLanguage } from '@/contexts/LanguageContext';

export type DeliveryMapPlan = Pick<
  FarmerLogisticsPlan,
  'pickup_lat' | 'pickup_lng' | 'pickup_address' | 'destination_lat' | 'destination_lng' | 'destination_address' | 'current_lat' | 'current_lng' | 'checkpoints' | 'status'
>;

interface DeliveryMapProps {
  plan: DeliveryMapPlan;
}

type RoutePoint = {
  key: string;
  label: string;
  position: LatLngTuple;
  kind: 'pickup' | 'checkpoint-done' | 'checkpoint-current' | 'checkpoint-pending' | 'current' | 'destination';
  time?: string;
  photoUrl?: string | null;
};

const PIN_COLORS: Record<RoutePoint['kind'], string> = {
  pickup: '#16a34a',
  'checkpoint-done': '#94a3b8',
  'checkpoint-current': '#2563eb',
  'checkpoint-pending': '#cbd5e1',
  current: '#2563eb',
  destination: '#ea580c',
};

function buildPinIcon(kind: RoutePoint['kind'], pulse: boolean) {
  const color = PIN_COLORS[kind];
  const pulseRing = pulse
    ? `<span style="position:absolute;inset:-6px;border-radius:9999px;background:${color};opacity:0.35;animation:serenagri-pin-pulse 1.6s ease-out infinite;"></span>`
    : '';
  const html = `
    <div style="position:relative;width:22px;height:22px;">
      ${pulseRing}
      <svg width="22" height="22" viewBox="0 0 24 24" style="position:relative;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.35));">
        <path d="M12 0C6.48 0 2 4.48 2 10c0 7 10 14 10 14s10-7 10-14c0-5.52-4.48-10-10-10z" fill="${color}" stroke="white" stroke-width="1.5"/>
        <circle cx="12" cy="10" r="3.5" fill="white"/>
      </svg>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'serenagri-delivery-pin',
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -20],
  });
}

function FitToRoute({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 13 });
  }, [map, bounds]);
  return null;
}

export default function DeliveryMapInner({ plan }: DeliveryMapProps) {
  const { lang } = useLanguage();

  const points = useMemo<RoutePoint[]>(() => {
    const result: RoutePoint[] = [
      {
        key: 'pickup',
        label: lang === 'en' ? 'Pickup' : 'Titik Jemput',
        position: [Number(plan.pickup_lat), Number(plan.pickup_lng)],
        kind: 'pickup',
      },
    ];

    const sortedCheckpoints = [...(plan.checkpoints || [])].sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
    );

    if (sortedCheckpoints.length > 0) {
      sortedCheckpoints.forEach((checkpoint, idx) => {
        result.push({
          key: `checkpoint-${idx}-${checkpoint.time}`,
          label: checkpoint.label,
          position: [Number(checkpoint.lat), Number(checkpoint.lng)],
          kind: checkpoint.status === 'done' ? 'checkpoint-done' : checkpoint.status === 'current' ? 'checkpoint-current' : 'checkpoint-pending',
          time: checkpoint.time,
          photoUrl: checkpoint.photo_url,
        });
      });
    } else if (
      plan.current_lat != null &&
      plan.current_lng != null &&
      (Number(plan.current_lat) !== Number(plan.pickup_lat) || Number(plan.current_lng) !== Number(plan.pickup_lng))
    ) {
      result.push({
        key: 'current',
        label: lang === 'en' ? 'Current position' : 'Posisi Saat Ini',
        position: [Number(plan.current_lat), Number(plan.current_lng)],
        kind: 'current',
      });
    }

    result.push({
      key: 'destination',
      label: lang === 'en' ? 'Destination' : 'Tujuan',
      position: [Number(plan.destination_lat), Number(plan.destination_lng)],
      kind: 'destination',
    });

    return result.filter((p) => Number.isFinite(p.position[0]) && Number.isFinite(p.position[1]));
  }, [plan, lang]);

  if (points.length < 2) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl border border-surface-200 bg-surface-50 text-sm text-surface-400">
        {lang === 'en' ? 'Insufficient location data.' : 'Data lokasi tidak lengkap.'}
      </div>
    );
  }

  const routeLine = points.map((p) => p.position);
  const bounds: LatLngBoundsExpression = points.map((p) => p.position) as LatLngTuple[];
  const isDelivered = plan.status === 'delivered';

  return (
    <div className="overflow-hidden rounded-xl border border-primary-100">
      <style>{`
        @keyframes serenagri-pin-pulse {
          0% { transform: scale(0.6); opacity: 0.5; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .serenagri-delivery-pin { background: transparent; border: none; }
        .leaflet-popup-content-wrapper { border-radius: 10px; }
      `}</style>
      <MapContainer
        center={points[0].position}
        zoom={11}
        scrollWheelZoom={false}
        style={{ height: '18rem', width: '100%' }}
        attributionControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <FitToRoute bounds={bounds} />
        <Polyline
          positions={routeLine}
          pathOptions={{
            color: isDelivered ? '#16a34a' : '#15803d',
            weight: 3,
            opacity: 0.85,
            dashArray: isDelivered ? undefined : '1 8',
            lineCap: 'round',
          }}
        />
        {points.map((point) => (
          <Marker
            key={point.key}
            position={point.position}
            icon={buildPinIcon(point.kind, point.kind === 'checkpoint-current' || point.kind === 'current')}
          >
            <Popup>
              <div className="text-xs">
                <p className="font-semibold text-gray-900">{point.label}</p>
                {point.time && <p className="mt-0.5 text-surface-500">{new Date(point.time).toLocaleString()}</p>}
                {point.photoUrl && (
                  <img src={point.photoUrl} alt={point.label} className="mt-2 h-16 w-32 rounded object-cover" />
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <div className="flex flex-wrap items-center gap-3 border-t border-surface-100 bg-white px-3 py-2 text-[11px] text-surface-500">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: PIN_COLORS.pickup }} />{lang === 'en' ? 'Pickup' : 'Jemput'}</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: PIN_COLORS['checkpoint-current'] }} />{lang === 'en' ? 'Current' : 'Posisi Kini'}</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: PIN_COLORS['checkpoint-done'] }} />{lang === 'en' ? 'Passed' : 'Terlewati'}</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: PIN_COLORS.destination }} />{lang === 'en' ? 'Destination' : 'Tujuan'}</span>
      </div>
    </div>
  );
}
