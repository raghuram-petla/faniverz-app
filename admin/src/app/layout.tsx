import type { Metadata } from 'next';
import { Exo_2 } from 'next/font/google';
import './globals.css';

const exo2 = Exo_2({
  subsets: ['latin'],
  weight: '800',
  style: 'italic',
  variable: '--font-exo2',
});

export const metadata: Metadata = {
  title: 'Faniverz Admin',
  description: 'Admin panel for Faniverz Telugu cinema app',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${exo2.variable}`}>
      <body className="bg-zinc-950 text-white antialiased">{children}</body>
    </html>
  );
}
