'use client';

import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { createClient } from '@/lib/supabase/client';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { BarChart3, Wheat, ShoppingCart, MessageSquare, Activity, FileText } from 'lucide-react';
import Link from 'next/link';

function timeAgo(dateStr: string, lang: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (lang === 'id') {
    if (mins < 60) return `${mins} menit lalu`;
    if (hours < 24) return `${hours} jam lalu`;
    return `${days} hari lalu`;
  }
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function DashboardPage() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const { role } = useRole();
  const supabaseRef = useRef(createClient());

  const [metrics, setMetrics] = useState({ farmerCount: 0, buyerCount: 0, policyCount: 0, chatCount: 0 });
  const [recentItems, setRecentItems] = useState<{ type: string; title: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const supabase = supabaseRef.current;

    async function load() {
      try {
        const [farmer, buyer, policy, chat] = await Promise.all([
          supabase.from('farmer_analyses').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
          supabase.from('buyer_analyses').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
          supabase.from('policy_analyses').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
          supabase.from('chat_conversations').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
        ]);

        setMetrics({
          farmerCount: farmer.count ?? 0,
          buyerCount: buyer.count ?? 0,
          policyCount: policy.count ?? 0,
          chatCount: chat.count ?? 0,
        });

        // Fetch recent activity
        const [farmerRes, buyerRes, policyRes, chatRes] = await Promise.all([
          supabase.from('farmer_analyses').select('input, created_at').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(3),
          supabase.from('buyer_analyses').select('input, created_at').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(3),
          supabase.from('policy_analyses').select('input, created_at').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(3),
          supabase.from('chat_conversations').select('title, created_at').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(3),
        ]);

        const items: { type: string; title: string; created_at: string }[] = [];

        for (const row of farmerRes.data || []) {
          const input = row.input as Record<string, string> | null;
          items.push({ type: 'Farmer', title: input ? `${input.province || ''} - ${input.currentCrops || ''}` : 'Farmer Analysis', created_at: row.created_at });
        }
        for (const row of buyerRes.data || []) {
          const input = row.input as Record<string, string> | null;
          items.push({ type: 'Buyer', title: input ? `${input.commodityType || ''}` : 'Buyer Sourcing', created_at: row.created_at });
        }
        for (const row of policyRes.data || []) {
          const input = row.input as Record<string, string[]> | null;
          items.push({ type: 'Policy', title: input?.regions?.slice(0, 2).join(', ') || 'Policy Analysis', created_at: row.created_at });
        }
        for (const row of chatRes.data || []) {
          items.push({ type: 'Chat', title: row.title || 'Chat', created_at: row.created_at });
        }

        items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setRecentItems(items.slice(0, 5));
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user]);

  const metricCards = role === 'buyer'
    ? [
        { labelKey: 'dashboard.metrics.buyerAnalyses', value: metrics.buyerCount, icon: ShoppingCart, color: 'text-primary-600 bg-primary-50' },
        { labelKey: 'dashboard.metrics.farmerAnalyses', value: metrics.farmerCount, icon: Wheat, color: 'text-secondary-600 bg-secondary-50' },
        { labelKey: 'dashboard.metrics.policyAnalyses', value: metrics.policyCount, icon: FileText, color: 'text-blue-600 bg-blue-50' },
        { labelKey: 'dashboard.metrics.chatConversations', value: metrics.chatCount, icon: MessageSquare, color: 'text-green-600 bg-green-50' },
      ]
    : role === 'government'
    ? [
        { labelKey: 'dashboard.metrics.policyAnalyses', value: metrics.policyCount, icon: FileText, color: 'text-primary-600 bg-primary-50' },
        { labelKey: 'dashboard.metrics.farmerAnalyses', value: metrics.farmerCount, icon: Wheat, color: 'text-secondary-600 bg-secondary-50' },
        { labelKey: 'dashboard.metrics.buyerAnalyses', value: metrics.buyerCount, icon: ShoppingCart, color: 'text-blue-600 bg-blue-50' },
        { labelKey: 'dashboard.metrics.chatConversations', value: metrics.chatCount, icon: MessageSquare, color: 'text-green-600 bg-green-50' },
      ]
    : [
        { labelKey: 'dashboard.metrics.farmerAnalyses', value: metrics.farmerCount, icon: Wheat, color: 'text-primary-600 bg-primary-50' },
        { labelKey: 'dashboard.metrics.buyerAnalyses', value: metrics.buyerCount, icon: ShoppingCart, color: 'text-secondary-600 bg-secondary-50' },
        { labelKey: 'dashboard.metrics.policyAnalyses', value: metrics.policyCount, icon: FileText, color: 'text-blue-600 bg-blue-50' },
        { labelKey: 'dashboard.metrics.chatConversations', value: metrics.chatCount, icon: MessageSquare, color: 'text-green-600 bg-green-50' },
      ];

  const quickActions = [
    { href: '/dashboard/farmer', labelKey: 'dashboard.actions.analyzeMyLand', icon: Wheat },
    { href: '/dashboard/buyer', labelKey: 'dashboard.actions.findSuppliers', icon: ShoppingCart },
    { href: '/dashboard/policy', labelKey: 'dashboard.actions.policyInsights', icon: BarChart3 },
    { href: '/dashboard/chat', labelKey: 'dashboard.actions.chatWithAI', icon: Activity },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t('dashboard.welcome')}, {user?.username || 'User'}
        </h1>
        <p className="text-surface-500 mt-1">{t('dashboard.overview')}</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((m) => {
          const Icon = m.icon;
          return (
            <Card key={m.labelKey}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-surface-500 uppercase tracking-wide">
                    {t(m.labelKey)}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {loading ? <Spinner size="sm" /> : m.value}
                  </p>
                </div>
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${m.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.quickActions')}</h2>
          <div className="space-y-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-primary-50 transition-colors group"
                >
                  <div className="h-9 w-9 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                    <Icon className="h-4 w-4 text-primary-700" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-primary-700">
                    {t(action.labelKey)}
                  </span>
                </Link>
              );
            })}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.recentActivity')}</h2>
          {loading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : recentItems.length === 0 ? (
            <p className="text-sm text-surface-400 py-4">{t('dashboard.noActivity')}</p>
          ) : (
            <div className="space-y-4">
              {recentItems.map((item, i) => (
                <div key={i} className="flex items-start gap-3 pb-4 border-b border-surface-100 last:border-0 last:pb-0">
                  <div className="h-2 w-2 rounded-full bg-primary-500 mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-surface-400">{timeAgo(item.created_at, lang)}</span>
                      <span className="text-xs bg-surface-100 text-surface-500 px-2 py-0.5 rounded-full">{item.type}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
