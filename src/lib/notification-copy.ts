import { NotificationType } from '@/types/notification';
import { TransactionParty, TransactionStatus } from '@/types/transaction';

const PARTY_LABEL: Record<TransactionParty, string> = {
  buyer: 'Pembeli',
  farmer: 'Petani',
};

interface NotificationCopy {
  type: NotificationType;
  title: string;
  body: string;
}

/**
 * Builds the notification title/body for a transaction negotiation action.
 * Notification text is Indonesian-only — there's no stored per-user language
 * preference to pick the recipient's UI language server-side.
 */
export function buildNegotiationNotification(
  intent: 'submit_proposal' | 'counter_offer' | 'accept_offer' | 'reject_offer' | 'status_update',
  actorParty: TransactionParty,
  commodityLabel: string,
  status?: TransactionStatus
): NotificationCopy {
  const actor = PARTY_LABEL[actorParty];

  switch (intent) {
    case 'submit_proposal':
      return {
        type: 'proposal_submitted',
        title: `Proposal baru: ${commodityLabel}`,
        body: `${actor} mengajukan proposal untuk transaksi ${commodityLabel}.`,
      };
    case 'counter_offer':
      return {
        type: 'counter_offer',
        title: `Counter-offer: ${commodityLabel}`,
        body: `${actor} mengirim counter-offer untuk transaksi ${commodityLabel}.`,
      };
    case 'accept_offer':
      return {
        type: 'offer_accepted',
        title: `Penawaran diterima: ${commodityLabel}`,
        body: `${actor} menerima penawaran untuk transaksi ${commodityLabel}.`,
      };
    case 'reject_offer':
      return {
        type: 'offer_rejected',
        title: `Penawaran ditolak: ${commodityLabel}`,
        body: `${actor} menolak penawaran untuk transaksi ${commodityLabel}.`,
      };
    case 'status_update':
      return {
        type: 'status_updated',
        title: `Status berubah: ${commodityLabel}`,
        body: `Status transaksi ${commodityLabel} berubah menjadi "${status}".`,
      };
    default:
      return {
        type: 'status_updated',
        title: `Update transaksi: ${commodityLabel}`,
        body: `Ada pembaruan pada transaksi ${commodityLabel}.`,
      };
  }
}

export function buildMatchNotification(commodityLabel: string): NotificationCopy {
  return {
    type: 'transaction_created',
    title: `Listing Anda dicocokkan: ${commodityLabel}`,
    body: `Seorang pembeli membuat transaksi dari listing ${commodityLabel} Anda. Buka Matching untuk menindaklanjuti.`,
  };
}

export function buildFinancingNotification(
  event: 'offer_created' | 'requested' | 'reviewing' | 'approved' | 'rejected',
  institutionName: string,
  productName: string
): NotificationCopy {
  switch (event) {
    case 'offer_created':
      return {
        type: 'financing_offer_created',
        title: `Tawaran pembiayaan baru: ${productName}`,
        body: `${institutionName} menawarkan produk pembiayaan "${productName}" untuk Anda. Cek di Operasional Petani.`,
      };
    case 'requested':
      return {
        type: 'financing_requested',
        title: `Permintaan pembiayaan: ${productName}`,
        body: `Seorang petani mengajukan permintaan untuk produk pembiayaan "${productName}".`,
      };
    case 'reviewing':
      return {
        type: 'financing_status_updated',
        title: `Pembiayaan sedang ditinjau: ${productName}`,
        body: `${institutionName} sedang meninjau pengajuan Anda untuk "${productName}".`,
      };
    case 'approved':
      return {
        type: 'financing_status_updated',
        title: `Pembiayaan disetujui: ${productName}`,
        body: `${institutionName} menyetujui pengajuan Anda untuk "${productName}".`,
      };
    case 'rejected':
      return {
        type: 'financing_status_updated',
        title: `Pembiayaan ditolak: ${productName}`,
        body: `${institutionName} menolak pengajuan Anda untuk "${productName}".`,
      };
  }
}

export function buildPaymentNotification(
  event: 'succeeded' | 'failed',
  commodityLabel: string,
  amount: number
): NotificationCopy {
  const formattedAmount = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);

  if (event === 'succeeded') {
    return {
      type: 'payment_succeeded',
      title: `Pembayaran diterima: ${commodityLabel}`,
      body: `Pembayaran ${formattedAmount} untuk transaksi ${commodityLabel} berhasil dikonfirmasi.`,
    };
  }

  return {
    type: 'payment_failed',
    title: `Pembayaran gagal: ${commodityLabel}`,
    body: `Pembayaran ${formattedAmount} untuk transaksi ${commodityLabel} gagal atau dibatalkan. Silakan coba lagi.`,
  };
}

export function buildAccountVerificationNotification(
  event: 'approved' | 'rejected',
  institutionName: string | null
): NotificationCopy {
  const label = institutionName || 'akun Anda';

  if (event === 'approved') {
    return {
      type: 'account_verification_approved',
      title: 'Verifikasi institusi disetujui',
      body: `Verifikasi untuk ${label} telah disetujui. Anda sekarang punya akses penuh ke Serenagri AI.`,
    };
  }

  return {
    type: 'account_verification_rejected',
    title: 'Verifikasi institusi ditolak',
    body: `Verifikasi untuk ${label} ditolak. Silakan hubungi tim Serenagri AI untuk informasi lebih lanjut.`,
  };
}
