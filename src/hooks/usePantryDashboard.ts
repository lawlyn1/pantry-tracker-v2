'use client';

import { useMemo, useState } from 'react';
import { usePantry } from '@/context/PantryContext';
import { getDaysUntilExpiry } from '@/lib/utils/pantry';
import { Location } from '@/types';

export type DashboardTab = 'inventory' | 'add' | 'receipt' | 'shop' | 'recipes';
export type LocationFilter = Location | 'All';

export function usePantryDashboard() {
  const { inventory, loading, deleteItem, clearInventory } = usePantry();
  const [activeTab, setActiveTab] = useState<DashboardTab>('inventory');
  const [locationFilter, setLocationFilter] = useState<LocationFilter>('All');

  const expiringItems = useMemo(() => {
    return inventory.filter(item => {
      const days = getDaysUntilExpiry(item);
      return days !== null && days >= 0 && days <= 5;
    });
  }, [inventory]);

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

  return {
    inventory,
    loading,
    activeTab,
    setActiveTab,
    locationFilter,
    setLocationFilter,
    expiringItems,
    handleDelete,
    handleClearPantry,
  };
}
