'use client';

import React, { useState } from 'react';
import { usePantry } from '@/context/PantryContext';
import { supabase } from '@/lib/supabase';

export const ManualEntry: React.FC = () => {
  const { user } = usePantry();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState<number | null>(null);
  const [category, setCategory] = useState('Pantry Staples');
  const [storageLocation, setStorageLocation] = useState<'fridge' | 'freezer' | 'pantry'>('pantry');
  const [expiryDate, setExpiryDate] = useState('');
  const [unitSize, setUnitSize] = useState(1);
  const [unitType, setUnitType] = useState<'g' | 'kg' | 'ml' | 'L' | 'item'>('item');
  const [calories, setCalories] = useState(0);
  const [proteinG, setProteinG] = useState(0);
  const [carbsG, setCarbsG] = useState(0);
  const [fatG, setFatG] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to add items');
      return;
    }

    if (!name.trim()) {
      setError('Please enter an item name');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const purchaseDate = new Date().toISOString();
      const expiryDateISO = expiryDate ? new Date(expiryDate).toISOString() : null;
      
      // Calculate shelf_life_days if expiry date is provided
      let shelfLifeDays = 3650; // Default for pantry staples
      if (expiryDateISO) {
        const purchase = new Date(purchaseDate);
        const expiry = new Date(expiryDateISO);
        shelfLifeDays = Math.ceil((expiry.getTime() - purchase.getTime()) / (1000 * 60 * 60 * 24));
      }

      // Normalize unit_size to base unit (g, ml, or item)
      let normalizedUnitSize = unitSize;
      let normalizedUnitType = unitType;
      
      if (unitType.toLowerCase() === 'kg') {
        normalizedUnitSize *= 1000;
        normalizedUnitType = 'g';
      } else if (unitType.toLowerCase() === 'l') {
        normalizedUnitSize *= 1000;
        normalizedUnitType = 'ml';
      }

      // Consolidated quantity: total volume = (number of items) * (size per item)
      const totalQuantity = quantity * normalizedUnitSize;

      const { error } = await supabase
        .from('ingredients')
        .insert({
          user_id: user.id,
          name: name.trim(),
          category,
          quantity: totalQuantity, // Consolidated total volume
          unit: normalizedUnitType, // Base unit (g, ml, or item)
          unit_size: 1, // Always 1 for consolidated tracking
          unit_type: normalizedUnitType, // Always base unit
          purchase_date: purchaseDate,
          expiry_date: expiryDateISO,
          shelf_life_days: shelfLifeDays,
          status: 'active',
          storage_location: storageLocation,
          barcode: null,
          brand: null,
          notes: null,
          calories,
          protein_g: proteinG,
          carbs_g: carbsG,
          fat_g: fatG,
        });

      if (error) throw error;

      setSuccess('Item added successfully!');
      setName('');
      setQuantity(1);
      setPrice(null);
      setCategory('Pantry Staples');
      setStorageLocation('pantry');
      setUnitSize(1);
      setUnitType('item');
      setCalories(0);
      setProteinG(0);
      setCarbsG(0);
      setFatG(0);
      
      // Set default expiry date to today + 7 days
      const defaultExpiry = new Date();
      defaultExpiry.setDate(defaultExpiry.getDate() + 7);
      setExpiryDate(defaultExpiry.toISOString().split('T')[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  // Set default expiry date on mount
  React.useEffect(() => {
    const defaultExpiry = new Date();
    defaultExpiry.setDate(defaultExpiry.getDate() + 7);
    setExpiryDate(defaultExpiry.toISOString().split('T')[0]);
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Manual Entry</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Organic Milk"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              min="1"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Price (optional)</label>
            <input
              type="number"
              value={price || ''}
              onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : null)}
              min="0"
              step="0.01"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="£0.00"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Size</label>
            <input
              type="number"
              value={unitSize}
              onChange={(e) => setUnitSize(Number(e.target.value))}
              min="0"
              step="0.1"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Unit</label>
            <select
              value={unitType}
              onChange={(e) => setUnitType(e.target.value as 'g' | 'kg' | 'ml' | 'L' | 'item')}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="g">g</option>
              <option value="kg">kg</option>
              <option value="ml">ml</option>
              <option value="L">L</option>
              <option value="item">item</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Produce">Produce</option>
              <option value="Dairy">Dairy</option>
              <option value="Meat">Meat</option>
              <option value="Bakery">Bakery</option>
              <option value="Frozen">Frozen</option>
              <option value="Household">Household</option>
              <option value="Drinks">Drinks</option>
              <option value="Alcohol">Alcohol</option>
              <option value="Pantry Staples">Pantry Staples</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Storage Location</label>
            <select
              value={storageLocation}
              onChange={(e) => setStorageLocation(e.target.value as 'fridge' | 'freezer' | 'pantry')}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="fridge">Fridge</option>
              <option value="freezer">Freezer</option>
              <option value="pantry">Pantry</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Expiry Date</label>
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Macronutrients (optional)</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Calories (per 100g/ml)</label>
              <input
                type="number"
                value={calories}
                onChange={(e) => setCalories(Number(e.target.value))}
                min="0"
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Protein (g per 100g)</label>
              <input
                type="number"
                value={proteinG}
                onChange={(e) => setProteinG(Number(e.target.value))}
                min="0"
                step="0.1"
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Carbs (g per 100g)</label>
              <input
                type="number"
                value={carbsG}
                onChange={(e) => setCarbsG(Number(e.target.value))}
                min="0"
                step="0.1"
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Fat (g per 100g)</label>
              <input
                type="number"
                value={fatG}
                onChange={(e) => setFatG(Number(e.target.value))}
                min="0"
                step="0.1"
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {loading ? 'Adding...' : 'Add Item'}
        </button>

        {error && <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}
        {success && <div className="p-4 bg-green-100 text-green-700 rounded-lg">{success}</div>}
      </form>
    </div>
  );
};
