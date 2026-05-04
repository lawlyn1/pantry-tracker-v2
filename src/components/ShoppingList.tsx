'use client';

import React, { useState } from 'react';
import { usePantry } from '@/context/PantryContext';

export const ShoppingList: React.FC = () => {
  const { shoppingList, addShoppingItem, toggleShoppingItem, deleteShoppingItem, clearCheckedItems } = usePantry();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await addShoppingItem({ name: name.trim(), quantity, checked: false });
      setName('');
      setQuantity(1);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const unchecked = shoppingList.filter(item => !item.checked);
  const checked = shoppingList.filter(item => item.checked);

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add item..."
          className="input-field flex-1"
          required
        />
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
          min="1"
          className="input-field w-16 text-center"
        />
        <button type="submit" disabled={loading || !name.trim()} className="btn-primary shrink-0">
          Add
        </button>
      </form>

      {unchecked.length === 0 && checked.length === 0 && (
        <div className="text-center text-gray-400 py-8 text-sm">
          Your shopping list is empty
        </div>
      )}

      {unchecked.length > 0 && (
        <div className="space-y-2">
          {unchecked.map(item => (
            <div key={item.id} className="card flex items-center gap-3">
              <button
                onClick={() => toggleShoppingItem(item.id, true)}
                className="w-6 h-6 rounded-full border-2 border-gray-300 shrink-0 hover:border-green-500 transition-colors"
                aria-label="Check off"
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">{item.name}</span>
                {item.quantity > 1 && (
                  <span className="text-xs text-gray-400 ml-2">x{item.quantity}</span>
                )}
              </div>
              <button
                onClick={() => deleteShoppingItem(item.id)}
                className="text-red-400 hover:text-red-600 text-sm shrink-0"
                aria-label="Delete"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}

      {checked.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide">Done ({checked.length})</h4>
            <button
              onClick={clearCheckedItems}
              className="text-xs text-red-400 hover:text-red-600"
            >
              Clear all
            </button>
          </div>
          {checked.map(item => (
            <div key={item.id} className="card flex items-center gap-3 opacity-50">
              <button
                onClick={() => toggleShoppingItem(item.id, false)}
                className="w-6 h-6 rounded-full bg-green-500 shrink-0 flex items-center justify-center"
                aria-label="Uncheck"
              >
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <span className="text-sm line-through text-gray-400 flex-1">{item.name}</span>
              <button
                onClick={() => deleteShoppingItem(item.id)}
                className="text-red-400 hover:text-red-600 text-sm shrink-0"
                aria-label="Delete"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
