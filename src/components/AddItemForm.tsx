'use client';

import React, { useState } from 'react';
import { usePantry } from '@/context/PantryContext';
import { CATEGORIES, Location, Category } from '@/types';

const UNIT_OPTIONS = ['g', 'kg', 'ml', 'L', 'oz', 'lbs', 'units'];

interface AddItemFormProps {
  locations: Location[];
}

export const AddItemForm: React.FC<AddItemFormProps> = ({ locations }) => {
  const { addItem } = usePantry();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [volumeAmount, setVolumeAmount] = useState('');
  const [volumeUnit, setVolumeUnit] = useState('g');
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
  const [quantityTouchY, setQuantityTouchY] = useState<number | null>(null);
  const quantitySwipeThreshold = 20;

  const incrementQuantity = () => {
    setQuantity(prev => prev + 1);
  };

  const decrementQuantity = () => {
    setQuantity(prev => Math.max(1, prev - 1));
  };

  const handleQuantityWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      incrementQuantity();
    } else if (e.deltaY > 0) {
      decrementQuantity();
    }
  };

  const handleQuantityTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setQuantityTouchY(e.touches[0].clientY);
  };

  const handleQuantityTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (quantityTouchY === null) return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - quantityTouchY;

    if (Math.abs(deltaY) < quantitySwipeThreshold) return;

    if (deltaY < 0) {
      incrementQuantity();
    } else {
      decrementQuantity();
    }

    setQuantityTouchY(currentY);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Please enter an item name');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    const volumeWeight = volumeAmount.trim() ? `${volumeAmount.trim()}${volumeUnit}` : null;

    try {
      await addItem({
        name: name.trim(),
        quantity,
        volume_weight: volumeWeight,
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
      setVolumeAmount('');
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
            <div
              onWheel={handleQuantityWheel}
              className="flex h-11 items-center justify-between rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:border-blue-200 hover:shadow-md focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100"
              role="spinbutton"
              aria-label="Quantity"
              aria-valuemin={1}
              aria-valuenow={quantity}
              tabIndex={0}
            >
              <button
                type="button"
                onClick={decrementQuantity}
                disabled={quantity <= 1}
                className="flex h-full w-11 items-center justify-center rounded-l-xl text-lg font-semibold text-gray-500 transition-colors hover:bg-gray-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:text-gray-300"
                aria-label="Decrease quantity"
              >
                -
              </button>
              <div
                onTouchStart={handleQuantityTouchStart}
                onTouchMove={handleQuantityTouchMove}
                className="flex min-w-0 flex-1 touch-none flex-col items-center justify-center border-x border-gray-100 px-2"
              >
                <span className="text-base font-semibold leading-none text-gray-900">{quantity}</span>
                <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-300">scroll</span>
              </div>
              <button
                type="button"
                onClick={incrementQuantity}
                className="flex h-full w-11 items-center justify-center rounded-r-xl text-lg font-semibold text-gray-500 transition-colors hover:bg-gray-50 hover:text-blue-600"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Volume/Weight</label>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input
                type="number"
                min="0"
                step="0.1"
                value={volumeAmount}
                onChange={(e) => setVolumeAmount(e.target.value)}
                className="input-field"
                placeholder="500"
              />
              <select
                value={volumeUnit}
                onChange={(e) => setVolumeUnit(e.target.value)}
                className="select-field w-24"
              >
                {UNIT_OPTIONS.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>
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
              {locations.map(loc => (
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
