'use client';

import { FormEvent, useMemo, useState } from 'react';
import { ConsumeMode, LocationFilter } from '@/hooks/usePantryDashboard';
import { formatDate, getDaysUntilExpiry, getExpiryBadge } from '@/lib/utils/pantry';
import { InventoryItem, Location } from '@/types';

interface PantryListProps {
  inventory: InventoryItem[];
  locations: Location[];
  loading: boolean;
  locationFilter: LocationFilter;
  onLocationFilterChange: (filter: LocationFilter) => void;
  onDeleteItem: (id: string) => void | Promise<void>;
  onConsumeItem: (id: string, mode: ConsumeMode, amount: number) => void | Promise<void>;
  onClearPantry: () => void | Promise<void>;
}

export function PantryList({
  inventory,
  locations,
  loading,
  locationFilter,
  onLocationFilterChange,
  onDeleteItem,
  onConsumeItem,
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
        {locations.map(loc => (
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
        <PantrySkeleton />
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
                    <PantryItemCard
                      item={item}
                      badge={badge}
                      onDeleteItem={onDeleteItem}
                      onConsumeItem={onConsumeItem}
                    />
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

function PantryItemCard({
  item,
  badge,
  onDeleteItem,
  onConsumeItem,
}: {
  item: InventoryItem;
  badge: { text: string; className: string };
  onDeleteItem: (id: string) => void | Promise<void>;
  onConsumeItem: (id: string, mode: ConsumeMode, amount: number) => void | Promise<void>;
}) {
  const [isConsuming, setIsConsuming] = useState(false);
  const [consumeMode, setConsumeMode] = useState<ConsumeMode>('quantity');
  const [consumeAmount, setConsumeAmount] = useState('');
  const macros = getMacroBadges(item);

  const handleConsumeSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const amount = Number(consumeAmount);
    await onConsumeItem(item.id, consumeMode, amount);
    setConsumeAmount('');
    setIsConsuming(false);
  };

  return (
    <>
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
        {macros.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {macros.map(macro => (
              <span key={macro.label} className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[10px] font-medium text-slate-500">
                {macro.label}
              </span>
            ))}
          </div>
        )}
        {isConsuming && (
          <form onSubmit={handleConsumeSubmit} className="mt-2 flex flex-wrap items-center gap-1.5">
            <input
              type="number"
              min="0"
              step="0.1"
              value={consumeAmount}
              onChange={(event) => setConsumeAmount(event.target.value)}
              className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Amount"
              required
            />
            <select
              value={consumeMode}
              onChange={(event) => setConsumeMode(event.target.value as ConsumeMode)}
              className="rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="quantity">Qty</option>
              <option value="weight">Weight</option>
            </select>
            <button type="submit" className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600">
              Save
            </button>
            <button type="button" onClick={() => setIsConsuming(false)} className="rounded-lg px-2 py-1 text-xs font-medium text-gray-400">
              Cancel
            </button>
          </form>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => setIsConsuming(value => !value)}
          className="text-gray-300 hover:text-blue-500 transition-colors p-1"
          aria-label="Consume"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
          </svg>
        </button>
        <button
          onClick={() => onDeleteItem(item.id)}
          className="text-gray-300 hover:text-red-500 transition-colors p-1"
          aria-label="Delete"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </>
  );
}

function getMacroBadges(item: InventoryItem): { label: string }[] {
  return [
    item.calories_per_100 !== null ? { label: `${item.calories_per_100} kcal` } : null,
    item.protein_per_100 !== null ? { label: `${item.protein_per_100}g protein` } : null,
    item.carbs_per_100 !== null ? { label: `${item.carbs_per_100}g carbs` } : null,
    item.fat_per_100 !== null ? { label: `${item.fat_per_100}g fat` } : null,
    item.fibre_per_100 !== null ? { label: `${item.fibre_per_100}g fibre` } : null,
  ].filter((macro): macro is { label: string } => macro !== null);
}

function PantrySkeleton() {
  const skeletonCards = [
    { nameWidth: 'w-32', badgeWidth: 'w-12', metaWidth: 'w-16', expiryWidth: 'w-20' },
    { nameWidth: 'w-40', badgeWidth: 'w-14', metaWidth: 'w-20', expiryWidth: 'w-16' },
    { nameWidth: 'w-28', badgeWidth: 'w-10', metaWidth: 'w-14', expiryWidth: 'w-24' },
    { nameWidth: 'w-36', badgeWidth: 'w-12', metaWidth: 'w-24', expiryWidth: 'w-20' },
  ];

  return (
    <div className="animate-pulse">
      <div className="h-3 w-24 rounded bg-gray-200 mb-2" />
      <div className="space-y-2">
        {skeletonCards.map((card, index) => (
          <div key={index} className="card flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className={`h-4 ${card.nameWidth} rounded bg-gray-200`} />
                <div className={`h-4 ${card.badgeWidth} rounded bg-gray-100`} />
              </div>

              <div className="flex items-center gap-2 mt-2">
                <div className="h-3 w-10 rounded bg-gray-100" />
                <div className="h-3 w-1 rounded bg-gray-100" />
                <div className={`h-3 ${card.metaWidth} rounded bg-gray-100`} />
                <div className="h-3 w-1 rounded bg-gray-100" />
                <div className={`h-3 ${card.expiryWidth} rounded bg-gray-100`} />
              </div>
            </div>

            <div className="h-5 w-5 rounded bg-gray-100 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
