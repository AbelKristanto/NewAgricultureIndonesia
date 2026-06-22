import type { Metadata } from 'next';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { RoleProvider } from '@/contexts/RoleContext';
import UiSoundEffects from '@/components/shared/UiSoundEffects';
import './globals.css';

export const metadata: Metadata = {
  title: 'Serenagri AI - Agricultural Intelligence Platform',
  description: 'AI-powered agricultural intelligence platform for Indonesia. Optimize food production, supply-demand matching, and agricultural supply chain efficiency.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/logo-mark.png', sizes: '32x32', type: 'image/png' },
      { url: '/logo-mark.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/logo-mark.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <LanguageProvider>
          <AuthProvider>
            <RoleProvider>
              {children}
              <UiSoundEffects />
            </RoleProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
