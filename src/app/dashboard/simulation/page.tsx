'use client';

import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import { Users, Wheat, ShoppingCart, Building2, Handshake, CloudSun, FileSignature, ChevronDown, ChevronUp, MapPinned } from 'lucide-react';
import RegionalAnalyticsPanel from '@/components/shared/RegionalAnalyticsPanel';

interface SimulationData {
  profiles: Array<{ id: string; email: string; full_name: string; role: string; province: string }>;
  farmerAnalyses: Array<{ id: string; user_id: string; input: Record<string, unknown>; result: Record<string, unknown>; created_at: string }>;
  buyerAnalyses: Array<{ id: string; user_id: string; input: Record<string, unknown>; result: Record<string, unknown>; created_at: string }>;
  policyAnalyses: Array<{ id: string; user_id: string; input: Record<string, unknown>; result: Record<string, unknown>; created_at: string }>;
  matchingAnalyses: Array<{ id: string; user_id: string; input: Record<string, unknown>; result: Record<string, unknown>; created_at: string }>;
  weatherAnalyses: Array<{ id: string; user_id: string; input: Record<string, unknown>; result: Record<string, unknown>; created_at: string }>;
  transactions: Array<{ id: string; buyer_id: string; farmer_id: string | null; commodity: string; volume: number; volume_unit: string; status: string; created_at: string }>;
  counts: Record<string, number>;
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({ title, icon, count, children, defaultOpen = false }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-surface-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-semibold text-gray-900">{title}</span>
          <Badge variant="secondary">{count}</Badge>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-surface-400" /> : <ChevronDown className="h-4 w-4 text-surface-400" />}
      </button>
      {open && (
        <div className="border-t border-surface-100 p-4">
          {children}
        </div>
      )}
    </div>
  );
}

