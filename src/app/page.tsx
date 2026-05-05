'use client';

import React, { useState, useMemo } from 'react';
import { usePantry } from '@/context/PantryContext';
import { ReceiptImport } from '@/components/ReceiptImport';
import { ManualEntry } from '@/components/ManualEntry';
import { ShoppingList } from '@/components/ShoppingList';
import { RecipeGenerator } from '@/components/RecipeGenerator';
import LogoutButton from '@/components/LogoutButton';
import { LOCATIONS, Location, InventoryItem } from '@/types';

type Tab = 'inventory' | 'add' | 'receipt' | 'shop' | 'recipes';

const TAB_CONFIG: { key: Tab; label: string }[] = [
  { key: 'inventory', label: 'Pantry' },
  { key: 'add', label: 'Add' },
  { key: 'receipt', label: 'Receipt' },
  { key: 'shop', label: 'Shop' },
  { key: 'recipes', label: 'Recipes' },
];

function getDaysUntilExpiry(item: InventoryItem): number | null {
  if (!item.expiration_date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(item.expiration_date);
  return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getExpiryBadge(days: number | null): { text: string; className: string } {
  if (days === null) return { text: '', className: '' };
  if (days < 0) return { text: 'Expired', className: 'bg-red-100 text-red-700' };
  if (days === 0) return { text: 'Today', className: 'bg-red-100 text-red-700' };
  if (days <= 3) return { text: `${days}d left`, className: 'bg-orange-100 text-orange-700' };
  if (days <= 7) return { text: `${days}d left`, className: 'bg-yellow-100 text-yellow-700' };
  return { text: '', className: '' };
}

function formatDate(date: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function Home() {
  const { inventory, loading, deleteItem, clearInventory, fetchInventory } = usePantry();
  const [activeTab, setActiveTab] = useState<Tab>('inventory');
  const [locationFilter, setLocationFilter] = useState<Location | 'All'>('All');

  const filteredInventory = useMemo(() => {
    let items = inventory;
    if (locationFilter !== 'All') {
      items = items.filter(i => i.location === locationFilter);
    }
    return items;
  }, [inventory, locationFilter]);

  const expiringItems = useMemo(() => {
    return inventory.filter(item => {
      const days = getDaysUntilExpiry(item);
      return days !== null && days >= 0 && days <= 5;
    });
  }, [inventory]);

  const groupedByLocation = useMemo(() => {
    const groups: Record<string, InventoryItem[]> = {};
    filteredInventory.forEach(item => {
      const key = item.location;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [filteredInventory]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    try {
      await deleteItem(id);
    } catch {}
  };

  const handleClearPantry = async () => {
    if (!confirm('Are you sure you want to delete ALL items in your pantry? This cannot be undone.')) return;
    try {
      await clearInventory();
    } catch {}
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pb-24">
      {/* Header */}
      <header className="py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Pantry Tracker</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{inventory.length} items</span>
          <LogoutButton />
        </div>
      </header>

      {/* Tab Content */}
      <div className="min-h-[60vh]">
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            {/* Location Filter */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              <button
                onClick={() => setLocationFilter('All')}
                className={`nav-tab whitespace-nowrap ${locationFilter === 'All' ? 'nav-tab-active' : 'nav-tab-inactive'}`}
              >
                All
              </button>
              {LOCATIONS.map(loc => (
                <button
                  key={loc}
                  onClick={() => setLocationFilter(loc)}
                  className={`nav-tab whitespace-nowrap ${locationFilter === loc ? 'nav-tab-active' : 'nav-tab-inactive'}`}
                >
                  {loc}
                </button>
              ))}
            </div>

            {/* Clear Pantry Button */}
            {inventory.length > 0 && (
              <button
                onClick={handleClearPantry}
                className="w-full py-2 px-4 border-2 border-red-500 text-red-500 rounded-xl font-medium text-sm hover:bg-red-50 transition-colors"
              >
                Clear Pantry
              </button>
            )}

            {loading ? (
              <div className="text-center text-gray-400 py-12">Loading...</div>
            ) : filteredInventory.length === 0 ? (
              <div className="text-center text-gray-400 py-12 text-sm">
                {locationFilter === 'All' ? 'Your pantry is empty. Add items or import a receipt.' : `Nothing in ${locationFilter}.`}
              </div>
            ) : (
              Object.entries(groupedByLocation).map(([loc, items]) => (
                <div key={loc}>
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    {loc} ({items.length})
                  </h2>
                  <div className="space-y-2">
                    {items.map(item => {
                      const days = getDaysUntilExpiry(item);
                      const badge = getExpiryBadge(days);
                      const isUrgent = days !== null && days <= 3;

                      return (
                        <div
                          key={item.id}
                          className={`card flex items-center gap-3 ${isUrgent ? 'border-orange-200 bg-orange-50/50' : ''}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">{item.name}</span>
                              {badge.text && (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${badge.className}`}>
                                  {badge.text}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-gray-400">
                                x{item.quantity}{item.volume_weight ? ` - ${item.volume_weight}` : ''}
                              </span>
                              <span className="text-xs text-gray-300">|</span>
                              <span className="text-xs text-gray-400">{item.category}</span>
                              {item.expiration_date && (
                                <>
                                  <span className="text-xs text-gray-300">|</span>
                                  <span className="text-xs text-gray-400">Exp: {formatDate(item.expiration_date)}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-gray-300 hover:text-red-500 transition-colors shrink-0 p-1"
                            aria-label="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'add' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Add Item</h2>
            <ManualEntry />
          </div>
        )}

        {activeTab === 'receipt' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Tesco Receipt Import</h2>
            <ReceiptImport />
          </div>
        )}

        {activeTab === 'shop' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Shopping List</h2>
            <ShoppingList />
          </div>
        )}

        {activeTab === 'recipes' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Recipe Ideas</h2>
            <RecipeGenerator expiringItems={expiringItems} />
          </div>
        )}
      </div>

      {/* Bottom Navigation — fixed on mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2 flex justify-around items-center safe-area-pb z-50">
        {TAB_CONFIG.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all text-xs font-medium ${
              activeTab === tab.key
                ? 'text-blue-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <TabIcon tab={tab.key} active={activeTab === tab.key} />
            <span>{tab.label}</span>
            {tab.key === 'recipes' && expiringItems.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                {expiringItems.length}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}

function TabIcon({ tab, active }: { tab: Tab; active: boolean }) {
  const color = active ? 'text-blue-600' : 'text-gray-400';
  const cls = `w-5 h-5 ${color}`;

  switch (tab) {
    case 'inventory':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      );
    case 'add':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      );
    case 'receipt':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case 'shop':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
        </svg>
      );
    case 'recipes':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      );
  }
}
