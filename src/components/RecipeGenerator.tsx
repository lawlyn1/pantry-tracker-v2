'use client';

import React, { useState } from 'react';
import { InventoryItem } from '@/types';

interface Recipe {
  title: string;
  items_used: string[];
  instructions: string[];
  prep_time: string;
}

interface RecipeGeneratorProps {
  expiringItems: InventoryItem[];
}

export const RecipeGenerator: React.FC<RecipeGeneratorProps> = ({ expiringItems }) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (expiringItems.length === 0) return;

    setLoading(true);
    setError(null);
    setRecipes([]);

    try {
      const res = await fetch('/api/generate-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: expiringItems.map(i => ({
            name: i.name,
            quantity: i.quantity,
            expiration_date: i.expiration_date,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(data.error || `API Error: ${res.status}`);
      }

      const data = await res.json();
      setRecipes(data.recipes || []);

      if ((data.recipes || []).length === 0) {
        setError('No recipes generated. Try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate recipes');
    } finally {
      setLoading(false);
    }
  };

  if (expiringItems.length === 0) {
    return (
      <div className="card text-center text-gray-400 py-6">
        <p className="text-sm">No items expiring in the next 5 days.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-800">Use It Up</h3>
            <p className="text-xs text-gray-500">{expiringItems.length} item{expiringItems.length !== 1 ? 's' : ''} expiring soon</p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="btn-primary !bg-amber-500 hover:!bg-amber-600"
          >
            {loading ? 'Thinking...' : 'Get Recipes'}
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {expiringItems.map(item => (
            <span key={item.id} className="px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium">
              {item.name}
            </span>
          ))}
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>}

      {recipes.map((recipe, index) => (
        <div key={index} className="card space-y-3">
          <div className="flex items-start justify-between">
            <h4 className="font-semibold text-gray-900">{recipe.title}</h4>
            <span className="text-xs text-gray-400 shrink-0 ml-2">{recipe.prep_time}</span>
          </div>

          <div className="flex flex-wrap gap-1">
            {recipe.items_used.map((item, i) => (
              <span key={i} className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs">
                {item}
              </span>
            ))}
          </div>

          <ol className="space-y-1.5 text-sm text-gray-700">
            {recipe.instructions.map((step, i) => (
              <li key={i} className="leading-snug">{step}</li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
};
