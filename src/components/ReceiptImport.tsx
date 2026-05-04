'use client';

import React, { useState } from 'react';
import { usePantry } from '@/context/PantryContext';
import { ParsedReceiptItem, LOCATIONS, CATEGORIES, Location, Category } from '@/types';

export const ReceiptImport: React.FC = () => {
  const { addItemsBulk } = usePantry();
  const [receiptText, setReceiptText] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD format
  });
  const [parsedItems, setParsedItems] = useState<ParsedReceiptItem[]>([]);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleParse = async () => {
    if (!receiptText.trim()) return;

    setParsing(true);
    setError(null);
    setSuccess(null);
    setParsedItems([]);

    try {
      const res = await fetch('/api/parse-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: receiptText, purchaseDate }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(data.error || `API Error: ${res.status}`);
      }

      const data = await res.json();
      const items: ParsedReceiptItem[] = data.items || [];

      if (items.length === 0) {
        setError('No food items found in the receipt. Try pasting more text.');
        return;
      }

      setParsedItems(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse receipt');
    } finally {
      setParsing(false);
    }
  };

  const handleCommit = async () => {
    if (parsedItems.length === 0) return;

    setSaving(true);
    setError(null);

    try {
      const itemsToInsert = parsedItems.map(item => ({
        name: item.name,
        quantity: item.quantity,
        volume_weight: item.volume_weight,
        location: item.location,
        category: item.category,
        expiration_date: item.expiration_date,
      }));

      await addItemsBulk(itemsToInsert);
      setSuccess(`${itemsToInsert.length} items added to pantry!`);
      setParsedItems([]);
      setReceiptText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save items');
    } finally {
      setSaving(false);
    }
  };

  const updateItem = (index: number, field: keyof ParsedReceiptItem, value: any) => {
    setParsedItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const removeItem = (index: number) => {
    setParsedItems(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">Purchase / Delivery Date</label>
        <input
          type="date"
          value={purchaseDate}
          onChange={(e) => setPurchaseDate(e.target.value)}
          className="input-field"
        />
      </div>
      <textarea
        value={receiptText}
        onChange={(e) => setReceiptText(e.target.value)}
        placeholder="Paste your Tesco delivery email text here..."
        className="input-field h-40 resize-none"
      />

      <div className="flex gap-2">
        <button
          onClick={handleParse}
          disabled={!receiptText.trim() || parsing}
          className="btn-primary flex-1"
        >
          {parsing ? 'Parsing...' : 'Parse Receipt'}
        </button>

        {parsedItems.length > 0 && (
          <button
            onClick={handleCommit}
            disabled={saving}
            className="btn-primary flex-1 !bg-green-600 hover:!bg-green-700"
          >
            {saving ? 'Saving...' : `Commit ${parsedItems.length} Items`}
          </button>
        )}
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>}
      {success && <div className="p-3 bg-green-50 text-green-700 rounded-xl text-sm">{success}</div>}

      {parsedItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-800">Review Items ({parsedItems.length})</h3>
          {parsedItems.map((item, index) => (
            <div key={index} className="card space-y-2">
              <div className="flex items-start justify-between gap-2">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => updateItem(index, 'name', e.target.value)}
                  className="input-field font-medium"
                />
                <button
                  onClick={() => removeItem(index)}
                  className="text-red-400 hover:text-red-600 text-lg font-bold shrink-0 px-2"
                  aria-label="Remove"
                >
                  x
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-gray-500">Qty</label>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', Math.max(1, Number(e.target.value)))}
                    min="1"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Size</label>
                  <input
                    type="text"
                    value={item.volume_weight || ''}
                    onChange={(e) => updateItem(index, 'volume_weight', e.target.value || null)}
                    className="input-field"
                    placeholder="500g"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Expiry</label>
                  <input
                    type="date"
                    value={item.expiration_date || ''}
                    onChange={(e) => updateItem(index, 'expiration_date', e.target.value || null)}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500">Location</label>
                  <select
                    value={item.location}
                    onChange={(e) => updateItem(index, 'location', e.target.value)}
                    className="select-field"
                  >
                    {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Category</label>
                  <select
                    value={item.category}
                    onChange={(e) => updateItem(index, 'category', e.target.value)}
                    className="select-field"
                  >
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
