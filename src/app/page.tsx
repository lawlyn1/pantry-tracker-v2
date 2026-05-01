'use client';

import React, { useState } from 'react';
import { usePantry } from '@/context/PantryContext';
import { Auth } from '@/components/Auth';
import { ReceiptImport } from '@/components/ReceiptImport';
import { ManualEntry } from '@/components/ManualEntry';

export default function Home() {
  const { user, loading } = usePantry();
  const [activeTab, setActiveTab] = useState<'receipt' | 'manual'>('receipt');

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
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Welcome, {user.full_name || user.email}!</h1>
        <a
          href="/pantry"
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
        >
          View Pantry
        </a>
      </div>
      
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('receipt')}
          className={`px-6 py-2 rounded-lg ${
            activeTab === 'receipt'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Receipt Import
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`px-6 py-2 rounded-lg ${
            activeTab === 'manual'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Manual Entry
        </button>
      </div>

      {activeTab === 'receipt' ? <ReceiptImport /> : <ManualEntry />}
    </div>
  );
}
