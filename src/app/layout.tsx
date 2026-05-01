import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { PantryProvider } from '@/context/PantryContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Pantry Tracker V2',
  description: 'Track your pantry items, food logs, and receipts',
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
          {children}
        </PantryProvider>
      </body>
    </html>
  );
}
