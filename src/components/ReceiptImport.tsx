'use client';

import React, { useState } from 'react';
import { usePantry } from '@/context/PantryContext';
import { parseReceipt } from '@/lib/receiptParser';
import { ReceiptItemLine } from '@/types';
import { supabase } from '@/lib/supabase';

export const ReceiptImport: React.FC = () => {
  const { user } = usePantry();
  const [receiptText, setReceiptText] = useState('');
  const [parsedItems, setParsedItems] = useState<ReceiptItemLine[]>([]);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleParse = async () => {
    try {
      setError(null);
      setSuccess(null);
      setParsing(true);
      const items = await parseReceipt(receiptText);
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

        console.log(`Filtered ${items.length - filteredItems.length} items with prices not found in receipt text`);
        setParsedItems(filteredItems);
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

    if (parsedItems.length === 0) {
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

      // Map parsed items to ingredients schema according to DATABASE_SCHEMA.md
      const ingredients = parsedItems.map((item: any) => {
        const purchaseDate = receiptDate.toISOString();
        const expiryDate = new Date(receiptDate.getTime() + ((item.shelf_life_days || item.shelf_life || 7) * 24 * 60 * 60 * 1000)).toISOString();

        return {
          user_id: user.id,
          name: item.name || item.product_name || item.item_name || 'Unknown Item',
          category: item.category || 'Other',
          quantity: Number(item.quantity) || 1,
          unit: 'item', // Default unit since receipt doesn't specify
          unit_size: Number(item.unit_size || item.size || 1),
          unit_type: item.unit_type || item.unit || 'item',
          purchase_date: purchaseDate,
          expiry_date: expiryDate,
          shelf_life_days: Number(item.shelf_life_days || item.shelf_life || 7),
          status: 'active',
          storage_location: item.storage_location || 'pantry',
          barcode: null,
          brand: null,
          notes: null,
          calories: Number(item.calories || item.kcal || 0),
          protein_g: Number(item.protein_g || item.protein || 0),
          carbs_g: Number(item.carbs_g || item.carbs || 0),
          fat_g: Number(item.fat_g || item.fat || 0),
        };
      });

      // Filter out items without valid names
      const validIngredients = ingredients.filter(item => item.name && item.name !== 'Unknown Item');

      if (validIngredients.length === 0) {
        setError('No valid items to save (all items missing names)');
        return;
      }

      // Bulk insert to Supabase using direct client
      const { error } = await supabase
        .from('ingredients')
        .insert(validIngredients);

      if (error) throw error;

      setSuccess('Receipt saved successfully! Items added to pantry.');
      setReceiptText('');
      setParsedItems([]);
    } catch (err) {
      console.error('Save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save receipt');
    } finally {
      setSaving(false);
    }
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
      
      <div className="flex gap-4 mt-4">
        <button
          onClick={handleParse}
          disabled={!receiptText.trim() || parsing}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {parsing ? 'Parsing...' : 'Parse'}
        </button>
        
        <button
          onClick={handleSave}
          disabled={parsedItems.length === 0 || saving}
          className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
      
      {error && <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}
      {success && <div className="mt-4 p-4 bg-green-100 text-green-700 rounded-lg">{success}</div>}
      
      {parsedItems.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">Parsed Items ({parsedItems.length})</h3>
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2 text-left">Quantity</th>
                <th className="border border-gray-300 p-2 text-left">Name</th>
                <th className="border border-gray-300 p-2 text-left">Unit Price</th>
                <th className="border border-gray-300 p-2 text-left">Total Price</th>
                <th className="border border-gray-300 p-2 text-left">Category</th>
                <th className="border border-gray-300 p-2 text-left">Storage</th>
                <th className="border border-gray-300 p-2 text-left">Shelf Life (Days)</th>
              </tr>
            </thead>
            <tbody>
              {parsedItems.map((item, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 p-2">{item.quantity}</td>
                  <td className="border border-gray-300 p-2">{item.name}</td>
                  <td className="border border-gray-300 p-2">£{(item.unit_price ?? 0).toFixed(2)}</td>
                  <td className="border border-gray-300 p-2">£{(item.total_price ?? 0).toFixed(2)}</td>
                  <td className="border border-gray-300 p-2">{item.category}</td>
                  <td className="border border-gray-300 p-2">{item.storage_location}</td>
                  <td className="border border-gray-300 p-2">{item.shelf_life_days}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
