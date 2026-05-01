'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Ingredient } from '@/types';

export default function PantryPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIngredients = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .order('expiry_date', { ascending: true });
      
      if (error) throw error;
      setIngredients(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch ingredients');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ingredients')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      await fetchIngredients();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete item');
    }
  };

  const handleClearPantry = async () => {
    const confirmed = window.confirm("Are you sure you want to delete ALL items in your pantry? This cannot be undone.");
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('ingredients')
        .delete()
        .not('name', 'is', null);
      
      if (error) throw error;
      
      setIngredients([]);
      alert('Pantry cleared successfully!');
    } catch (err) {
      console.error('Clear pantry error:', err);
      alert(err instanceof Error ? err.message : 'Failed to clear pantry');
    }
  };

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return { status: 'unknown', color: 'bg-gray-100' };
    
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return { status: 'expired', color: 'bg-red-200' };
    } else if (daysUntilExpiry <= 3) {
      return { status: 'expiring-soon', color: 'bg-red-100' };
    } else if (daysUntilExpiry <= 7) {
      return { status: 'expiring', color: 'bg-yellow-100' };
    } else {
      return { status: 'good', color: 'bg-green-50' };
    }
  };

  const handleConsume = async (id: string, currentQuantity: number) => {
    if (currentQuantity <= 1) {
      // If quantity is 1 or less, delete the item
      await handleDelete(id);
      return;
    }

    try {
      const { error } = await supabase
        .from('ingredients')
        .update({ quantity: currentQuantity - 1 })
        .eq('id', id);
      
      if (error) throw error;
      await fetchIngredients();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to consume item');
    }
  };

  const formatExpiryDate = (date: string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  useEffect(() => {
    fetchIngredients();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Pantry Inventory</h1>
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Pantry Inventory</h1>
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Pantry Inventory</h1>
        <div className="flex gap-2">
          <button
            onClick={handleClearPantry}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Clear Pantry
          </button>
          <a
            href="/"
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            Back to Importer
          </a>
        </div>
      </div>
      
      {ingredients.length === 0 ? (
        <div className="p-8 bg-gray-50 rounded-lg text-center text-gray-500">
          Your pantry is empty. Import a receipt to add items.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-3 text-left">Name</th>
                <th className="border border-gray-300 p-3 text-left">Quantity</th>
                <th className="border border-gray-300 p-3 text-left">Size/Weight</th>
                <th className="border border-gray-300 p-3 text-left">Category</th>
                <th className="border border-gray-300 p-3 text-left">Storage</th>
                <th className="border border-gray-300 p-3 text-left">Expiry Date</th>
                <th className="border border-gray-300 p-3 text-right">Kcal (100g)</th>
                <th className="border border-gray-300 p-3 text-right">Protein (g)</th>
                <th className="border border-gray-300 p-3 text-right">Carbs (g)</th>
                <th className="border border-gray-300 p-3 text-right">Fat (g)</th>
                <th className="border border-gray-300 p-3 text-left">Status</th>
                <th className="border border-gray-300 p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map((item) => {
                const { status, color } = getExpiryStatus(item.expiry_date);
                return (
                  <tr key={item.id} className={color}>
                    <td className="border border-gray-300 p-3">
                      <div className="font-medium">{item.name}</div>
                    </td>
                    <td className="border border-gray-300 p-3">{item.quantity} {item.unit}</td>
                    <td className="border border-gray-300 p-3">
                      {item.unit_type === 'item' && item.unit_size === 1 ? '-' : `${item.unit_size}${item.unit_type}`}
                      {item.quantity > 1 && item.unit_type !== 'item' && (
                        <span className="text-xs text-gray-500 block">(Total: {item.quantity * item.unit_size}{item.unit_type})</span>
                      )}
                    </td>
                    <td className="border border-gray-300 p-3">{item.category}</td>
                    <td className="border border-gray-300 p-3 capitalize">{item.storage_location}</td>
                    <td className="border border-gray-300 p-3">{formatExpiryDate(item.expiry_date)}</td>
                    <td className="border border-gray-300 p-3 text-right">{item.calories > 0 ? item.calories : '-'}</td>
                    <td className="border border-gray-300 p-3 text-right">{item.protein_g > 0 ? item.protein_g : '-'}</td>
                    <td className="border border-gray-300 p-3 text-right">{item.carbs_g > 0 ? item.carbs_g : '-'}</td>
                    <td className="border border-gray-300 p-3 text-right">{item.fat_g > 0 ? item.fat_g : '-'}</td>
                    <td className="border border-gray-300 p-3">
                      <span className="px-2 py-1 rounded text-xs font-medium capitalize">
                        {status.replace('-', ' ')}
                      </span>
                    </td>
                    <td className="border border-gray-300 p-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleConsume(item.id, item.quantity)}
                          className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                        >
                          Consume
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
