'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import LanguageToggle from '@/components/shared/LanguageToggle';
import { Clock, FileText, XCircle } from 'lucide-react';

export default function PendingVerificationPage() {
  const { user, logout } = useAuth();
  const { t, lang } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/account/verification-document', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.error || t('common.error'));
      }
    } catch {
      setError(lang === 'en' ? 'Network error' : 'Gagal terhubung');
    } finally {
      setUploading(false);
    }
  };

  const isRejected = user?.status === 'rejected';
  const hasDocument = submitted || Boolean(user?.hasVerificationDocument);

  return (
    <div className="min-h-screen flex items-center justify-center px-8">
      <div className="absolute top-6 right-6 lg:right-auto lg:left-8 lg:top-8">
        <LanguageToggle />
      </div>

      <div className="w-full max-w-md text-center">
        <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
          isRejected ? 'bg-red-100 text-red-700' : 'bg-primary-100 text-primary-700'
        }`}>
          {isRejected ? <XCircle className="h-6 w-6" /> : hasDocument ? <Clock className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
        </div>

        <h1 className="text-2xl font-bold text-gray-900">
          {isRejected ? t('pendingVerification.rejectedTitle') : t('pendingVerification.pendingTitle')}
        </h1>

        {user?.institutionName && (
          <p className="mt-2 text-sm font-medium text-gray-700">{user.institutionName}</p>
        )}

        {isRejected && (
          <p className="mt-3 text-sm text-surface-500">{t('pendingVerification.rejectedBody')}</p>
        )}

        {!isRejected && hasDocument && (
          <p className="mt-3 text-sm text-surface-500">{t('pendingVerification.awaitingReviewBody')}</p>
        )}

        {!isRejected && !hasDocument && (
          <>
            <p className="mt-3 text-sm text-surface-500">{t('pendingVerification.uploadHint')}</p>
            <form onSubmit={handleUpload} className="mt-6 space-y-4 text-left">
              <Input
                id="verification-document"
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                label={t('pendingVerification.uploadLabel')}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
              />
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={!file}
                loading={uploading}
                loadingLabel={lang === 'en' ? 'Uploading...' : 'Mengunggah...'}
              >
                {t('pendingVerification.uploadButton')}
              </Button>
            </form>
          </>
        )}

        <button
          type="button"
          onClick={() => logout()}
          className="mt-6 font-medium text-primary-700 hover:underline"
        >
          {t('pendingVerification.logout')}
        </button>
      </div>
    </div>
  );
}
