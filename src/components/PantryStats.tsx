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

  return (
    <div className="flex items-center gap-2 text-xs text-gray-400">
      <span>{inventory.length} items</span>
      {expiringSoonCount > 0 && <span>{expiringSoonCount} expiring</span>}
      {expiredCount > 0 && <span>{expiredCount} expired</span>}
    </div>
  );
}
