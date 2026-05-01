'use client';

import React, { useState } from 'react';
import { usePantry } from '@/context/PantryContext';
import { parseReceipt } from '@/lib/receiptParser';
import { ReceiptItemLine } from '@/types';
import { supabase } from '@/lib/supabase';

export const ReceiptImport: React.FC = () => {
  const { user, addIngredientsBulk } = usePantry();
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
      setParsedItems(items);
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

      // Map parsed items to ingredients schema
      const ingredients = parsedItems.map(item => {
        const purchaseDate = receiptDate.toISOString();
        const expiryDate = new Date(receiptDate.getTime() + (item.shelf_life_days * 24 * 60 * 60 * 1000)).toISOString();

        return {
          user_id: user.id,
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          unit: 'item', // Default unit since receipt doesn't specify
          purchase_date: purchaseDate,
          expiry_date: expiryDate,
          shelf_life_days: item.shelf_life_days,
          status: 'active' as const,
          storage_location: item.storage_location,
          barcode: null,
          brand: null,
          notes: null,
        };
      });

      // Bulk insert to Supabase
      await addIngredientsBulk(ingredients);

      setSuccess('Receipt saved successfully! Items added to pantry.');
      setReceiptText('');
      setParsedItems([]);
      
      // Refresh ingredients to show new items
      await supabase.from('ingredients').select('*').order('created_at', { ascending: false });
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
