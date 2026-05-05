'use client';

import { useMemo } from 'react';
import { LocationFilter } from '@/hooks/usePantryDashboard';
import { formatDate, getDaysUntilExpiry, getExpiryBadge } from '@/lib/utils/pantry';
import { InventoryItem, LOCATIONS } from '@/types';

interface PantryListProps {
  inventory: InventoryItem[];
  loading: boolean;
  locationFilter: LocationFilter;
  onLocationFilterChange: (filter: LocationFilter) => void;
  onDeleteItem: (id: string) => void | Promise<void>;
  onClearPantry: () => void | Promise<void>;
}

export function PantryList({
  inventory,
  loading,
  locationFilter,
  onLocationFilterChange,
  onDeleteItem,
  onClearPantry,
}: PantryListProps) {
  const filteredInventory = useMemo(() => {
    let items = inventory;
    if (locationFilter !== 'All') {
      items = items.filter(i => i.location === locationFilter);
    }
    return items;
  }, [inventory, locationFilter]);

  const groupedByLocation = useMemo(() => {
    const groups: Record<string, InventoryItem[]> = {};
    filteredInventory.forEach(item => {
      const key = item.location;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [filteredInventory]);

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          onClick={() => onLocationFilterChange('All')}
          className={`nav-tab whitespace-nowrap ${locationFilter === 'All' ? 'nav-tab-active' : 'nav-tab-inactive'}`}
        >
          All
        </button>
        {LOCATIONS.map(loc => (
          <button
            key={loc}
            onClick={() => onLocationFilterChange(loc)}
            className={`nav-tab whitespace-nowrap ${locationFilter === loc ? 'nav-tab-active' : 'nav-tab-inactive'}`}
          >
            {loc}
          </button>
        ))}
      </div>

      {inventory.length > 0 && (
        <button
          onClick={() => onClearPantry()}
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
                      onClick={() => onDeleteItem(item.id)}
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
  );
}
