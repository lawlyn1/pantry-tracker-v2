'use client';

import { usePantry } from '@/context/PantryContext';
import { Auth } from '@/components/Auth';
import { ReceiptImport } from '@/components/ReceiptImport';

export default function Home() {
  const { user, loading } = usePantry();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return (
      <div>
        <h1>Welcome to Pantry Tracker V2</h1>
        <Auth />
      </div>
    );
  }

  return (
    <div>
      <h1>Welcome, {user.full_name || user.email}!</h1>
      <p>You are logged in. Your pantry data is ready.</p>
      <ReceiptImport />
    </div>
  );
}