export default function SimulationPage() {
  const { t, lang } = useLanguage();
  const isMounted = useRef(true);
  const [data, setData] = useState<SimulationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    isMounted.current = true;
    const abortController = new AbortController();

    fetch('/api/admin/simulation', { signal: abortController.signal })
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted.current) return;
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error || t('common.error'));
        }
      })
      .catch((err) => {
        if (!isMounted.current) return;
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(t('common.error'));
      })
      .finally(() => {
        if (isMounted.current) setLoading(false);
      });

    return () => {
      isMounted.current = false;
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
    );
  }

  if (!data) return null;

  const getUserName = (userId: string) => {
    const profile = data.profiles.find((p) => p.id === userId);
    return profile?.full_name || profile?.email || userId.slice(0, 8);
  };

  const getUserRole = (userId: string) => {
    const profile = data.profiles.find((p) => p.id === userId);
    return profile?.role || 'unknown';
  };

  const renderAnalysisTable = (
    analyses: Array<{ id: string; user_id: string; input: Record<string, unknown>; created_at: string }>,
    inputLabel: (input: Record<string, unknown>) => string
  ) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-200">
            <th className="text-left px-3 py-2 font-medium text-gray-700">{t('simulation.user')}</th>
            <th className="text-left px-3 py-2 font-medium text-gray-700">{t('simulation.role')}</th>
            <th className="text-left px-3 py-2 font-medium text-gray-700">{t('simulation.input')}</th>
            <th className="text-left px-3 py-2 font-medium text-gray-700">{t('simulation.date')}</th>
          </tr>
        </thead>
        <tbody>
          {analyses.map((a) => (
            <tr key={a.id} className="border-b border-surface-50">
              <td className="px-3 py-2 font-medium text-gray-900">{getUserName(a.user_id)}</td>
              <td className="px-3 py-2"><Badge variant="primary">{getUserRole(a.user_id)}</Badge></td>
              <td className="px-3 py-2 text-gray-600 max-w-xs truncate">{inputLabel(a.input)}</td>
              <td className="px-3 py-2 text-gray-500">{new Date(a.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
          {analyses.length === 0 && (
            <tr><td colSpan={4} className="px-3 py-6 text-center text-surface-400">{t('simulation.noData')}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('simulation.title')}</h1>
        <p className="text-surface-500 mt-1">{t('simulation.subtitle')}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: t('simulation.users'), count: data.counts.profiles, icon: <Users className="h-5 w-5 text-primary-600" /> },
          { label: t('simulation.farmerLabel'), count: data.counts.farmerAnalyses, icon: <Wheat className="h-5 w-5 text-green-600" /> },
          { label: t('simulation.buyerLabel'), count: data.counts.buyerAnalyses, icon: <ShoppingCart className="h-5 w-5 text-blue-600" /> },
          { label: t('simulation.policyLabel'), count: data.counts.policyAnalyses, icon: <Building2 className="h-5 w-5 text-purple-600" /> },
          { label: t('simulation.matchingLabel'), count: data.counts.matchingAnalyses, icon: <Handshake className="h-5 w-5 text-teal-600" /> },
          { label: t('simulation.weatherLabel'), count: data.counts.weatherAnalyses, icon: <CloudSun className="h-5 w-5 text-orange-500" /> },
          { label: t('simulation.txLabel'), count: data.counts.transactions, icon: <FileSignature className="h-5 w-5 text-indigo-600" /> },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-surface-200 p-4 text-center">
            <div className="flex justify-center mb-2">{card.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{card.count}</div>
            <div className="text-xs text-surface-500 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* AI Regional Analytics */}
      <CollapsibleSection
        title={lang === 'en' ? 'AI Regional Analytics' : 'Analitik Regional AI'}
        icon={<MapPinned className="h-5 w-5 text-primary-600" />}
        count={0}
      >
        <RegionalAnalyticsPanel />
      </CollapsibleSection>

      {/* Users */}
      <CollapsibleSection
        title={t('simulation.usersSection')}
        icon={<Users className="h-5 w-5 text-primary-600" />}
        count={data.counts.profiles}
        defaultOpen
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200">
                <th className="text-left px-3 py-2 font-medium text-gray-700">{t('simulation.name')}</th>
                <th className="text-left px-3 py-2 font-medium text-gray-700">{t('simulation.email')}</th>
                <th className="text-left px-3 py-2 font-medium text-gray-700">{t('simulation.role')}</th>
                <th className="text-left px-3 py-2 font-medium text-gray-700">{t('simulation.province')}</th>
              </tr>
            </thead>
            <tbody>
              {data.profiles.map((p) => (
                <tr key={p.id} className="border-b border-surface-50">
                  <td className="px-3 py-2 font-medium text-gray-900">{p.full_name}</td>
                  <td className="px-3 py-2 text-gray-600">{p.email}</td>
                  <td className="px-3 py-2"><Badge variant="primary">{p.role}</Badge></td>
                  <td className="px-3 py-2 text-gray-600">{p.province}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleSection>

      {/* Farmer Analyses */}
      <CollapsibleSection
        title={t('simulation.farmerAnalyses')}
        icon={<Wheat className="h-5 w-5 text-green-600" />}
        count={data.counts.farmerAnalyses}
      >
        {renderAnalysisTable(data.farmerAnalyses, (inp) => {
          const province = (inp.province as string) || '';
          const crops = (inp.currentCrops as string) || '';
          return `${province} - ${crops}`;
        })}
      </CollapsibleSection>

      {/* Buyer Analyses */}
      <CollapsibleSection
        title={t('simulation.buyerAnalyses')}
        icon={<ShoppingCart className="h-5 w-5 text-blue-600" />}
        count={data.counts.buyerAnalyses}
      >
        {renderAnalysisTable(data.buyerAnalyses, (inp) => {
          const commodity = (inp.commodityType as string) || '';
          const province = (inp.deliveryProvince as string) || '';
          return `${commodity} - ${province}`;
        })}
      </CollapsibleSection>

      {/* Policy Analyses */}
      <CollapsibleSection
        title={t('simulation.policyAnalyses')}
        icon={<Building2 className="h-5 w-5 text-purple-600" />}
        count={data.counts.policyAnalyses}
      >
        {renderAnalysisTable(data.policyAnalyses, (inp) => {
          const type = (inp.analysisType as string) || '';
          const commodities = (inp.commodities as string[]) || [];
          return `${type} - ${commodities.join(', ')}`;
        })}
      </CollapsibleSection>

      {/* Matching Analyses */}
      <CollapsibleSection
        title={t('simulation.matchingAnalyses')}
        icon={<Handshake className="h-5 w-5 text-teal-600" />}
        count={data.counts.matchingAnalyses}
      >
        {renderAnalysisTable(data.matchingAnalyses, (inp) => {
          const commodity = (inp.commodity as string) || '';
          const province = (inp.deliveryProvince as string) || '';
          return `${commodity} - ${province}`;
        })}
      </CollapsibleSection>

      {/* Weather Analyses */}
      <CollapsibleSection
        title={t('simulation.weatherAnalyses')}
        icon={<CloudSun className="h-5 w-5 text-orange-500" />}
        count={data.counts.weatherAnalyses}
      >
        {renderAnalysisTable(data.weatherAnalyses, (inp) => {
          const scenario = (inp.scenario as string) || '';
          const regions = (inp.regions as string[]) || [];
          return `${scenario} - ${regions.join(', ')}`;
        })}
      </CollapsibleSection>

      {/* Transactions */}
      <CollapsibleSection
        title={t('simulation.transactionsSection')}
        icon={<FileSignature className="h-5 w-5 text-indigo-600" />}
        count={data.counts.transactions}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200">
                <th className="text-left px-3 py-2 font-medium text-gray-700">{t('simulation.buyer')}</th>
                <th className="text-left px-3 py-2 font-medium text-gray-700">{t('simulation.farmer')}</th>
                <th className="text-left px-3 py-2 font-medium text-gray-700">{t('transactions.commodity')}</th>
                <th className="text-left px-3 py-2 font-medium text-gray-700">{t('transactions.volume')}</th>
                <th className="text-left px-3 py-2 font-medium text-gray-700">{t('transactions.status')}</th>
                <th className="text-left px-3 py-2 font-medium text-gray-700">{t('simulation.date')}</th>
              </tr>
            </thead>
            <tbody>
              {data.transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-surface-50">
                  <td className="px-3 py-2 font-medium text-gray-900">{getUserName(tx.buyer_id)}</td>
                  <td className="px-3 py-2 text-gray-600">{tx.farmer_id ? getUserName(tx.farmer_id) : '-'}</td>
                  <td className="px-3 py-2 text-gray-600">{tx.commodity}</td>
                  <td className="px-3 py-2 text-gray-600">{tx.volume} {tx.volume_unit}</td>
                  <td className="px-3 py-2">
                    <Badge variant={
                      tx.status === 'completed' ? 'success' :
                      tx.status === 'cancelled' ? 'danger' :
                      tx.status === 'in_progress' ? 'primary' :
                      tx.status === 'proposed' || tx.status === 'accepted' ? 'warning' :
                      'secondary'
                    }>
                      {tx.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-gray-500">{new Date(tx.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {data.transactions.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-surface-400">{t('simulation.noData')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CollapsibleSection>
    </div>
  );
}
