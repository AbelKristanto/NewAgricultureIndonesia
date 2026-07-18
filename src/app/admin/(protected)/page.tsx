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
} from 'lucide-react';

interface AdminAccount {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  institution_name: string | null;
  verification_document_url: string | null;
  created_at?: string;
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

export default function AdminPage() {
  const { user, logout } = useAuth();
  const { lang } = useLanguage();
  const isMounted = useRef(true);

  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [accountForm, setAccountForm] = useState(EMPTY_ACCOUNT_FORM);
  const [accountCreating, setAccountCreating] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState('');

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

  useEffect(() => {
    isMounted.current = true;
    loadAccounts();
    loadTransactions();
    return () => {
      isMounted.current = false;
    };
  }, [loadAccounts, loadTransactions]);

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
              {lang === 'en' ? 'Admin Panel' : 'Panel Admin'}
            </h1>
            <p className="text-sm text-surface-500">{user?.email}</p>
          </div>
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={logout}>
          <LogOut className="h-4 w-4 mr-1" />
          {lang === 'en' ? 'Log out' : 'Keluar'}
        </Button>
      </div>

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
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id} className="border-b border-surface-50">
                    <td className="px-3 py-2 font-medium text-gray-900">{a.full_name}</td>
                    <td className="px-3 py-2 text-gray-600">{a.email}</td>
                    <td className="px-3 py-2"><Badge variant="primary">{a.role}</Badge></td>
                    <td className="px-3 py-2">
                      <Badge variant={a.status === 'approved' ? 'success' : a.status === 'rejected' ? 'danger' : 'warning'}>
                        {a.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-gray-500">{a.created_at ? new Date(a.created_at).toLocaleDateString() : '-'}</td>
                  </tr>
                ))}
                {accounts.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-surface-400">{lang === 'en' ? 'No accounts' : 'Belum ada akun'}</td></tr>
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

      {/* Transactions */}
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
    </div>
  );
}
