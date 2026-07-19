export type NotificationType =
  | 'transaction_created'
  | 'proposal_submitted'
  | 'counter_offer'
  | 'offer_accepted'
  | 'offer_rejected'
  | 'status_updated'
  | 'financing_offer_created'
  | 'financing_requested'
  | 'financing_status_updated'
  | 'payment_initiated'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'account_verification_approved'
  | 'account_verification_rejected'
  | 'account_reactivated'
  | 'community_reply'
  | 'contract_proposed'
  | 'contract_status_updated';

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  related_transaction_id: string | null;
  read: boolean;
  created_at: string;
}

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
  relatedTransactionId?: string | null;
}
