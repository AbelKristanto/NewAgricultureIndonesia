import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import MobileNav from '@/components/layout/MobileNav';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { ConnectionBanner } from '@/components/error/ConnectionBanner';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user = null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error('[DashboardLayout] Auth error:', error.message);
    }
    user = data?.user ?? null;
  } catch (err) {
    console.error('[DashboardLayout] Auth exception:', err);
  }

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen bg-surface-50">
      <ConnectionBanner />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
          <ErrorBoundary>
            <RoleGuard>
              {children}
            </RoleGuard>
          </ErrorBoundary>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
