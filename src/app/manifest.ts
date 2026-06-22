import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Serenagri AI',
    short_name: 'Serenagri',
    description:
      'AI-powered agricultural intelligence platform for Indonesia.',
    start_url: '/login',
    display: 'standalone',
    background_color: '#fafaf5',
    theme_color: '#047857',
    icons: [
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
