'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SUBSIDY_TYPES, SUBSIDY_STATUSES } from '@/lib/constants';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import { FarmerSubsidy } from '@/types/subsidies';
import { buildSubsidyReportCsv, buildSubsidyReportPdf } from '@/lib/report-export';
import { Landmark, Plus, Pencil, Trash2, Download, FileText } from 'lucide-react';

const EMPTY_FORM = {
  programName: '',
  institutionName: '',
  subsidyType: 'cash',
  amount: '',
  status: 'planned',
  applicationDate: '',
  disbursementDate: '',
  notes: '',
};

export default function SubsidiesPage() {
  const { lang } = useLanguage();
  const isMounted = useRef(true);

  const [subsidies, setSubsidies] = useState<FarmerSubsidy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getLabel = (options: { value: string; labelEn: string; labelId: string }[], value: string | null) =>
    options.find((o) => o.value === value)?.[lang === 'en' ? 'labelEn' : 'labelId'] || value || '-';

  const loadSubsidies = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/subsidies');
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        setSubsidies(data.data);
        setError('');
      } else {
        setError(data.error || (lang === 'en' ? 'Failed to load subsidies' : 'Gagal memuat data subsidi'));
      }
    } catch {
      if (isMounted.current) setError(lang === 'en' ? 'Network error' : 'Gagal terhubung');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    loadSubsidies();
    return () => {
      isMounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  };

  const openEditForm = (subsidy: FarmerSubsidy) => {
    setEditingId(subsidy.id);
    setForm({
      programName: subsidy.program_name,
      institutionName: subsidy.institution_name,
      subsidyType: subsidy.subsidy_type,
      amount: subsidy.amount != null ? String(subsidy.amount) : '',
      status: subsidy.status,
      applicationDate: subsidy.application_date || '',
      disbursementDate: subsidy.disbursement_date || '',
      notes: subsidy.notes || '',
    });
    setFormError('');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');

    const body = {
      programName: form.programName,
      institutionName: form.institutionName,
      subsidyType: form.subsidyType,
      amount: form.amount ? Number(form.amount) : undefined,
      status: form.status,
      applicationDate: form.applicationDate || undefined,
      disbursementDate: form.disbursementDate || undefined,
      notes: form.notes || undefined,
    };

    try {
      const res = await fetch(editingId ? `/api/subsidies/${editingId}` : '/api/subsidies', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        setShowForm(false);
        setEditingId(null);
        setForm(EMPTY_FORM);
        await loadSubsidies();
      } else {
        setFormError(data.error || (lang === 'en' ? 'Failed to save subsidy' : 'Gagal menyimpan data subsidi'));
      }
    } catch {
      if (isMounted.current) setFormError(lang === 'en' ? 'Network error' : 'Gagal terhubung');
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      lang === 'en' ? 'Delete this subsidy record? This cannot be undone.' : 'Hapus catatan subsidi ini? Tindakan ini tidak bisa dibatalkan.'
    );
    if (!confirmed) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/subsidies/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!isMounted.current) return;
      if (data.success) {
        setSubsidies((current) => current.filter((s) => s.id !== id));
      } else {
        setError(data.error || (lang === 'en' ? 'Failed to delete subsidy' : 'Gagal menghapus data subsidi'));
      }
    } catch {
      if (isMounted.current) setError(lang === 'en' ? 'Network error' : 'Gagal terhubung');
    } finally {
      if (isMounted.current) setDeletingId(null);
    }
  };

  const typeOptions = SUBSIDY_TYPES.map((t) => ({ value: t.value, label: lang === 'en' ? t.labelEn : t.labelId }));
  const statusOptions = SUBSIDY_STATUSES.map((s) => ({ value: s.value, label: lang === 'en' ? s.labelEn : s.labelId }));

  const statusVariant = (status: string) =>
    status === 'disbursed' ? 'success' : status === 'rejected' ? 'danger' : status === 'approved' ? 'primary' : 'secondary';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Landmark className="h-6 w-6 text-primary-700" />
            {lang === 'en' ? 'Subsidy Tracking' : 'Pelacakan Subsidi'}
          </h1>
          <p className="mt-1 text-surface-500">
            {lang === 'en'
              ? 'Track government and institutional subsidy programs you apply to or receive.'
              : 'Lacak program subsidi pemerintah atau lembaga yang Anda ajukan atau terima.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={subsidies.length === 0}
            onClick={() => buildSubsidyReportCsv(subsidies)}
          >
            <Download className="mr-1 h-4 w-4" />
            {lang === 'en' ? 'Download CSV' : 'Unduh CSV'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={subsidies.length === 0}
            onClick={() => buildSubsidyReportPdf(subsidies, lang)}
          >
            <FileText className="mr-1 h-4 w-4" />
            {lang === 'en' ? 'Download PDF' : 'Unduh PDF'}
          </Button>
          <Button type="button" size="sm" onClick={openCreateForm}>
            <Plus className="mr-1 h-4 w-4" />
            {lang === 'en' ? 'Add subsidy' : 'Tambah Subsidi'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 rounded-xl border border-surface-200 bg-surface-50 p-4 sm:grid-cols-2">
          <Input
            id="sub-program-name"
            label={lang === 'en' ? 'Program name' : 'Nama program'}
            value={form.programName}
            onChange={(e) => setForm({ ...form, programName: e.target.value })}
            required
          />
          <Input
            id="sub-institution-name"
            label={lang === 'en' ? 'Institution' : 'Lembaga'}
            value={form.institutionName}
            onChange={(e) => setForm({ ...form, institutionName: e.target.value })}
            required
          />
          <Select
            id="sub-type"
            label={lang === 'en' ? 'Subsidy type' : 'Jenis subsidi'}
            options={typeOptions}
            value={form.subsidyType}
            onChange={(e) => setForm({ ...form, subsidyType: e.target.value })}
          />
          <Select
            id="sub-status"
            label={lang === 'en' ? 'Status' : 'Status'}
            options={statusOptions}
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          />
          <Input
            id="sub-amount"
            type="number"
            step="0.01"
            min="0"
            label={lang === 'en' ? 'Amount (optional)' : 'Nominal (opsional)'}
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
          <div />
          <Input
            id="sub-application-date"
            type="date"
            label={lang === 'en' ? 'Application date' : 'Tanggal pengajuan'}
            value={form.applicationDate}
            onChange={(e) => setForm({ ...form, applicationDate: e.target.value })}
          />
          <Input
            id="sub-disbursement-date"
            type="date"
            label={lang === 'en' ? 'Disbursement date' : 'Tanggal pencairan'}
            value={form.disbursementDate}
            onChange={(e) => setForm({ ...form, disbursementDate: e.target.value })}
          />
          <Textarea
            id="sub-notes"
            label={lang === 'en' ? 'Notes (optional)' : 'Catatan (opsional)'}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="sm:col-span-2"
            rows={2}
          />

          {formError && (
            <div className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? <Spinner size="sm" /> : editingId ? (lang === 'en' ? 'Save changes' : 'Simpan perubahan') : (lang === 'en' ? 'Add subsidy' : 'Tambah subsidi')}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setShowForm(false)}>
              {lang === 'en' ? 'Cancel' : 'Batal'}
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : subsidies.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-300 bg-white py-12 text-center text-surface-400">
          {lang === 'en' ? 'No subsidy records yet.' : 'Belum ada catatan subsidi.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subsidies.map((subsidy) => (
            <div key={subsidy.id} className="rounded-xl border border-surface-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-gray-900">{subsidy.program_name}</h3>
                <Badge variant={statusVariant(subsidy.status)}>{getLabel(SUBSIDY_STATUSES, subsidy.status)}</Badge>
              </div>
              <p className="mt-1 text-sm text-surface-600">{subsidy.institution_name}</p>
              <p className="mt-2 text-sm text-gray-700">
                {getLabel(SUBSIDY_TYPES, subsidy.subsidy_type)}
                {subsidy.amount != null ? ` • Rp ${subsidy.amount.toLocaleString('id-ID')}` : ''}
              </p>
              <div className="mt-2 space-y-0.5 text-xs text-surface-500">
                <p>{lang === 'en' ? 'Applied' : 'Diajukan'}: {subsidy.application_date || '-'}</p>
                <p>{lang === 'en' ? 'Disbursed' : 'Dicairkan'}: {subsidy.disbursement_date || '-'}</p>
              </div>
              {subsidy.notes && <p className="mt-2 text-xs text-surface-500">{subsidy.notes}</p>}
              <div className="mt-3 flex gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={() => openEditForm(subsidy)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={deletingId === subsidy.id}
                  onClick={() => handleDelete(subsidy.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
