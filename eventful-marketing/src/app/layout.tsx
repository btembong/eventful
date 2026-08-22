import type { Metadata } from 'next';
import { Bricolage_Grotesque, Slackey } from 'next/font/google';
import { AuthProvider } from '@/contexts/auth-context';
import Providers from '@/components/Providers';
import { ToastProvider } from '@/components/Toast';
import './globals.css';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-jakarta',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

const slackey = Slackey({
  subsets: ['latin'],
  variable: '--font-slackey',
  weight: '400',
  display: 'swap',
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Eventful — Discover & Attend Events',
    template: '%s | Eventful',
  },
  description:
    'Find concerts, theater, sports, and cultural events near you. Buy tickets instantly. Show up proud.',
  openGraph: {
    type: 'website',
    siteName: 'Eventful',
    images: [{ url: '/og-default.png', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${slackey.variable}`}>
      <body className="font-sans">
        <Providers>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
