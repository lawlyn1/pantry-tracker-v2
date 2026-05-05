'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePantry } from '@/context/PantryContext';
import { getDaysUntilExpiry } from '@/lib/utils/pantry';
import { Location } from '@/types';

export type DashboardTab = 'inventory' | 'add' | 'receipt' | 'shop' | 'recipes';
export type LocationFilter = Location | 'All';

export function usePantryDashboard() {
  const { inventory: pantryInventory, loading, deleteItem, clearInventory } = usePantry();
  const [inventory, setInventory] = useState(pantryInventory);
  const [activeTab, setActiveTab] = useState<DashboardTab>('inventory');
  const [locationFilter, setLocationFilter] = useState<LocationFilter>('All');

  useEffect(() => {
    setInventory(pantryInventory);
  }, [pantryInventory]);

  const expiringItems = useMemo(() => {
    return inventory.filter(item => {
      const days = getDaysUntilExpiry(item);
      return days !== null && days >= 0 && days <= 5;
    });
  }, [inventory]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    const previousInventory = inventory;
    setInventory(currentInventory => currentInventory.filter(item => item.id !== id));

    try {
      await deleteItem(id);
    } catch (err) {
      setInventory(previousInventory);
      alert(err instanceof Error ? err.message : 'Failed to delete item');
    }
  };

  const handleClearPantry = async () => {
    if (!confirm('Are you sure you want to delete ALL items in your pantry? This cannot be undone.')) return;
    const previousInventory = inventory;
    setInventory([]);

    try {
      await clearInventory();
    } catch (err) {
      setInventory(previousInventory);
      alert(err instanceof Error ? err.message : 'Failed to clear pantry');
    }
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
