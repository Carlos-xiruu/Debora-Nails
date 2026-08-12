import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Playfair_Display } from 'next/font/google';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#0A0205',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Debora Nails | Alongamentos de Alto Padrão & Maquiagem',
  description: 'Design, durabilidade e sofisticação para as suas unhas e produções exclusivas em Jaraguá do Sul.',
  manifest: '/manifest-landing.json', // O PADRÃO É O DAS CLIENTES
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Debora Nails',
  },
  formatDetection: {
    telephone: false,
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${jakarta.variable} ${playfair.variable}`}>
      <body>{children}</body>
    </html>
  );
}