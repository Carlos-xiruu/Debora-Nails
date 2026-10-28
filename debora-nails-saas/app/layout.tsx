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
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Debora Nails | Unhas e Maquiagem em Jaraguá do Sul',
  description: 'Unhas, maquiagem e cuidado em cada detalhe para você se sentir bem em Jaraguá do Sul.',
  manifest: '/manifest-landing.json',
  alternates: { canonical: 'https://deboranails.com.br' },
  robots: { index: true, follow: true },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Debora Nails',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: 'Debora Nails | Unhas e Maquiagem',
    description: 'Unhas, maquiagem e cuidado em cada detalhe. Agende seu horário.',
    url: 'https://deboranails.com.br',
    images: [
      {
        url: '/metadados.png',
        width: 800,
        height: 800,
        alt: 'Debora Silva - Nail Designer',
      },
    ],
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Debora Nails | Unhas e Maquiagem',
    description: 'Unhas, maquiagem e cuidado em cada detalhe.',
    images: ['/metadados.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${jakarta.variable} ${playfair.variable}`}>
      <body className="bg-[#0A0205] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
