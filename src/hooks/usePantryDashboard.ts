'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePantry } from '@/context/PantryContext';
import { getDaysUntilExpiry } from '@/lib/utils/pantry';
import { InventoryItem, LOCATIONS, Location } from '@/types';

export type DashboardTab = 'inventory' | 'add' | 'receipt' | 'shop' | 'meals' | 'recipes' | 'settings';
export type LocationFilter = Location | 'All';
export type ConsumeMode = 'quantity' | 'weight';
const CUSTOM_LOCATIONS_STORAGE_KEY = 'pantry_custom_locations';

export interface MealLogEntry {
  itemId: string;
  mode: ConsumeMode;
  amount: number;
}

interface ParsedVolumeWeight {
  value: number;
  unit: string;
  decimals: number;
}

type MealOperation =
  | { type: 'delete'; id: string }
  | { type: 'update'; id: string; updates: Partial<Omit<InventoryItem, 'id' | 'date_added'>> };

export function usePantryDashboard() {
  const { inventory: pantryInventory, loading, updateItem, deleteItem, clearInventory } = usePantry();
  const [inventory, setInventory] = useState(pantryInventory);
  const [activeTab, setActiveTab] = useState<DashboardTab>('inventory');
  const [locationFilter, setLocationFilter] = useState<LocationFilter>('All');
  const [customLocations, setCustomLocations] = useState<Location[]>([]);

  const locations = useMemo(() => {
    return Array.from(new Set([...LOCATIONS, ...customLocations]));
  }, [customLocations]);

  useEffect(() => {
    setInventory(pantryInventory);
  }, [pantryInventory]);

  useEffect(() => {
    const storedLocations = window.localStorage.getItem(CUSTOM_LOCATIONS_STORAGE_KEY);
    if (!storedLocations) return;

    try {
      const parsedLocations = JSON.parse(storedLocations);
      if (Array.isArray(parsedLocations)) {
        setCustomLocations(parsedLocations.filter(location => typeof location === 'string' && location.trim()));
      }
    } catch {}
  }, []);

  const persistCustomLocations = (nextLocations: Location[]) => {
    setCustomLocations(nextLocations);
    window.localStorage.setItem(CUSTOM_LOCATIONS_STORAGE_KEY, JSON.stringify(nextLocations));
  };

  const addCustomLocation = (location: string) => {
    const trimmedLocation = location.trim();
    if (!trimmedLocation) return false;
    if (locations.some(existingLocation => existingLocation.toLowerCase() === trimmedLocation.toLowerCase())) {
      alert('That location already exists');
      return false;
    }

    persistCustomLocations([...customLocations, trimmedLocation]);
    return true;
  };

  const deleteCustomLocation = (location: string) => {
    persistCustomLocations(customLocations.filter(customLocation => customLocation !== location));
    if (locationFilter === location) {
      setLocationFilter('All');
    }
  };

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

  const handleConsume = async (id: string, mode: ConsumeMode, amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Enter an amount greater than 0');
      return;
    }

    const item = inventory.find(currentItem => currentItem.id === id);
    if (!item) return;

    const updates = getConsumedItemUpdates(item, mode, amount);

    if (updates === 'delete') {
      await handleDelete(id);
      return;
    }

    if (!updates) {
      alert('This item does not have a valid weight or volume to consume');
      return;
    }

    const previousInventory = inventory;
    setInventory(currentInventory =>
      currentInventory.map(currentItem =>
        currentItem.id === id ? { ...currentItem, ...updates } : currentItem
      )
    );

    try {
      await updateItem(id, updates);
    } catch (err) {
      setInventory(previousInventory);
      alert(err instanceof Error ? err.message : 'Failed to consume item');
    }
  };

  const handleLogMeal = async (mealEntries: MealLogEntry[]) => {
    if (mealEntries.length === 0) {
      alert('Add at least one item to your meal');
      return false;
    }

    const previousInventory = inventory;
    let nextInventory = [...inventory];

    for (const entry of mealEntries) {
      if (!Number.isFinite(entry.amount) || entry.amount <= 0) {
        alert('Every meal item needs an amount greater than 0');
        return false;
      }

      const item = nextInventory.find(currentItem => currentItem.id === entry.itemId);
      if (!item) {
        alert('One of the meal items is no longer available in your pantry');
        return false;
      }

      const updates = getConsumedItemUpdates(item, entry.mode, entry.amount);

      if (updates === 'delete') {
        nextInventory = nextInventory.filter(currentItem => currentItem.id !== entry.itemId);
        continue;
      }

      if (!updates) {
        alert(`${item.name} does not have a valid weight or volume to consume`);
        return false;
      }

      nextInventory = nextInventory.map(currentItem =>
        currentItem.id === entry.itemId ? { ...currentItem, ...updates } : currentItem
      );
    }

    const operations: MealOperation[] = [];

    previousInventory.forEach(previousItem => {
      const nextItem = nextInventory.find(currentItem => currentItem.id === previousItem.id);

      if (!nextItem) {
        operations.push({ type: 'delete', id: previousItem.id });
        return;
      }

      const updates: Partial<Omit<InventoryItem, 'id' | 'date_added'>> = {};

      if (nextItem.quantity !== previousItem.quantity) {
        updates.quantity = nextItem.quantity;
      }

      if (nextItem.volume_weight !== previousItem.volume_weight) {
        updates.volume_weight = nextItem.volume_weight;
      }

      if (Object.keys(updates).length > 0) {
        operations.push({ type: 'update', id: previousItem.id, updates });
      }
    });

    setInventory(nextInventory);

    try {
      await Promise.all(operations.map(operation => {
        if (operation.type === 'delete') {
          return deleteItem(operation.id);
        }

        return updateItem(operation.id, operation.updates);
      }));
      return true;
    } catch (err) {
      setInventory(previousInventory);
      alert(err instanceof Error ? err.message : 'Failed to log meal');
      return false;
    }
  };

  return {
    inventory,
    loading,
    locations,
    customLocations,
    activeTab,
    setActiveTab,
    locationFilter,
    setLocationFilter,
    expiringItems,
    handleDelete,
    handleClearPantry,
    handleConsume,
    handleLogMeal,
    addCustomLocation,
    deleteCustomLocation,
  };
}

