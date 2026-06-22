import { describe, expect, it } from 'vitest';
import {
  appendNegotiationEntry,
  calculateTransactionTotalValue,
  canRespondToLatestOffer,
  createNegotiationEntry,
  getLatestNegotiationEntry,
  canAccessTransaction,
  getTransactionParticipantLabel,
  getTransactionParty,
  isStatusTransitionAllowed,
  parseTransactionTerms,
} from './transaction-negotiation';

describe('transaction-negotiation helpers', () => {
  it('parses empty terms safely', () => {
    expect(parseTransactionTerms(null)).toEqual({
      negotiationHistory: [],
    });
  });

  it('appends negotiation entries and updates the latest note', () => {
    const entry = createNegotiationEntry({
      actorId: 'buyer-1',
      actorParty: 'buyer',
      action: 'offer_created',
      status: 'draft',
      pricePerUnit: 12000,
      startDate: '2026-06-10',
      endDate: '2026-06-20',
      note: 'Initial offer',
      createdAt: '2026-06-03T10:00:00.000Z',
    });

    const nextTerms = appendNegotiationEntry(null, entry);

    expect(nextTerms.note).toBe('Initial offer');
    expect(nextTerms.negotiationHistory).toHaveLength(1);
    expect(nextTerms.negotiationHistory?.[0]).toMatchObject({
      actor_id: 'buyer-1',
      action: 'offer_created',
      status: 'draft',
    });
  });

  it('returns the latest negotiation entry', () => {
    const first = createNegotiationEntry({
      actorId: 'buyer-1',
      actorParty: 'buyer',
      action: 'offer_created',
      status: 'draft',
      pricePerUnit: 12000,
      startDate: null,
      endDate: null,
      createdAt: '2026-06-03T10:00:00.000Z',
    });
    const second = createNegotiationEntry({
      actorId: 'farmer-1',
      actorParty: 'farmer',
      action: 'counter_offer',
      status: 'proposed',
      pricePerUnit: 12500,
      startDate: null,
      endDate: null,
      createdAt: '2026-06-03T11:00:00.000Z',
    });

    const terms = appendNegotiationEntry(appendNegotiationEntry(null, first), second);

    expect(getLatestNegotiationEntry(terms)?.actor_id).toBe('farmer-1');
    expect(getLatestNegotiationEntry(terms)?.action).toBe('counter_offer');
  });

  it('calculates total value only when price exists', () => {
    expect(calculateTransactionTotalValue(10, 15000)).toBe(150000);
    expect(calculateTransactionTotalValue(10, null)).toBeNull();
  });

  it('resolves transaction party from user id', () => {
    expect(getTransactionParty({ buyer_id: 'buyer-1', farmer_id: 'farmer-1' }, 'buyer-1')).toBe('buyer');
    expect(getTransactionParty({ buyer_id: 'buyer-1', farmer_id: 'farmer-1' }, 'farmer-1')).toBe('farmer');
    expect(getTransactionParty({ buyer_id: 'buyer-1', farmer_id: 'farmer-1' }, 'other')).toBeNull();
  });

  it('allows additional transaction participants from terms', () => {
    const transaction = {
      buyer_id: 'buyer-1',
      farmer_id: 'farmer-1',
      terms: {
        participants: [
          { user_id: 'supplier-1', role: 'supplier', label: 'Supplier' },
        ],
      },
    };

    expect(canAccessTransaction(transaction, 'supplier-1')).toBe(true);
    expect(getTransactionParticipantLabel(transaction, 'supplier-1')).toBe('Supplier');
    expect(canAccessTransaction(transaction, 'other')).toBe(false);
  });

  it('validates allowed status transitions', () => {
    expect(isStatusTransitionAllowed('draft', 'proposed')).toBe(true);
    expect(isStatusTransitionAllowed('accepted', 'in_progress')).toBe(true);
    expect(isStatusTransitionAllowed('proposed', 'completed')).toBe(false);
  });

  it('requires the latest offer to come from the other party before responding', () => {
    const entry = createNegotiationEntry({
      actorId: 'buyer-1',
      actorParty: 'buyer',
      action: 'proposal_submitted',
      status: 'proposed',
      pricePerUnit: 12000,
      startDate: null,
      endDate: null,
      createdAt: '2026-06-03T10:00:00.000Z',
    });
    const terms = appendNegotiationEntry(null, entry);

    expect(canRespondToLatestOffer(terms, 'farmer-1')).toBe(true);
    expect(canRespondToLatestOffer(terms, 'buyer-1')).toBe(false);
  });
});
