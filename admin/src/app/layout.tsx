import type { Metadata } from 'next';
import { Exo_2 } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/components/providers/AuthProvider';
import './globals.css';

const exo2 = Exo_2({
  subsets: ['latin'],
  weight: '800',
  style: 'italic',
  variable: '--font-exo2',
});

export const metadata: Metadata = {
  title: 'Faniverz Admin',
  description: 'Admin panel for Faniverz movie app',
};

// @invariant: AuthProvider wraps ALL pages including /login. This is intentional —
// the login page needs auth state to redirect already-authenticated users to the
// dashboard. The (dashboard)/layout.tsx handles the actual auth gate for protected pages.
// @coupling: suppressHydrationWarning is required because next-themes injects a
// class attribute on <html> during hydration that differs from the server render.
// Removing it causes React hydration mismatch warnings in the console.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={exo2.variable} suppressHydrationWarning>
      <body className="bg-surface text-on-surface antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
