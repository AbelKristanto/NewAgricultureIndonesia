'use client';

import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { VALID_USER_ROLES } from '@/lib/rbac';
import { TRANSACTION_STATUSES, COMMODITIES, INDONESIAN_PROVINCES } from '@/lib/constants';
import { Transaction } from '@/types/transaction';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import MarketIntelligencePanel from '@/components/shared/MarketIntelligencePanel';
import EsgReportPanel from '@/components/shared/EsgReportPanel';
import {
  Shield,
  Users,
  FileSignature,
  BadgeCheck,
  Plus,
  Trash2,
  LogOut,
  ChevronDown,
  ChevronUp,
  FileText,
  Store,
  Route,
  BrainCircuit,
  TrendingUp,
  Leaf,
} from 'lucide-react';

interface AdminAccount {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  institution_name: string | null;
  verification_document_url: string | null;
  email_confirmed_at: string | null;
  created_at?: string;
}

interface PlatformOverview {
  usersByRole: Record<string, number>;
  transactionsByStatus: Record<string, number>;
  listingsByStatus: Record<string, number>;
  activeLogisticsPlans: number;
  aiAnalysesCounts: Record<string, number>;
  totalAiAnalyses: number;
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
  action?: React.ReactNode;
}

function Section({ title, icon, count, children, defaultOpen = false, action }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
      <div className="flex items-center justify-between p-4">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          {icon}
          <span className="font-semibold text-gray-900">{title}</span>
          <Badge variant="secondary">{count}</Badge>
          {open ? <ChevronUp className="h-4 w-4 text-surface-400" /> : <ChevronDown className="h-4 w-4 text-surface-400" />}
        </button>
        {action}
      </div>
      {open && <div className="border-t border-surface-100 p-4">{children}</div>}
    </div>
  );
}

const EMPTY_ACCOUNT_FORM = { email: '', password: '', username: '', role: 'farmer', institutionName: '' };

type TabId = 'users' | 'transactions' | 'marketplace' | 'supply-chain' | 'ai-monitoring' | 'market-intelligence' | 'esg';

