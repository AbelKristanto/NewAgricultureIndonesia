import {
  NegotiationAction,
  Transaction,
  TransactionNegotiationEntry,
  TransactionParty,
  TransactionStatus,
  TransactionTerms,
} from '@/types/transaction';

const TRANSACTION_PARTIES: TransactionParty[] = ['buyer', 'farmer'];
const NEGOTIATION_ACTIONS: NegotiationAction[] = [
  'offer_created',
  'proposal_submitted',
  'counter_offer',
  'accepted',
  'rejected',
  'status_updated',
];
const STATUS_TRANSITIONS: Partial<Record<TransactionStatus, TransactionStatus[]>> = {
  draft: ['proposed', 'cancelled'],
  proposed: ['accepted', 'cancelled'],
  accepted: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
};
const TRANSACTION_STATUSES: TransactionStatus[] = [
  'draft',
  'proposed',
  'accepted',
  'in_progress',
  'completed',
  'cancelled',
];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isTransactionParty(value: unknown): value is TransactionParty {
  return typeof value === 'string' && TRANSACTION_PARTIES.includes(value as TransactionParty);
}

function isNegotiationAction(value: unknown): value is NegotiationAction {
  return typeof value === 'string' && NEGOTIATION_ACTIONS.includes(value as NegotiationAction);
}

function isTransactionStatus(value: unknown): value is TransactionStatus {
  return typeof value === 'string' && TRANSACTION_STATUSES.includes(value as TransactionStatus);
}

export function parseTransactionTerms(terms: unknown): TransactionTerms {
  if (!isObject(terms)) {
    return { negotiationHistory: [] };
  }

  const history = Array.isArray(terms.negotiationHistory)
    ? terms.negotiationHistory.filter(isObject).map((entry) => ({
        id: typeof entry.id === 'string' ? entry.id : crypto.randomUUID(),
        actor_id: typeof entry.actor_id === 'string' ? entry.actor_id : '',
        actor_party: isTransactionParty(entry.actor_party) ? entry.actor_party : 'buyer',
        action: isNegotiationAction(entry.action) ? entry.action : 'status_updated',
        status: isTransactionStatus(entry.status) ? entry.status : 'draft',
        price_per_unit:
          typeof entry.price_per_unit === 'number' ? entry.price_per_unit : null,
        start_date: typeof entry.start_date === 'string' ? entry.start_date : null,
        end_date: typeof entry.end_date === 'string' ? entry.end_date : null,
        note: typeof entry.note === 'string' ? entry.note : null,
        created_at:
          typeof entry.created_at === 'string'
            ? entry.created_at
            : new Date().toISOString(),
      }))
    : [];

  return {
    note: typeof terms.note === 'string' ? terms.note : null,
    negotiationHistory: history,
  };
}

export function appendNegotiationEntry(
  currentTerms: unknown,
  entry: TransactionNegotiationEntry
): TransactionTerms {
  const parsedTerms = parseTransactionTerms(currentTerms);

  return {
    ...parsedTerms,
    note: entry.note ?? parsedTerms.note ?? null,
    negotiationHistory: [...(parsedTerms.negotiationHistory || []), entry],
  };
}

export function getLatestNegotiationEntry(
  terms: unknown
): TransactionNegotiationEntry | null {
  const history = parseTransactionTerms(terms).negotiationHistory || [];
  return history.length > 0 ? history[history.length - 1] : null;
}

export function createNegotiationEntry(input: {
  actorId: string;
  actorParty: TransactionParty;
  action: TransactionNegotiationEntry['action'];
  status: TransactionStatus;
  pricePerUnit: number | null;
  startDate: string | null;
  endDate: string | null;
  note?: string | null;
  createdAt?: string;
}): TransactionNegotiationEntry {
  return {
    id: crypto.randomUUID(),
    actor_id: input.actorId,
    actor_party: input.actorParty,
    action: input.action,
    status: input.status,
    price_per_unit: input.pricePerUnit,
    start_date: input.startDate,
    end_date: input.endDate,
    note: input.note?.trim() || null,
    created_at: input.createdAt || new Date().toISOString(),
  };
}

export function calculateTransactionTotalValue(
  volume: number,
  pricePerUnit: number | null | undefined
): number | null {
  if (typeof pricePerUnit !== 'number' || Number.isNaN(pricePerUnit)) {
    return null;
  }

  return volume * pricePerUnit;
}

export function getTransactionParty(
  transaction: Pick<Transaction, 'buyer_id' | 'farmer_id'>,
  userId: string
): TransactionParty | null {
  if (transaction.buyer_id === userId) return 'buyer';
  if (transaction.farmer_id === userId) return 'farmer';
  return null;
}

export function isStatusTransitionAllowed(
  currentStatus: TransactionStatus,
  nextStatus: TransactionStatus
): boolean {
  return STATUS_TRANSITIONS[currentStatus]?.includes(nextStatus) ?? false;
}

export function canRespondToLatestOffer(
  terms: unknown,
  userId: string
): boolean {
  const latestEntry = getLatestNegotiationEntry(terms);
  if (!latestEntry) return true;
  return latestEntry.actor_id !== userId;
}
