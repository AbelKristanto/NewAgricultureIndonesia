'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { useLanguage } from '@/contexts/LanguageContext';
import { Transaction } from '@/types/transaction';
import { Payment } from '@/types/payment';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import { CreditCard } from 'lucide-react';

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        callbacks: {
          onSuccess?: (result: unknown) => void;
          onPending?: (result: unknown) => void;
          onError?: (result: unknown) => void;
          onClose?: () => void;
        }
      ) => void;
    };
  }
}

const STATUS_LABEL: Record<string, { en: string; id: string }> = {
  pending: { en: 'Pending', id: 'Menunggu' },
  settlement: { en: 'Paid', id: 'Lunas' },
  capture: { en: 'Paid', id: 'Lunas' },
  deny: { en: 'Denied', id: 'Ditolak' },
  cancel: { en: 'Cancelled', id: 'Dibatalkan' },
  expire: { en: 'Expired', id: 'Kedaluwarsa' },
  failure: { en: 'Failed', id: 'Gagal' },
};

const PAID_STATUSES = ['settlement', 'capture'];

interface PaymentPanelProps {
  transaction: Transaction;
  isBuyer: boolean;
}

export default function PaymentPanel({ transaction, isBuyer }: PaymentPanelProps) {
  const { lang } = useLanguage();
  const isMounted = useRef(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);
  const [snapReady, setSnapReady] = useState(false);

  const loadPayments = () => {
    return fetch(`/api/payments?transactionId=${transaction.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted.current) return;
        if (data.success) setPayments(data.data);
      })
      .catch(() => {
        // Non-critical panel — fail silently.
      });
  };

  useEffect(() => {
    isMounted.current = true;
    setLoading(true);
    loadPayments().finally(() => {
      if (isMounted.current) setLoading(false);
    });
    return () => {
      isMounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transaction.id]);

  const latestPayment = payments[0] ?? null;
  const isPaid = payments.some((p) => PAID_STATUSES.includes(p.status));

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(value);

  const handlePay = async () => {
    if (!window.snap) return;
    setPaying(true);
    setError('');
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: transaction.id }),
      });
      const data = await res.json();
      if (!isMounted.current) return;
      if (!data.success) {
        setError(data.error || (lang === 'en' ? 'Failed to start payment' : 'Gagal memulai pembayaran'));
        setPaying(false);
        return;
      }

      window.snap.pay(data.data.snapToken, {
        onSuccess: () => loadPayments(),
        onPending: () => loadPayments(),
        onError: () => {
          if (isMounted.current) setError(lang === 'en' ? 'Payment failed' : 'Pembayaran gagal');
        },
        onClose: () => loadPayments(),
      });
    } catch {
      if (isMounted.current) setError(lang === 'en' ? 'Network error' : 'Gagal terhubung');
    } finally {
      if (isMounted.current) setPaying(false);
    }
  };

  return (
    <div className="rounded-xl border border-surface-200 p-4 space-y-4">
      {isBuyer && (
        <Script
          src="https://app.sandbox.midtrans.com/snap/snap.js"
          data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
          onLoad={() => setSnapReady(true)}
        />
      )}

      <div className="flex items-center gap-2 text-gray-900">
        <CreditCard className="h-4 w-4 text-primary-700" />
        <h3 className="font-semibold">{lang === 'en' ? 'Payment' : 'Pembayaran'}</h3>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">{error}</div>
      )}

      {loading ? (
        <Spinner size="sm" />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-gray-900">
                {transaction.total_value ? formatCurrency(transaction.total_value) : '-'}
              </p>
              {latestPayment && (
                <p className="text-xs text-surface-500">
                  {latestPayment.payment_type || (lang === 'en' ? 'Payment method pending' : 'Metode pembayaran menyusul')}
                </p>
              )}
            </div>
            <Badge variant={
              !latestPayment ? 'primary'
                : PAID_STATUSES.includes(latestPayment.status) ? 'success'
                : latestPayment.status === 'pending' ? 'warning'
                : 'danger'
            }>
              {latestPayment
                ? (STATUS_LABEL[latestPayment.status]?.[lang === 'en' ? 'en' : 'id'] || latestPayment.status)
                : (lang === 'en' ? 'Not paid yet' : 'Belum dibayar')}
            </Badge>
          </div>

          {isBuyer && !isPaid && (
            <Button
              type="button"
              size="sm"
              disabled={!snapReady || paying}
              loading={paying}
              loadingLabel={lang === 'en' ? 'Starting...' : 'Memulai...'}
              onClick={handlePay}
            >
              {lang === 'en' ? 'Pay now' : 'Bayar sekarang'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
