import { describe, expect, it } from 'vitest';
import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import { buildAuthenticatedUser, resolveUserRole } from './auth-user';

function authUser(overrides: Partial<SupabaseAuthUser> = {}): SupabaseAuthUser {
  return {
    id: 'user-1',
    email: 'buyer@serenagri.com',
    user_metadata: {},
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as SupabaseAuthUser;
}

describe('auth-user helpers', () => {
  it('prefers the database profile role over auth metadata', () => {
    expect(resolveUserRole('finance', 'farmer')).toBe('finance');

    const user = buildAuthenticatedUser(
      authUser({ user_metadata: { username: 'metadata-name', role: 'farmer' } }),
      { username: 'profile-name', role: 'government' }
    );

    expect(user).toMatchObject({
      id: 'user-1',
      email: 'buyer@serenagri.com',
      username: 'profile-name',
      role: 'government',
    });
  });

  it('falls back to auth metadata role, then farmer for invalid or missing roles', () => {
    expect(resolveUserRole(null, 'supplier')).toBe('supplier');
    expect(resolveUserRole('superadmin', 'owner')).toBe('farmer');
  });
});
