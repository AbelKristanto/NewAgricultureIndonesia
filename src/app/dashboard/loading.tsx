import LoadingOverlay from '@/components/shared/LoadingOverlay';

export default function DashboardLoading() {
  return (
    <LoadingOverlay
      title="Memuat halaman..."
      description="Sedang menyiapkan fitur dashboard."
    />
  );
}
