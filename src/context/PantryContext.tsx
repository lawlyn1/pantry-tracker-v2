'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Ingredient, FoodLog, ReceiptItem, ReceiptItemLine } from '@/types';

interface PantryContextType {
  user: User | null;
  ingredients: Ingredient[];
  foodLogs: FoodLog[];
  receiptItems: ReceiptItem[];
  loading: boolean;
  error: string | null;
  fetchIngredients: () => Promise<void>;
  addIngredient: (ingredient: Omit<Ingredient, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  addIngredientsBulk: (ingredients: Omit<Ingredient, 'id' | 'created_at' | 'updated_at'>[]) => Promise<void>;
  updateIngredient: (id: string, updates: Partial<Ingredient>) => Promise<void>;
  deleteIngredient: (id: string) => Promise<void>;
  fetchFoodLogs: () => Promise<void>;
  addFoodLog: (log: Omit<FoodLog, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateFoodLog: (id: string, updates: Partial<FoodLog>) => Promise<void>;
  deleteFoodLog: (id: string) => Promise<void>;
  fetchReceiptItems: () => Promise<void>;
  addReceiptItem: (receipt: Omit<ReceiptItem, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateReceiptItem: (id: string, updates: Partial<ReceiptItem>) => Promise<void>;
  deleteReceiptItem: (id: string) => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const PantryContext = createContext<PantryContextType | undefined>(undefined);

export const PantryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUserData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setUser(null);
        setIngredients([]);
        setFoodLogs([]);
        setReceiptItems([]);
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (userError) throw userError;
      setUser(userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user data');
    }
  };

  const fetchIngredients = async () => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setIngredients(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch ingredients');
    }
  };

  const addIngredient = async (ingredient: Omit<Ingredient, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('ingredients')
        .insert(ingredient)
        .select()
        .single();
      
      if (error) throw error;
      setIngredients(prev => [data, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add ingredient');
      throw err;
    }
  };

  const addIngredientsBulk = async (ingredients: Omit<Ingredient, 'id' | 'created_at' | 'updated_at'>[]) => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('ingredients')
        .insert(ingredients)
        .select();
      
      if (error) throw error;
      setIngredients(prev => [...(data || []), ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add ingredients');
      throw err;
    }
  };

  const updateIngredient = async (id: string, updates: Partial<Ingredient>) => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('ingredients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      setIngredients(prev => prev.map(item => item.id === id ? data : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update ingredient');
      throw err;
    }
  };

  const deleteIngredient = async (id: string) => {
    try {
      setError(null);
      const { error } = await supabase
        .from('ingredients')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setIngredients(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete ingredient');
      throw err;
    }
  };

  const fetchFoodLogs = async () => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('food_logs')
        .select('*')
        .order('logged_at', { ascending: false });
      
      if (error) throw error;
      setFoodLogs(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch food logs');
    }
  };

  const addFoodLog = async (log: Omit<FoodLog, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('food_logs')
        .insert(log)
        .select()
        .single();
      
      if (error) throw error;
      setFoodLogs(prev => [data, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add food log');
      throw err;
    }
  };

  const updateFoodLog = async (id: string, updates: Partial<FoodLog>) => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('food_logs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      setFoodLogs(prev => prev.map(item => item.id === id ? data : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update food log');
      throw err;
    }
  };

  const deleteFoodLog = async (id: string) => {
    try {
      setError(null);
      const { error } = await supabase
        .from('food_logs')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setFoodLogs(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete food log');
      throw err;
    }
  };

  const fetchReceiptItems = async () => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('receipt_items')
        .select('*')
        .order('purchase_date', { ascending: false });
      
      if (error) throw error;
      setReceiptItems(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch receipt items');
    }
  };

  const addReceiptItem = async (receipt: Omit<ReceiptItem, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('receipt_items')
        .insert(receipt)
        .select()
        .single();
      
      if (error) throw error;
      setReceiptItems(prev => [data, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add receipt item');
      throw err;
    }
  };

  const updateReceiptItem = async (id: string, updates: Partial<ReceiptItem>) => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('receipt_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      setReceiptItems(prev => prev.map(item => item.id === id ? data : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update receipt item');
      throw err;
    }
  };

  const deleteReceiptItem = async (id: string) => {
    try {
      setError(null);
      const { error } = await supabase
        .from('receipt_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setReceiptItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete receipt item');
      throw err;
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await refreshUserData();
      if (user) {
        await Promise.all([fetchIngredients(), fetchFoodLogs(), fetchReceiptItems()]);
      }
      setLoading(false);
    };

    initializeData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await refreshUserData();
        await Promise.all([fetchIngredients(), fetchFoodLogs(), fetchReceiptItems()]);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIngredients([]);
        setFoodLogs([]);
        setReceiptItems([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const value: PantryContextType = {
    user,
    ingredients,
    foodLogs,
    receiptItems,
    loading,
    error,
    fetchIngredients,
    addIngredient,
    addIngredientsBulk,
    updateIngredient,
    deleteIngredient,
    fetchFoodLogs,
    addFoodLog,
    updateFoodLog,
    deleteFoodLog,
    fetchReceiptItems,
    addReceiptItem,
    updateReceiptItem,
    deleteReceiptItem,
    refreshUserData,
  };

  return <PantryContext.Provider value={value}>{children}</PantryContext.Provider>;
};

export const usePantry = () => {
  const context = useContext(PantryContext);
  if (context === undefined) {
    throw new Error('usePantry must be used within a PantryProvider');
  }
  return context;
};
