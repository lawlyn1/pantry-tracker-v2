'use client';

import React, { useState } from 'react';
import { usePantry } from '@/context/PantryContext';
import { LOCATIONS, CATEGORIES, Location, Category } from '@/types';

export const ManualEntry: React.FC = () => {
  const { addItem } = usePantry();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [volumeWeight, setVolumeWeight] = useState('');
  const [location, setLocation] = useState<Location>('Fridge');
  const [category, setCategory] = useState<Category>('Dairy');
  const [expiryDate, setExpiryDate] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fibre, setFibre] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Please enter an item name');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await addItem({
        name: name.trim(),
        quantity,
        volume_weight: volumeWeight.trim() || null,
        location,
        category,
        expiration_date: expiryDate || null,
        calories_per_100: calories ? Number(calories) : null,
        protein_per_100: protein ? Number(protein) : null,
        carbs_per_100: carbs ? Number(carbs) : null,
        fat_per_100: fat ? Number(fat) : null,
        fibre_per_100: fibre ? Number(fibre) : null,
      });

      setSuccess(`${name.trim()} added!`);
      setName('');
      setQuantity(1);
      setVolumeWeight('');
      setExpiryDate('');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFat('');
      setFibre('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
            placeholder="e.g., Semi-Skimmed Milk"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              min="1"
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Volume/Weight</label>
            <input
              type="text"
              value={volumeWeight}
              onChange={(e) => setVolumeWeight(e.target.value)}
              className="input-field"
              placeholder="e.g., 2L, 500g"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value as Location)}
              className="select-field"
            >
              {LOCATIONS.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="select-field"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Macros (per 100g/ml)</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Calories (kcal)</label>
              <input
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                className="input-field text-sm"
                placeholder="0"
                min="0"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Protein (g)</label>
              <input
                type="number"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                className="input-field text-sm"
                placeholder="0"
                min="0"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Carbs (g)</label>
              <input
                type="number"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                className="input-field text-sm"
                placeholder="0"
                min="0"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fat (g)</label>
              <input
                type="number"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                className="input-field text-sm"
                placeholder="0"
                min="0"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fibre (g)</label>
              <input
                type="number"
                value={fibre}
                onChange={(e) => setFibre(e.target.value)}
                className="input-field text-sm"
                placeholder="0"
                min="0"
                step="0.1"
              />
            </div>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading ? 'Adding...' : 'Add to Pantry'}
        </button>

        {error && <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>}
        {success && <div className="p-3 bg-green-50 text-green-700 rounded-xl text-sm">{success}</div>}
      </form>
    </div>
  );
};
