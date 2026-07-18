import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';

export const dynamic = 'force-dynamic';

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user = null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error('[AdminLayout] Auth error:', error.message);
    }
    user = data?.user ?? null;
  } catch (err) {
    console.error('[AdminLayout] Auth exception:', err);
  }

  if (!user) {
    redirect('/admin/login');
  }

  return (
    <div className="min-h-screen bg-surface-50">
      <ErrorBoundary>
        <RoleGuard>{children}</RoleGuard>
      </ErrorBoundary>
    </div>
  );
}
