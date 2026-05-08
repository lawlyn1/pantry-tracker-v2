'use client';

import { FormEvent, useMemo, useState } from 'react';
import { ConsumeMode, MealLogEntry } from '@/hooks/usePantryDashboard';
import { InventoryItem } from '@/types';

interface MealLoggerProps {
  inventory: InventoryItem[];
  onLogMeal: (entries: MealLogEntry[]) => boolean | Promise<boolean>;
}

interface MealBucketItem extends MealLogEntry {
  bucketId: string;
  name: string;
  volumeWeight: string | null;
}

export function MealLogger({ inventory, onLogMeal }: MealLoggerProps) {
  const [selectedItemId, setSelectedItemId] = useState('');
  const [consumeMode, setConsumeMode] = useState<ConsumeMode>('quantity');
  const [amount, setAmount] = useState('');
  const [mealBucket, setMealBucket] = useState<MealBucketItem[]>([]);
  const [isLogging, setIsLogging] = useState(false);

  const selectedItem = useMemo(() => {
    return inventory.find(item => item.id === selectedItemId) || null;
  }, [inventory, selectedItemId]);

  const handleItemChange = (itemId: string) => {
    const item = inventory.find(currentItem => currentItem.id === itemId);
    setSelectedItemId(itemId);
    setConsumeMode(item?.volume_weight ? 'weight' : 'quantity');
    setAmount('');
  };

  const handleAddToMeal = (event: FormEvent) => {
    event.preventDefault();

    if (!selectedItem) {
      alert('Choose a pantry item to add');
      return;
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      alert('Enter an amount greater than 0');
      return;
    }

    if (consumeMode === 'weight' && !selectedItem.volume_weight) {
      alert('This item does not have a weight or volume to consume');
      return;
    }

    setMealBucket(prev => [
      ...prev,
      {
        bucketId: crypto.randomUUID(),
        itemId: selectedItem.id,
        name: selectedItem.name,
        volumeWeight: selectedItem.volume_weight,
        mode: consumeMode,
        amount: parsedAmount,
      },
    ]);
    setSelectedItemId('');
    setConsumeMode('quantity');
    setAmount('');
  };

  const handleLogMeal = async () => {
    if (mealBucket.length === 0) {
      alert('Add at least one item to your meal');
      return;
    }

    setIsLogging(true);
    try {
      const logged = await onLogMeal(mealBucket.map(({ itemId, mode, amount }) => ({ itemId, mode, amount })));
      if (logged) {
        setMealBucket([]);
      }
    } finally {
      setIsLogging(false);
    }
  };

  const removeBucketItem = (bucketId: string) => {
    setMealBucket(prev => prev.filter(item => item.bucketId !== bucketId));
  };

  return (
    <div className="space-y-4">
      <div className="card space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Build a Meal</h3>
          <p className="text-xs text-gray-400 mt-1">Add pantry items, set portions, then consume them together.</p>
        </div>

        <form onSubmit={handleAddToMeal} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pantry Item</label>
            <select
              value={selectedItemId}
              onChange={(event) => handleItemChange(event.target.value)}
              className="select-field"
            >
              <option value="">Choose an item...</option>
              {inventory.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} — x{item.quantity}{item.volume_weight ? ` / ${item.volume_weight}` : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedItem && (
            <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount {consumeMode === 'weight' ? getUnitLabel(selectedItem.volume_weight) : '(Qty)'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="input-field"
                  placeholder="Amount"
                  required
                />
              </div>
              <select
                value={consumeMode}
                onChange={(event) => setConsumeMode(event.target.value as ConsumeMode)}
                className="select-field w-28"
              >
                <option value="quantity">Qty</option>
                <option value="weight" disabled={!selectedItem.volume_weight}>Weight</option>
              </select>
            </div>
          )}

          <button type="submit" className="btn-secondary w-full py-2">
            Add to Meal
          </button>
        </form>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Meal Bucket</h3>
          <span className="text-xs text-gray-400">{mealBucket.length} items</span>
        </div>

        {mealBucket.length === 0 ? (
          <div className="text-center text-gray-400 py-6 text-sm">No items added yet.</div>
        ) : (
          <div className="space-y-2">
            {mealBucket.map(item => (
              <div key={item.bucketId} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-gray-400">
                    Consume {item.amount} {item.mode === 'weight' ? getUnitLabel(item.volumeWeight) : 'qty'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeBucketItem(item.bucketId)}
                  className="text-xs font-medium text-red-400 hover:text-red-600"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={handleLogMeal}
          disabled={mealBucket.length === 0 || isLogging}
          className="btn-primary w-full py-3 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLogging ? 'Logging Meal...' : 'Log Meal & Consume'}
        </button>
      </div>
    </div>
  );
}

function getUnitLabel(volumeWeight: string | null): string {
  if (!volumeWeight) return '';
  const match = volumeWeight.trim().match(/^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)\s*(.*)$/);
  const unit = match?.[1]?.trim();
  return unit ? `(${unit})` : '';
}