function getConsumedItemUpdates(
  item: InventoryItem,
  mode: ConsumeMode,
  amount: number
): Partial<Omit<InventoryItem, 'id' | 'date_added'>> | 'delete' | null {
  if (mode === 'quantity') {
    const nextQuantity = item.quantity - amount;
    if (nextQuantity <= 0) return 'delete';
    return { quantity: nextQuantity };
  }

  const parsedVolumeWeight = parseVolumeWeight(item.volume_weight);
  if (!parsedVolumeWeight) return null;

  const nextValue = parsedVolumeWeight.value - amount;
  if (nextValue <= 0) return 'delete';

  return {
    volume_weight: formatVolumeWeight(nextValue, parsedVolumeWeight),
  };
}

function parseVolumeWeight(volumeWeight: string | null): ParsedVolumeWeight | null {
  if (!volumeWeight) return null;

  const trimmedVolumeWeight = volumeWeight.trim();
  const match = trimmedVolumeWeight.match(/^([+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+))\s*(.*)$/);
  if (!match) return null;

  const valueText = match[1].replace(',', '.');
  const value = Number(valueText);
  if (!Number.isFinite(value)) return null;

  return {
    value,
    unit: match[2].trim(),
    decimals: valueText.includes('.') ? valueText.split('.')[1].length : 0,
  };
}

function formatVolumeWeight(value: number, parsedVolumeWeight: ParsedVolumeWeight): string {
  const decimalPlaces = Math.min(Math.max(parsedVolumeWeight.decimals, 0), 3);
  const formattedValue = value
    .toFixed(decimalPlaces)
    .replace(/\.?0+$/, '');

  return `${formattedValue}${parsedVolumeWeight.unit}`;
}
