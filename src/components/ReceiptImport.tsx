'use client';

import React, { useState } from 'react';
import { usePantry } from '@/context/PantryContext';
import { supabase } from '@/lib/supabase';
import { parseReceipt } from '@/lib/receiptParser';
import { sanitizeItemForSupabase } from '@/lib/utils/pantryHelpers';
import { ReceiptItemLine } from '@/types';

export const ReceiptImport: React.FC = () => {
  const { user } = usePantry();
  const [receiptText, setReceiptText] = useState('');
  const [parsedItems, setParsedItems] = useState<ReceiptItemLine[]>([]);
  const [editableItems, setEditableItems] = useState<ReceiptItemLine[]>([]);
  const [deepMacroScan, setDeepMacroScan] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleParse = async () => {
    try {
      setError(null);
      setSuccess(null);
      setParsing(true);
      const items = await parseReceipt(receiptText, deepMacroScan);
      
      console.log(`[DEBUG] AI claimed to find ${items.length} items (Deep Macro Scan: ${deepMacroScan})`);
      
      if (Array.isArray(items)) {
        // Extract all prices from raw receipt text
        const pricePattern = /£\d+\.\d{2}/g;
        const pricesInText = receiptText.match(pricePattern) || [];
        const priceSet = new Set(pricesInText);

        // Filter out items whose prices don't exist in the raw text
        const filteredItems = items.filter((item: any) => {
          if (!item.total_price) return false;
          const priceStr = `£${item.total_price.toFixed(2)}`;
          return priceSet.has(priceStr);
        });

        console.log(`[DEBUG] ${filteredItems.length} items passed frontend price filter`);
        console.log(`[DEBUG] ${items.length - filteredItems.length} items rejected (prices not found in receipt text)`);

        // Log items rejected due to missing 'name' or 'quantity'
        const rejectedItems = items.filter((item: any) => !item.name || !item.quantity);
        if (rejectedItems.length > 0) {
          console.log(`[DEBUG] ${rejectedItems.length} items rejected due to missing 'name' or 'quantity':`, rejectedItems);
        }

        setParsedItems(filteredItems);
        setEditableItems(filteredItems); // Initialize editable items
      } else {
        setError('Invalid response format: expected array of items');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse receipt');
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      setError('You must be logged in to save receipts');
      return;
    }

    if (editableItems.length === 0) {
      setError('No items to save');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Extract receipt date from text
      const dateMatch = receiptText.match(/(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/i);
      const receiptDate = dateMatch ? new Date(dateMatch[1]) : new Date();

      console.log(`[DEBUG] Processing ${editableItems.length} items for pantry save`);

      // Sanitize items before sending to Supabase
      const sanitizedItems = editableItems.map((item) => sanitizeItemForSupabase({
        // Calculate expiry date based on shelf_life_days
        purchase_date: new Date().toISOString().split('T')[0],
        shelf_life_days: item.shelf_life_days || 7,
        expiry_date: (() => {
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + (item.shelf_life_days || 7));
          return expiryDate.toISOString().split('T')[0];
        })(),

        // Normalize unit_size to base unit (g, ml, or item) and set to 1 for consolidated tracking
        unit_size: (() => {
          let normalizedUnitSize = Number(item.unit_size || 1);
          let normalizedUnitType = item.unit_type || 'item';
          
          if (normalizedUnitType.toLowerCase() === 'kg') {
            normalizedUnitSize *= 1000;
            normalizedUnitType = 'g';
          } else if (normalizedUnitType.toLowerCase() === 'l') {
            normalizedUnitSize *= 1000;
            normalizedUnitType = 'ml';
          }
          return 1; // Always 1 for consolidated tracking
        })(),

        // Normalize unit to base unit (g, ml, or item)
        unit: (() => {
          let normalizedUnitType = item.unit_type || 'item';
          if (normalizedUnitType.toLowerCase() === 'kg') {
            normalizedUnitType = 'g';
          } else if (normalizedUnitType.toLowerCase() === 'l') {
            normalizedUnitType = 'ml';
          }
          return normalizedUnitType;
        })(),
        unit_type: (() => {
          let normalizedUnitType = item.unit_type || 'item';
          if (normalizedUnitType.toLowerCase() === 'kg') {
            normalizedUnitType = 'g';
          } else if (normalizedUnitType.toLowerCase() === 'l') {
            normalizedUnitType = 'ml';
          }
          return normalizedUnitType;
        })(),

        // Consolidated quantity: total volume = (number of packs) * (size per pack)
        quantity: (Number(item.quantity) || 1) * (() => {
          let normalizedUnitSize = Number(item.unit_size || 1);
          let normalizedUnitType = item.unit_type || 'item';
          
          if (normalizedUnitType.toLowerCase() === 'kg') {
            normalizedUnitSize *= 1000;
          } else if (normalizedUnitType.toLowerCase() === 'l') {
            normalizedUnitSize *= 1000;
          }
          return normalizedUnitSize;
        })(),
        name: item.name || 'Unknown Item',
        category: item.category || 'Other',
        status: 'active',
        storage_location: item.storage_location || 'pantry',
        barcode: null,
        brand: null,
        notes: null,
        calories: Number(item.calories || 0),
        protein_g: Number(item.protein_g || 0),
        carbs_g: Number(item.carbs_g || 0),
        fat_g: Number(item.fat_g || 0),
      }));

      console.log('[DEBUG] Sending Payload:', sanitizedItems);

      // Add user_id to sanitized items
      const ingredients = sanitizedItems.map(item => ({
        ...item,
        user_id: user.id,
      }));

      // Filter out items without valid names
      const validIngredients = ingredients.filter(item => item.name && item.name !== 'Unknown Item');
      
      console.log(`[DEBUG] ${validIngredients.length} valid ingredients ready for database insert`);

      if (validIngredients.length === 0) {
        setError('No valid items to save (all items missing names)');
        return;
      }

      // Bulk insert to Supabase using direct client
      const { error } = await supabase
        .from('ingredients')
        .insert(validIngredients);

      if (error) throw error;

      console.log(`[DEBUG] Successfully inserted ${validIngredients.length} ingredients to database`);
      setSuccess(`Receipt saved successfully! ${validIngredients.length} items added to pantry.`);
      setReceiptText('');
      setParsedItems([]);
      setEditableItems([]);
    } catch (err) {
      console.error('Save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save receipt');
    } finally {
      setSaving(false);
    }
  };

  const updateEditableItem = (index: number, field: keyof ReceiptItemLine, value: any) => {
    const updated = [...editableItems];
    updated[index] = { ...updated[index], [field]: value };
    setEditableItems(updated);
  };

  const removeEditableItem = (index: number) => {
    const updated = editableItems.filter((_, i) => i !== index);
    setEditableItems(updated);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Import Receipt</h2>
      
      <textarea
        value={receiptText}
        onChange={(e) => setReceiptText(e.target.value)}
        placeholder="Paste your Tesco receipt text here..."
        className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      
      <div className="flex gap-4 mt-4 items-center">
        <button
          onClick={handleParse}
          disabled={!receiptText.trim() || parsing}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {parsing ? 'Parsing...' : 'Parse'}
        </button>
        
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={deepMacroScan}
            onChange={(e) => setDeepMacroScan(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm">Deep Macro Scan</span>
        </label>
        
        <button
          onClick={handleSave}
          disabled={editableItems.length === 0 || saving}
          className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed ml-auto"
        >
          {saving ? 'Saving...' : 'Commit to Pantry'}
        </button>
      </div>
      
      {error && <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}
      {success && <div className="mt-4 p-4 bg-green-100 text-green-700 rounded-lg">{success}</div>}
      
      {editableItems.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">Review & Commit ({editableItems.length} items)</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-left sticky left-0 bg-gray-100 z-10">Quantity</th>
                  <th className="border border-gray-300 p-2 text-left sticky left-16 bg-gray-100 z-10">Name</th>
                  <th className="border border-gray-300 p-2 text-left">Category</th>
                  <th className="border border-gray-300 p-2 text-left">Storage</th>
                  <th className="border border-gray-300 p-2 text-left">Shelf Life (Days)</th>
                  <th className="border border-gray-300 p-2 text-left">Unit Size</th>
                  <th className="border border-gray-300 p-2 text-left">Unit Type</th>
                  <th className="border border-gray-300 p-2 text-left bg-blue-50/50">Kcal (100g)</th>
                  <th className="border border-gray-300 p-2 text-left bg-blue-50/50">Protein (g)</th>
                  <th className="border border-gray-300 p-2 text-left bg-blue-50/50">Carbs (g)</th>
                  <th className="border border-gray-300 p-2 text-left bg-blue-50/50">Fat (g)</th>
                  <th className="border border-gray-300 p-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {editableItems.map((item, index) => (
                  <tr key={index}>
                    <td className="border border-gray-300 p-2 sticky left-0 bg-white z-10">
                      <input
                        type="number"
                        value={item.quantity ?? 1}
                        onChange={(e) => updateEditableItem(index, 'quantity', Number(e.target.value))}
                        className="w-20 p-1 border border-gray-300 rounded"
                      />
                    </td>
                    <td className="border border-gray-300 p-2 sticky left-16 bg-white z-10">
                      <input
                        type="text"
                        value={item.name ?? ''}
                        onChange={(e) => updateEditableItem(index, 'name', e.target.value)}
                        className="w-48 p-1 border border-gray-300 rounded"
                      />
                    </td>
                    <td className="border border-gray-300 p-2">
                      <input
                        type="text"
                        value={item.category ?? ''}
                        onChange={(e) => updateEditableItem(index, 'category', e.target.value)}
                        className="w-32 p-1 border border-gray-300 rounded"
                      />
                    </td>
                    <td className="border border-gray-300 p-2">
                      <select
                        value={item.storage_location ?? 'pantry'}
                        onChange={(e) => updateEditableItem(index, 'storage_location', e.target.value as any)}
                        className="w-28 p-1 border border-gray-300 rounded"
                      >
                        <option value="pantry">Pantry</option>
                        <option value="fridge">Fridge</option>
                        <option value="freezer">Freezer</option>
                      </select>
                    </td>
                    <td className="border border-gray-300 p-2">
                      <input
                        type="number"
                        value={item.shelf_life_days ?? 7}
                        onChange={(e) => updateEditableItem(index, 'shelf_life_days', Number(e.target.value))}
                        className="w-20 p-1 border border-gray-300 rounded"
                      />
                    </td>
                    <td className="border border-gray-300 p-2">
                      <input
                        type="number"
                        value={item.unit_size ?? 1}
                        onChange={(e) => updateEditableItem(index, 'unit_size', Number(e.target.value))}
                        className="w-20 p-1 border border-gray-300 rounded"
                      />
                    </td>
                    <td className="border border-gray-300 p-2">
                      <input
                        type="text"
                        value={item.unit_type ?? ''}
                        onChange={(e) => updateEditableItem(index, 'unit_type', e.target.value)}
                        className="w-20 p-1 border border-gray-300 rounded"
                      />
                    </td>
                    <td className="border border-gray-300 p-2 bg-blue-50/50">
                      <input
                        type="number"
                        value={item.calories ?? 0}
                        onChange={(e) => updateEditableItem(index, 'calories', Number(e.target.value))}
                        className="w-20 p-1 border border-gray-300 rounded bg-blue-50"
                      />
                    </td>
                    <td className="border border-gray-300 p-2 bg-blue-50/50">
                      <input
                        type="number"
                        step="0.1"
                        value={item.protein_g ?? 0}
                        onChange={(e) => updateEditableItem(index, 'protein_g', Number(e.target.value))}
                        className="w-20 p-1 border border-gray-300 rounded bg-blue-50"
                      />
                    </td>
                    <td className="border border-gray-300 p-2 bg-blue-50/50">
                      <input
                        type="number"
                        step="0.1"
                        value={item.carbs_g ?? 0}
                        onChange={(e) => updateEditableItem(index, 'carbs_g', Number(e.target.value))}
                        className="w-20 p-1 border border-gray-300 rounded bg-blue-50"
                      />
                    </td>
                    <td className="border border-gray-300 p-2 bg-blue-50/50">
                      <input
                        type="number"
                        step="0.1"
                        value={item.fat_g ?? 0}
                        onChange={(e) => updateEditableItem(index, 'fat_g', Number(e.target.value))}
                        className="w-20 p-1 border border-gray-300 rounded bg-blue-50"
                      />
                    </td>
                    <td className="border border-gray-300 p-2">
                      <button
                        onClick={() => removeEditableItem(index)}
                        className="px-2 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
