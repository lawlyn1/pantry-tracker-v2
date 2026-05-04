import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { PantryProvider } from '@/context/PantryContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Pantry Tracker',
  description: 'Track your kitchen inventory, parse receipts, and reduce food waste',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PantryProvider>
          <main className="min-h-screen">
            {children}
          </main>
        </PantryProvider>
      </body>
    </html>
  );
}
