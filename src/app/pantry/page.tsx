'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Ingredient } from '@/types';
import { ReceiptImport } from '@/components/ReceiptImport';
import { ManualEntry } from '@/components/ManualEntry';
import { getDisplayAmount, formatExpiryDate } from '@/lib/utils/pantryHelpers';

export default function PantryPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pantry' | 'receipt' | 'manual'>('pantry');
  const [groupBy, setGroupBy] = useState<'storage' | 'category'>('storage');
  const [toast, setToast] = useState<string | null>(null);
  const [activePortionId, setActivePortionId] = useState<string | null>(null);
  const [portionInput, setPortionInput] = useState('');
  const [portionUnit, setPortionUnit] = useState('g');

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

  const handleConsume = async (id: string, currentQuantity: number, unitType: string, itemName: string) => {
    // Define standard portions based on unit type
    let portionSize: number;
    let portionUnit: string;
    
    if (unitType === 'g') {
      portionSize = 100; // Standard cooking portion
      portionUnit = 'g';
    } else if (unitType === 'ml') {
      portionSize = 250; // Standard glass/cup
      portionUnit = 'ml';
    } else {
      portionSize = 1; // For items
      portionUnit = 'item';
    }

    const newQuantity = currentQuantity - portionSize;
    
    console.log(`[DEBUG] Consuming: ${portionSize}${portionUnit} from ${itemName} (current: ${currentQuantity}${unitType}, new: ${newQuantity}${unitType})`);
    
    if (newQuantity <= 0) {
      // If consumption would result in ≤ 0, delete the item
      await handleDelete(id);
      setToast(`Finished ${portionSize}${portionUnit} - item removed`);
      console.log(`[DEBUG] Item ${itemName} deleted (quantity would be ≤ 0)`);
    } else {
      try {
        const { data, error, status } = await supabase
          .from('ingredients')
          .update({ quantity: newQuantity })
          .eq('id', id)
          .select();
      
        console.log('Update Result:', { status, error, data });
        
        if (error) throw error;
        
        // Show toast feedback
        setToast(`-${portionSize}${portionUnit}`);
        console.log(`[DEBUG] Successfully subtracted ${portionSize}${portionUnit} from ${itemName}`);
        
        // Clear toast after 2 seconds
        setTimeout(() => setToast(null), 2000);
        
        // Force state refresh to update UI immediately
        await fetchIngredients();
      } catch (err) {
        console.error('[ERROR] Failed to consume item:', err);
        alert(err instanceof Error ? err.message : 'Failed to consume item');
      }
    }
  };

  const handleUsePortion = async (id: string, currentQuantity: number, unitType: string, itemName: string) => {
    // Normalize input to base unit
    let portionInBaseUnit = parseFloat(portionInput);
    
    if (isNaN(portionInBaseUnit) || portionInBaseUnit <= 0) {
      alert('Please enter a valid positive number');
      return;
    }
    
    // Convert based on selected unit
    if (portionUnit === 'kg' && unitType === 'g') {
      portionInBaseUnit *= 1000;
    } else if (portionUnit === 'L' && unitType === 'ml') {
      portionInBaseUnit *= 1000;
    } else if (portionUnit === 'g' && unitType === 'kg') {
      portionInBaseUnit /= 1000;
    } else if (portionUnit === 'ml' && unitType === 'L') {
      portionInBaseUnit /= 1000;
    }

    const newQuantity = currentQuantity - portionInBaseUnit;
    
    console.log(`[DEBUG] Using portion: ${portionInput}${portionUnit} from ${itemName} (normalized: ${portionInBaseUnit}${unitType}, new qty: ${newQuantity}${unitType})`);
    
    if (newQuantity <= 0) {
      const confirmed = window.confirm(`This will delete the item. Continue?`);
      if (!confirmed) return;
      await handleDelete(id);
      setToast(`Finished ${portionInput}${portionUnit} - item removed`);
    } else {
      try {
        const { data, error, status } = await supabase
          .from('ingredients')
          .update({ quantity: newQuantity })
          .eq('id', id)
          .select();
        
        console.log('Update Result:', { status, error, data });
        
        if (error) throw error;
        
        setToast(`-${portionInput}${portionUnit}`);
        console.log(`[DEBUG] Successfully subtracted ${portionInput}${portionUnit} from ${itemName}`);
        
        setTimeout(() => setToast(null), 2000);
        
        await fetchIngredients();
      } catch (err) {
        console.error('[ERROR] Failed to update quantity:', err);
        alert(err instanceof Error ? err.message : 'Failed to update quantity');
      }
    }
    
    // Reset inline edit state
    setActivePortionId(null);
    setPortionInput('');
    setPortionUnit('g');
  };

  const handleStartPortion = (id: string, unitType: string) => {
    setActivePortionId(id);
    setPortionUnit(unitType === 'item' ? 'item' : 'g');
    setPortionInput('');
  };

  const handleCancelPortion = () => {
    setActivePortionId(null);
    setPortionInput('');
    setPortionUnit('g');
  };

  useEffect(() => {
    if (activeTab === 'pantry') {
      fetchIngredients();
    }
  }, [activeTab]);

  if (loading && activeTab === 'pantry') {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Pantry Tracker</h1>
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error && activeTab === 'pantry') {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Pantry Tracker</h1>
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Pantry Tracker</h1>
        <div className="flex gap-2">
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as 'storage' | 'category')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="storage">Group by Storage</option>
            <option value="category">Group by Category</option>
          </select>
          <button
            onClick={handleClearPantry}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Clear Pantry
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('pantry')}
          className={`px-6 py-2 rounded-lg ${
            activeTab === 'pantry'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          View Pantry
        </button>
        <button
          onClick={() => setActiveTab('receipt')}
          className={`px-6 py-2 rounded-lg ${
            activeTab === 'receipt'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Receipt Import
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`px-6 py-2 rounded-lg ${
            activeTab === 'manual'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Manual Entry
        </button>
      </div>

      {activeTab === 'pantry' ? (
        <>
          {loading ? (
            <div className="text-gray-500">Loading...</div>
          ) : error ? (
            <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>
          ) : ingredients.length === 0 ? (
            <div className="p-8 bg-gray-50 rounded-lg text-center text-gray-500">
              Your pantry is empty. Import a receipt or add items manually.
            </div>
          ) : (
            <>
              {toast && <div className="fixed bottom-4 right-4 p-4 bg-blue-500 text-white rounded-lg shadow-lg z-50">{toast}</div>}
              {(() => {
                // Group ingredients based on selected toggle
                const grouped = ingredients.reduce((acc, item) => {
                  const key = groupBy === 'storage' 
                    ? (item.storage_location || 'pantry')
                    : (item.category || 'Other');
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(item);
                  return acc;
                }, {} as Record<string, Ingredient[]>);

                return Object.entries(grouped).map(([groupKey, groupItems]) => (
                  <div key={groupKey} className="mb-8">
                    <h2 className="text-xl font-semibold mb-4 capitalize">
                      {groupBy === 'storage' ? groupKey : groupKey} ({groupItems.length})
                    </h2>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-gray-300 p-3 text-left">Name</th>
                            <th className="border border-gray-300 p-3 text-left">Quantity</th>
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
                          {groupItems.map((item) => {
                            const { status, color } = getExpiryStatus(item.expiry_date);
                            return (
                              <tr key={item.id} className={color}>
                                <td className="border border-gray-300 p-3">
                                  <div className="font-medium">{item.name}</div>
                                </td>
                                <td className="border border-gray-300 p-3">{getDisplayAmount(item.quantity, item.unit)}</td>
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
                                    {activePortionId === item.id ? (
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="number"
                                          value={portionInput}
                                          onChange={(e) => setPortionInput(e.target.value)}
                                          placeholder="Amount"
                                          className="w-20 p-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        {item.unit !== 'item' && (
                                          <select
                                            value={portionUnit}
                                            onChange={(e) => setPortionUnit(e.target.value)}
                                            className="p-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          >
                                            <option value="g">g</option>
                                            <option value="kg">kg</option>
                                            <option value="ml">ml</option>
                                            <option value="L">L</option>
                                          </select>
                                        )}
                                        <button
                                          onClick={() => handleUsePortion(item.id, item.quantity, item.unit, item.name)}
                                          className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                                          title="Commit"
                                        >
                                          ✓
                                        </button>
                                        <button
                                          onClick={handleCancelPortion}
                                          className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                                          title="Cancel"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => handleConsume(item.id, item.quantity, item.unit, item.name)}
                                          className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                                        >
                                          Consume 1
                                        </button>
                                        <button
                                          onClick={() => handleStartPortion(item.id, item.unit)}
                                          className="px-3 py-1 bg-purple-500 text-white text-sm rounded hover:bg-purple-600"
                                        >
                                          Use Portion
                                        </button>
                                        <button
                                          onClick={() => handleDelete(item.id)}
                                          className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                                        >
                                          Delete
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ));
              })()}
            </>
          )}
        </>
      ) : activeTab === 'receipt' ? (
        <ReceiptImport />
      ) : (
        <ManualEntry />
      )}
    </div>
  );
}