export default function AdminPage() {
  const { user, logout } = useAuth();
  const { lang } = useLanguage();
  const isMounted = useRef(true);

  const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'users', label: lang === 'en' ? 'User Monitoring' : 'Monitoring User', icon: <Users className="h-4 w-4" /> },
    { id: 'transactions', label: lang === 'en' ? 'Transaction Monitoring' : 'Monitoring Transaksi', icon: <FileSignature className="h-4 w-4" /> },
    { id: 'marketplace', label: lang === 'en' ? 'Marketplace Monitoring' : 'Monitoring Marketplace', icon: <Store className="h-4 w-4" /> },
    { id: 'supply-chain', label: lang === 'en' ? 'Supply Chain Monitoring' : 'Monitoring Supply Chain', icon: <Route className="h-4 w-4" /> },
    { id: 'ai-monitoring', label: lang === 'en' ? 'AI Monitoring' : 'Monitoring AI', icon: <BrainCircuit className="h-4 w-4" /> },
    { id: 'market-intelligence', label: lang === 'en' ? 'AI Market Intelligence' : 'AI Market Intelligence', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'esg', label: lang === 'en' ? 'Carbon & ESG' : 'Carbon & ESG', icon: <Leaf className="h-4 w-4" /> },
  ];
  const [activeTab, setActiveTab] = useState<TabId>('users');

  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [accountForm, setAccountForm] = useState(EMPTY_ACCOUNT_FORM);
  const [accountCreating, setAccountCreating] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState('');
  const [statusChangingId, setStatusChangingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);
  const [accountActionFeedback, setAccountActionFeedback] = useState<{ text: string; isError: boolean } | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);
  const [txError, setTxError] = useState('');

  const getUserLabel = useCallback((userId: string | null) => {
    if (!userId) return '-';
    const account = accounts.find((a) => a.id === userId);
    return account ? (account.full_name || account.email) : userId.slice(0, 8);
  }, [accounts]);

  const getCommodityLabel = (value: string) =>
    COMMODITIES.find((c) => c.value === value)?.[lang === 'en' ? 'labelEn' : 'labelId'] || value;
  const getProvinceLabel = (value: string) =>
    INDONESIAN_PROVINCES.find((p) => p.value === value)?.[lang === 'en' ? 'labelEn' : 'labelId'] || value;
  const getStatusBadge = (status: string) => {
    const statusDef = TRANSACTION_STATUSES.find((s) => s.value === status);
    const label = statusDef ? (lang === 'en' ? statusDef.labelEn : statusDef.labelId) : status;
    const variant = (statusDef?.color || 'secondary') as 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
    return <Badge variant={variant}>{label}</Badge>;
  };
  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const loadAccounts = useCallback(async () => {
    setAccountsLoading(true);
    try {
      const res = await fetch('/api/admin-panel/accounts');
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) setAccounts(data.data);
    } finally {
      if (isMounted.current) setAccountsLoading(false);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    setTransactionsLoading(true);
    try {
      const res = await fetch('/api/admin-panel/transactions');
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) setTransactions(data.data);
    } finally {
      if (isMounted.current) setTransactionsLoading(false);
    }
  }, []);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const res = await fetch('/api/admin-panel/overview');
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) setOverview(data.data);
    } finally {
      if (isMounted.current) setOverviewLoading(false);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    loadAccounts();
    loadTransactions();
    loadOverview();
    return () => {
      isMounted.current = false;
    };
  }, [loadAccounts, loadTransactions, loadOverview]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountCreating(true);
    setAccountError('');

    try {
      const res = await fetch('/api/admin-panel/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountForm),
      });
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        setAccountForm(EMPTY_ACCOUNT_FORM);
        setShowAccountForm(false);
        await loadAccounts();
      } else {
        setAccountError(data.error || (lang === 'en' ? 'Failed to create account' : 'Gagal membuat akun'));
      }
    } catch {
      if (isMounted.current) setAccountError(lang === 'en' ? 'Network error' : 'Gagal terhubung');
    } finally {
      if (isMounted.current) setAccountCreating(false);
    }
  };

  const pendingAccounts = accounts.filter((a) => a.status === 'pending');

  const handleReview = async (id: string, intent: 'approve' | 'reject') => {
    setReviewingId(id);
    setReviewError('');
    try {
      const res = await fetch(`/api/admin-panel/accounts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent }),
      });
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        await loadAccounts();
      } else {
        setReviewError(data.error || (lang === 'en' ? 'Failed to review account' : 'Gagal meninjau akun'));
      }
    } catch {
      if (isMounted.current) setReviewError(lang === 'en' ? 'Network error' : 'Gagal terhubung');
    } finally {
      if (isMounted.current) setReviewingId(null);
    }
  };

  const handleToggleStatus = async (id: string, intent: 'deactivate' | 'reactivate') => {
    if (intent === 'deactivate') {
      const confirmed = window.confirm(
        lang === 'en'
          ? "Deactivate this account? The user won't be able to sign in until reactivated."
          : 'Nonaktifkan akun ini? Pengguna tidak akan bisa masuk sampai diaktifkan kembali.'
      );
      if (!confirmed) return;
    }

    setStatusChangingId(id);
    setAccountActionFeedback(null);
    try {
      const res = await fetch(`/api/admin-panel/accounts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent }),
      });
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        await loadAccounts();
      } else {
        setAccountActionFeedback({
          text: data.error || (lang === 'en' ? 'Failed to update account' : 'Gagal memperbarui akun'),
          isError: true,
        });
      }
    } catch {
      if (isMounted.current) {
        setAccountActionFeedback({ text: lang === 'en' ? 'Network error' : 'Gagal terhubung', isError: true });
      }
    } finally {
      if (isMounted.current) setStatusChangingId(null);
    }
  };

  const handleResendConfirmation = async (id: string) => {
    setResendingId(id);
    setAccountActionFeedback(null);
    try {
      const res = await fetch(`/api/admin-panel/accounts/${id}/resend-confirmation`, { method: 'POST' });
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        setAccountActionFeedback({
          text: lang === 'en' ? 'Confirmation email resent.' : 'Email konfirmasi terkirim ulang.',
          isError: false,
        });
      } else {
        setAccountActionFeedback({
          text: data.error || (lang === 'en' ? 'Failed to resend email' : 'Gagal mengirim ulang email'),
          isError: true,
        });
      }
    } catch {
      if (isMounted.current) {
        setAccountActionFeedback({ text: lang === 'en' ? 'Network error' : 'Gagal terhubung', isError: true });
      }
    } finally {
      if (isMounted.current) setResendingId(null);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    const confirmed = window.confirm(
      lang === 'en'
        ? 'Delete this transaction permanently? This cannot be undone.'
        : 'Hapus transaksi ini secara permanen? Tindakan ini tidak bisa dibatalkan.'
    );
    if (!confirmed) return;

    setDeletingTxId(id);
    setTxError('');
    try {
      const res = await fetch(`/api/admin-panel/transactions/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        setTransactions((current) => current.filter((tx) => tx.id !== id));
        if (expandedTxId === id) setExpandedTxId(null);
      } else {
        setTxError(data.error || (lang === 'en' ? 'Failed to delete transaction' : 'Gagal menghapus transaksi'));
      }
    } catch {
      if (isMounted.current) setTxError(lang === 'en' ? 'Network error' : 'Gagal terhubung');
    } finally {
      if (isMounted.current) setDeletingTxId(null);
    }
  };

  const roleOptions = VALID_USER_ROLES.filter((r) => r !== 'admin').map((r) => ({ value: r, label: r }));

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gray-900 p-2">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {lang === 'en' ? 'Super Dashboard' : 'Super Dashboard'}
            </h1>
            <p className="text-sm text-surface-500">{user?.email}</p>
          </div>
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={logout}>
          <LogOut className="h-4 w-4 mr-1" />
          {lang === 'en' ? 'Log out' : 'Keluar'}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-surface-200 pb-3">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'bg-gray-900 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Accounts */}
          <Section
            title={lang === 'en' ? 'Accounts' : 'Akun'}
            icon={<Users className="h-5 w-5 text-primary-600" />}
            count={accounts.length}
            defaultOpen
            action={
              <Button type="button" size="sm" onClick={() => setShowAccountForm((v) => !v)}>
                <Plus className="h-4 w-4 mr-1" />
                {lang === 'en' ? 'New account' : 'Buat akun'}
              </Button>
            }
          >
            {showAccountForm && (
              <form onSubmit={handleCreateAccount} className="mb-4 grid grid-cols-1 gap-3 rounded-lg border border-surface-200 bg-surface-50 p-4 sm:grid-cols-2">
                <Input
                  id="new-account-username"
                  label={lang === 'en' ? 'Username' : 'Nama Pengguna'}
                  value={accountForm.username}
                  onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })}
                  required
                />
                <Input
                  id="new-account-email"
                  label={lang === 'en' ? 'Email' : 'Email'}
                  type="email"
                  value={accountForm.email}
                  onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                  required
                />
                <Input
                  id="new-account-password"
                  label={lang === 'en' ? 'Password' : 'Kata Sandi'}
                  type="password"
                  value={accountForm.password}
                  onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
                  required
                />
                <Select
                  id="new-account-role"
                  label={lang === 'en' ? 'Role' : 'Peran'}
                  options={roleOptions}
                  value={accountForm.role}
                  onChange={(e) => setAccountForm({ ...accountForm, role: e.target.value })}
                />
                {(accountForm.role === 'finance' || accountForm.role === 'government') && (
                  <Input
                    id="new-account-institution"
                    label={lang === 'en' ? 'Institution name (optional)' : 'Nama lembaga/instansi (opsional)'}
                    value={accountForm.institutionName}
                    onChange={(e) => setAccountForm({ ...accountForm, institutionName: e.target.value })}
                  />
                )}
                {accountError && (
                  <div className="sm:col-span-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                    {accountError}
                  </div>
                )}
                <div className="sm:col-span-2">
                  <Button type="submit" size="sm" disabled={accountCreating}>
                    {accountCreating ? <Spinner size="sm" /> : (lang === 'en' ? 'Create account' : 'Buat akun')}
                  </Button>
                </div>
              </form>
            )}

            {accountActionFeedback && (
              <div
                className={`mb-3 px-3 py-2 rounded-lg text-sm border ${
                  accountActionFeedback.isError
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-green-50 border-green-200 text-green-700'
                }`}
              >
                {accountActionFeedback.text}
              </div>
            )}
            {accountsLoading ? (
              <Spinner size="sm" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-200">
                      <th className="text-left px-3 py-2 font-medium text-gray-700">{lang === 'en' ? 'Username' : 'Nama'}</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-700">Email</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-700">Role</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-700">Status</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-700">{lang === 'en' ? 'Created' : 'Dibuat'}</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-700">{lang === 'en' ? 'Actions' : 'Aksi'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((a) => (
                      <Fragment key={a.id}>
                        <tr className="border-b border-surface-50">
                          <td className="px-3 py-2 font-medium text-gray-900">{a.full_name}</td>
                          <td className="px-3 py-2 text-gray-600">{a.email}</td>
                          <td className="px-3 py-2"><Badge variant="primary">{a.role}</Badge></td>
                          <td className="px-3 py-2">
                            <Badge variant={a.status === 'approved' ? 'success' : a.status === 'rejected' || a.status === 'deactivated' ? 'danger' : 'warning'}>
                              {a.status}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-gray-500">{a.created_at ? new Date(a.created_at).toLocaleDateString() : '-'}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {a.role === 'admin' ? (
                              <span className="text-surface-300">—</span>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setExpandedAccountId(expandedAccountId === a.id ? null : a.id)}
                                >
                                  {lang === 'en' ? 'Detail' : 'Detail'}
                                </Button>
                                {a.status === 'approved' && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="danger"
                                    disabled={statusChangingId === a.id}
                                    onClick={() => handleToggleStatus(a.id, 'deactivate')}
                                  >
                                    {lang === 'en' ? 'Deactivate' : 'Nonaktifkan'}
                                  </Button>
                                )}
                                {a.status === 'deactivated' && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={statusChangingId === a.id}
                                    onClick={() => handleToggleStatus(a.id, 'reactivate')}
                                  >
                                    {lang === 'en' ? 'Reactivate' : 'Aktifkan kembali'}
                                  </Button>
                                )}
                                {!a.email_confirmed_at && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    disabled={resendingId === a.id}
                                    onClick={() => handleResendConfirmation(a.id)}
                                  >
                                    {lang === 'en' ? 'Resend confirmation' : 'Kirim ulang konfirmasi'}
                                  </Button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                        {expandedAccountId === a.id && (
                          <tr className="border-b border-surface-50 bg-surface-50">
                            <td colSpan={6} className="px-3 py-3">
                              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
                                <div>
                                  <p className="text-surface-500">{lang === 'en' ? 'Institution' : 'Lembaga'}</p>
                                  <p className="font-medium text-gray-900">{a.institution_name || '-'}</p>
                                </div>
                                <div>
                                  <p className="text-surface-500">{lang === 'en' ? 'Email confirmed' : 'Email dikonfirmasi'}</p>
                                  <p className="font-medium text-gray-900">
                                    {a.email_confirmed_at ? (lang === 'en' ? 'Yes' : 'Ya') : (lang === 'en' ? 'No' : 'Belum')}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-surface-500">{lang === 'en' ? 'Created' : 'Dibuat'}</p>
                                  <p className="font-medium text-gray-900">{a.created_at ? new Date(a.created_at).toLocaleString() : '-'}</p>
                                </div>
                              </div>
                              <p className="mt-3 text-xs font-medium text-surface-500">{lang === 'en' ? 'Transactions' : 'Transaksi'}</p>
                              {(() => {
                                const accountTx = transactions.filter((t) => t.buyer_id === a.id || t.farmer_id === a.id);
                                if (accountTx.length === 0) {
                                  return (
                                    <p className="mt-1 text-xs text-surface-400">
                                      {lang === 'en' ? 'No transactions' : 'Tidak ada transaksi'}
                                    </p>
                                  );
                                }
                                return (
                                  <div className="mt-1 space-y-1">
                                    {accountTx.map((t) => (
                                      <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                        <span>
                                          {getCommodityLabel(t.commodity)} —{' '}
                                          {t.buyer_id === a.id
                                            ? `${lang === 'en' ? 'as buyer with' : 'sebagai pembeli dengan'} ${getUserLabel(t.farmer_id)}`
                                            : `${lang === 'en' ? 'as farmer with' : 'sebagai petani dengan'} ${getUserLabel(t.buyer_id)}`}
                                        </span>
                                        <span className="flex items-center gap-2">
                                          {formatCurrency(t.total_value)} {getStatusBadge(t.status)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                    {accounts.length === 0 && (
                      <tr><td colSpan={6} className="px-3 py-6 text-center text-surface-400">{lang === 'en' ? 'No accounts' : 'Belum ada akun'}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* Institution verification */}
          <Section
            title={lang === 'en' ? 'Institution Verification' : 'Verifikasi Institusi'}
            icon={<BadgeCheck className="h-5 w-5 text-green-600" />}
            count={pendingAccounts.length}
            defaultOpen={pendingAccounts.length > 0}
          >
            {reviewError && (
              <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{reviewError}</div>
            )}
            {pendingAccounts.length === 0 ? (
              <p className="text-sm text-surface-400 text-center py-4">
                {lang === 'en' ? 'No accounts awaiting verification.' : 'Tidak ada akun yang menunggu verifikasi.'}
              </p>
            ) : (
              <div className="space-y-3">
                {pendingAccounts.map((a) => (
                  <div key={a.id} className="rounded-lg border border-surface-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">{a.institution_name || a.full_name}</p>
                        <p className="text-sm text-surface-600">{a.email} <Badge variant="primary">{a.role}</Badge></p>
                        {a.verification_document_url ? (
                          <a
                            href={a.verification_document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-sm text-primary-700 hover:underline"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            {lang === 'en' ? 'View document' : 'Lihat dokumen'}
                          </a>
                        ) : (
                          <p className="mt-2 text-xs text-surface-400">
                            {lang === 'en' ? 'No document submitted yet' : 'Belum ada dokumen yang dikirim'}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={reviewingId === a.id}
                          onClick={() => handleReview(a.id, 'approve')}
                        >
                          {lang === 'en' ? 'Approve' : 'Setujui'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={reviewingId === a.id}
                          onClick={() => handleReview(a.id, 'reject')}
                        >
                          {lang === 'en' ? 'Reject' : 'Tolak'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      )}

      {activeTab === 'transactions' && (
        <Section
          title={lang === 'en' ? 'Transactions' : 'Transaksi'}
          icon={<FileSignature className="h-5 w-5 text-indigo-600" />}
          count={transactions.length}
          defaultOpen
        >
          {txError && (
            <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{txError}</div>
          )}
          {transactionsLoading || accountsLoading ? (
            <Spinner size="sm" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-200">
                    <th className="text-left px-3 py-2 font-medium text-gray-700">{lang === 'en' ? 'Buyer' : 'Pembeli'}</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-700">{lang === 'en' ? 'Farmer' : 'Petani'}</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-700">{lang === 'en' ? 'Commodity' : 'Komoditas'}</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-700">{lang === 'en' ? 'Status' : 'Status'}</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-700"></th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <Fragment key={tx.id}>
                      <tr className="border-b border-surface-50">
                        <td className="px-3 py-2 font-medium text-gray-900">{getUserLabel(tx.buyer_id)}</td>
                        <td className="px-3 py-2 text-gray-600">{getUserLabel(tx.farmer_id)}</td>
                        <td className="px-3 py-2 text-gray-600">{getCommodityLabel(tx.commodity)} - {tx.volume} {tx.volume_unit}</td>
                        <td className="px-3 py-2">{getStatusBadge(tx.status)}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setExpandedTxId(expandedTxId === tx.id ? null : tx.id)}
                          >
                            {lang === 'en' ? 'Detail' : 'Detail'}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={deletingTxId === tx.id}
                            onClick={() => handleDeleteTransaction(tx.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                      {expandedTxId === tx.id && (
                        <tr className="border-b border-surface-50 bg-surface-50">
                          <td colSpan={5} className="px-3 py-3">
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
                              <div>
                                <p className="text-surface-500">{lang === 'en' ? 'Price per unit' : 'Harga per unit'}</p>
                                <p className="font-medium text-gray-900">{formatCurrency(tx.price_per_unit)}</p>
                              </div>
                              <div>
                                <p className="text-surface-500">{lang === 'en' ? 'Total value' : 'Total nilai'}</p>
                                <p className="font-medium text-gray-900">{formatCurrency(tx.total_value)}</p>
                              </div>
                              <div>
                                <p className="text-surface-500">{lang === 'en' ? 'Delivery' : 'Pengiriman'}</p>
                                <p className="font-medium text-gray-900">{getProvinceLabel(tx.delivery_province)}{tx.delivery_city ? `, ${tx.delivery_city}` : ''}</p>
                              </div>
                              <div>
                                <p className="text-surface-500">{lang === 'en' ? 'Created' : 'Dibuat'}</p>
                                <p className="font-medium text-gray-900">{new Date(tx.created_at).toLocaleString()}</p>
                              </div>
                            </div>
                            {tx.terms?.note && (
                              <p className="mt-3 text-xs text-surface-600">{tx.terms.note}</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                  {transactions.length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-surface-400">{lang === 'en' ? 'No transactions' : 'Belum ada transaksi'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}

      {activeTab === 'marketplace' && (
        <div className="rounded-xl border border-surface-200 bg-white p-5">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            <Store className="h-4 w-4 text-primary-700" />
            {lang === 'en' ? 'Marketplace listings by status' : 'Listing marketplace berdasarkan status'}
          </h2>
          {overviewLoading ? (
            <Spinner size="sm" />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(overview?.listingsByStatus || {}).map(([status, count]) => (
                <div key={status} className="rounded-lg bg-surface-50 px-3 py-2">
                  <p className="text-xs text-surface-500">{status}</p>
                  <p className="text-xl font-bold text-gray-900">{count}</p>
                </div>
              ))}
              {Object.keys(overview?.listingsByStatus || {}).length === 0 && (
                <p className="col-span-full text-sm text-surface-400">{lang === 'en' ? 'No listings yet.' : 'Belum ada listing.'}</p>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'supply-chain' && (
        <div className="rounded-xl border border-surface-200 bg-white p-5">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            <Route className="h-4 w-4 text-primary-700" />
            {lang === 'en' ? 'Supply chain overview' : 'Ringkasan supply chain'}
          </h2>
          {overviewLoading ? (
            <Spinner size="sm" />
          ) : (
            <div className="rounded-lg bg-surface-50 px-3 py-2 inline-block">
              <p className="text-xs text-surface-500">{lang === 'en' ? 'Logistics plans' : 'Rencana logistik'}</p>
              <p className="text-xl font-bold text-gray-900">{overview?.activeLogisticsPlans ?? 0}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'ai-monitoring' && (
        <div className="rounded-xl border border-surface-200 bg-white p-5">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            <BrainCircuit className="h-4 w-4 text-primary-700" />
            {lang === 'en' ? 'AI analyses run, by feature' : 'Analisis AI yang dijalankan, per fitur'}
          </h2>
          {overviewLoading ? (
            <Spinner size="sm" />
          ) : (
            <>
              <p className="mb-3 text-sm text-surface-600">
                {lang === 'en' ? 'Total: ' : 'Total: '}<span className="font-semibold text-gray-900">{overview?.totalAiAnalyses ?? 0}</span>
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {Object.entries(overview?.aiAnalysesCounts || {}).map(([table, count]) => (
                  <div key={table} className="rounded-lg bg-surface-50 px-3 py-2">
                    <p className="text-xs text-surface-500">{table}</p>
                    <p className="text-xl font-bold text-gray-900">{count}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'market-intelligence' && <MarketIntelligencePanel />}
      {activeTab === 'esg' && <EsgReportPanel />}
    </div>
  );
}
