import { Inter, JetBrains_Mono } from 'next/font/google';
import { site } from '@/lib/site';
import './globals.css';

const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata = {
  metadataBase: new URL(process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000'),
  title: `${site.name} (${site.ticker}) — keep it breathing`,
  description: site.description,
  openGraph: {
    title: `${site.name} (${site.ticker})`,
    description: site.description,
    images: [{ url: '/og.png', width: 3000, height: 1000 }],
  },
  twitter: { card: 'summary_large_image', title: `${site.name} (${site.ticker})`, description: site.description, images: ['/og.png'] },
};

export const viewport = { themeColor: '#1f5bff' };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
