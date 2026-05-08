'use client';

import { getDaysUntilExpiry } from '@/lib/utils/pantry';
import { InventoryItem } from '@/types';

interface PantryStatsProps {
  inventory: InventoryItem[];
}

export function PantryStats({ inventory }: PantryStatsProps) {
  const expiringSoonCount = inventory.filter(item => {
    const days = getDaysUntilExpiry(item);
    return days !== null && days >= 0 && days <= 5;
  }).length;

  const expiredCount = inventory.filter(item => {
    const days = getDaysUntilExpiry(item);
    return days !== null && days < 0;
  }).length;

  const handleExport = () => {
    const exportText = formatPantryExport(inventory);
    const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pantry_export.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex items-center gap-2 text-xs text-gray-400">
      <span>{inventory.length} items</span>
      {expiringSoonCount > 0 && <span>{expiringSoonCount} expiring</span>}
      {expiredCount > 0 && <span>{expiredCount} expired</span>}
      <button
        type="button"
        onClick={handleExport}
        disabled={inventory.length === 0}
        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Export pantry"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
        </svg>
        Export
      </button>
    </div>
  );
}

function formatPantryExport(inventory: InventoryItem[]): string {
  const header = 'Item Name | Qty | Weight | Location | Expiry';
  const rows = inventory.map(item => [
    item.name,
    item.quantity,
    item.volume_weight || '-',
    item.location,
    item.expiration_date || '-',
  ].join(' | '));

  return [header, ...rows].join('\n');
}
