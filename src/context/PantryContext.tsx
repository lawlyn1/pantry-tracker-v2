'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { createClient } from '@/utils/supabase/client';
import { InventoryItem, ShoppingListItem, ParsedReceiptItem } from '@/types';

interface PantryContextType {
  inventory: InventoryItem[];
  shoppingList: ShoppingListItem[];
  loading: boolean;
  error: string | null;
  user: any;
  fetchInventory: () => Promise<void>;
  addItem: (item: Omit<InventoryItem, 'id' | 'date_added' | 'user_id'>) => Promise<void>;
  addItemsBulk: (items: Omit<InventoryItem, 'id' | 'date_added' | 'user_id'>[]) => Promise<void>;
  updateItem: (id: string, updates: Partial<Omit<InventoryItem, 'id' | 'date_added'>>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  clearInventory: () => Promise<void>;
  fetchShoppingList: () => Promise<void>;
  addShoppingItem: (item: Omit<ShoppingListItem, 'id' | 'created_at' | 'user_id'>) => Promise<void>;
  toggleShoppingItem: (id: string, checked: boolean) => Promise<void>;
  deleteShoppingItem: (id: string) => Promise<void>;
  clearCheckedItems: () => Promise<void>;
}

const PantryContext = createContext<PantryContextType | undefined>(undefined);

export const PantryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const supabase = createClient();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      // Only redirect if not on login page to prevent infinite loop
      if (!user && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    };
    getUser();
  }, [supabase]);

  const fetchInventory = useCallback(async () => {
    if (!user) return;
    try {
      setError(null);
      const { data, error: err } = await supabase
        .from('inventory')
        .select('*')
        .eq('user_id', user.id)
        .order('expiration_date', { ascending: true });
      if (err) throw err;
      setInventory(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch inventory');
    }
  }, [user, supabase]);

  const addItem = async (item: Omit<InventoryItem, 'id' | 'date_added' | 'user_id'>) => {
    if (!user) return;
    try {
      setError(null);
      const { data, error: err } = await supabase
        .from('inventory')
        .insert({ ...item, user_id: user.id })
        .select()
        .single();
      if (err) throw err;
      setInventory(prev => [data, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item');
      throw err;
    }
  };

  const addItemsBulk = async (items: Omit<InventoryItem, 'id' | 'date_added' | 'user_id'>[]) => {
    if (!user) return;
    try {
      setError(null);
      const itemsWithUserId = items.map(item => ({ ...item, user_id: user.id }));
      const { data, error: err } = await supabase
        .from('inventory')
        .insert(itemsWithUserId)
        .select();
      if (err) throw err;
      setInventory(prev => [...(data || []), ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add items');
      throw err;
    }
  };

  const updateItem = async (id: string, updates: Partial<Omit<InventoryItem, 'id' | 'date_added'>>) => {
    try {
      setError(null);
      const { data, error: err } = await supabase
        .from('inventory')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (err) throw err;
      setInventory(prev => prev.map(item => item.id === id ? data : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item');
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
    if (!user) return;
    try {
      setError(null);
      const { data, error: err } = await supabase
        .from('shopping_list')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (err) throw err;
      setShoppingList(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch shopping list');
    }
  }, [user, supabase]);

  const addShoppingItem = async (item: Omit<ShoppingListItem, 'id' | 'created_at' | 'user_id'>) => {
    if (!user) return;
    try {
      setError(null);
      const { data, error: err } = await supabase
        .from('shopping_list')
        .insert({ ...item, user_id: user.id })
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
      inventory, shoppingList, loading, error, user,
      fetchInventory, addItem, addItemsBulk, updateItem, deleteItem, clearInventory,
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
