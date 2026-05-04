'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { InventoryItem, ShoppingListItem, ParsedReceiptItem } from '@/types';

interface PantryContextType {
  inventory: InventoryItem[];
  shoppingList: ShoppingListItem[];
  loading: boolean;
  error: string | null;
  fetchInventory: () => Promise<void>;
  addItem: (item: Omit<InventoryItem, 'id' | 'date_added'>) => Promise<void>;
  addItemsBulk: (items: Omit<InventoryItem, 'id' | 'date_added'>[]) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  clearInventory: () => Promise<void>;
  fetchShoppingList: () => Promise<void>;
  addShoppingItem: (item: Omit<ShoppingListItem, 'id' | 'created_at'>) => Promise<void>;
  toggleShoppingItem: (id: string, checked: boolean) => Promise<void>;
  deleteShoppingItem: (id: string) => Promise<void>;
  clearCheckedItems: () => Promise<void>;
}

const PantryContext = createContext<PantryContextType | undefined>(undefined);

export const PantryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInventory = useCallback(async () => {
    try {
      setError(null);
      const { data, error: err } = await supabase
        .from('inventory')
        .select('*')
        .order('expiration_date', { ascending: true });
      if (err) throw err;
      setInventory(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch inventory');
    }
  }, []);

  const addItem = async (item: Omit<InventoryItem, 'id' | 'date_added'>) => {
    try {
      setError(null);
      const { data, error: err } = await supabase
        .from('inventory')
        .insert(item)
        .select()
        .single();
      if (err) throw err;
      setInventory(prev => [data, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item');
      throw err;
    }
  };

  const addItemsBulk = async (items: Omit<InventoryItem, 'id' | 'date_added'>[]) => {
    try {
      setError(null);
      const { data, error: err } = await supabase
        .from('inventory')
        .insert(items)
        .select();
      if (err) throw err;
      setInventory(prev => [...(data || []), ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add items');
      throw err;
    }
  };

  const deleteItem = async (id: string) => {
    try {
      setError(null);
      const { error: err } = await supabase.from('inventory').delete().eq('id', id);
      if (err) throw err;
      setInventory(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
      throw err;
    }
  };

  const fetchShoppingList = useCallback(async () => {
    try {
      setError(null);
      const { data, error: err } = await supabase
        .from('shopping_list')
        .select('*')
        .order('created_at', { ascending: false });
      if (err) throw err;
      setShoppingList(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch shopping list');
    }
  }, []);

  const addShoppingItem = async (item: Omit<ShoppingListItem, 'id' | 'created_at'>) => {
    try {
      setError(null);
      const { data, error: err } = await supabase
        .from('shopping_list')
        .insert(item)
        .select()
        .single();
      if (err) throw err;
      setShoppingList(prev => [data, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add shopping item');
      throw err;
    }
  };

  const toggleShoppingItem = async (id: string, checked: boolean) => {
    try {
      setError(null);
      const { error: err } = await supabase
        .from('shopping_list')
        .update({ checked })
        .eq('id', id);
      if (err) throw err;
      setShoppingList(prev => prev.map(item => item.id === id ? { ...item, checked } : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item');
      throw err;
    }
  };

  const deleteShoppingItem = async (id: string) => {
    try {
      setError(null);
      const { error: err } = await supabase.from('shopping_list').delete().eq('id', id);
      if (err) throw err;
      setShoppingList(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
      throw err;
    }
  };

  const clearCheckedItems = async () => {
    try {
      setError(null);
      const { error: err } = await supabase
        .from('shopping_list')
        .delete()
        .eq('checked', true);
      if (err) throw err;
      setShoppingList(prev => prev.filter(item => !item.checked));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear items');
      throw err;
    }
  };

  const clearInventory = async () => {
    try {
      setError(null);
      const { error: err } = await supabase.from('inventory').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (err) throw err;
      setInventory([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear inventory');
      throw err;
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchInventory(), fetchShoppingList()]);
      setLoading(false);
    };
    init();
  }, [fetchInventory, fetchShoppingList]);

  return (
    <PantryContext.Provider value={{
      inventory, shoppingList, loading, error,
      fetchInventory, addItem, addItemsBulk, deleteItem, clearInventory,
      fetchShoppingList, addShoppingItem, toggleShoppingItem, deleteShoppingItem, clearCheckedItems,
    }}>
      {children}
    </PantryContext.Provider>
  );
};

export const usePantry = () => {
  const context = useContext(PantryContext);
  if (context === undefined) {
    throw new Error('usePantry must be used within a PantryProvider');
  }
  return context;
};
