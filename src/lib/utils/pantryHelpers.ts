/**
 * Pantry Helper Functions
 * Unit conversion, formatting, and data sanitization for pantry management
 */

/**
 * Display amount with dynamic unit conversion
 * Converts g/ml to kg/L when >= 1000, shows 2 decimal places
 * Converts kg/L to g/ml when < 1, shows whole numbers
 * Skips conversion for 'item' type
 */
export const getDisplayAmount = (amount: number, type: string): string => {
  // Skip conversion for item type
  if (type === 'item') {
    return `${amount} item${amount !== 1 ? 's' : ''}`;
  }
  
  // Convert to kg/L if >= 1000g/ml - always show 2 decimal places
  if ((type === 'g' || type === 'ml') && amount >= 1000) {
    const converted = amount / 1000;
    const displayUnit = type === 'g' ? 'kg' : 'L';
    return `${converted.toFixed(2)}${displayUnit}`;
  }
  
  // Convert to g/ml if < 1kg/L (handles legacy data) - show whole numbers
  if ((type === 'kg' || type === 'L') && amount < 1) {
    const converted = amount * 1000;
    const displayUnit = type === 'kg' ? 'g' : 'ml';
    return `${Math.round(converted)}${displayUnit}`;
  }
  
  // Return raw amount and unit for values < 1000g/ml
  if ((type === 'g' || type === 'ml') && amount < 1000) {
    return `${Math.round(amount)}${type}`;
  }
  
  // Return raw amount and unit for kg/L values >= 1
  if ((type === 'kg' || type === 'L') && amount >= 1) {
    return `${amount.toFixed(2)}${type}`;
  }
  
  // Fallback
  return `${amount}${type}`;
};

/**
 * Normalize unit to base unit (g, ml, or item)
 * Converts kg to g, L to ml
 */
export const normalizeToBaseUnit = (amount: number, unit: string): { amount: number; unit: string } => {
  const normalizedUnit = unit.toLowerCase();
  
  if (normalizedUnit === 'kg') {
    return { amount: amount * 1000, unit: 'g' };
  } else if (normalizedUnit === 'l') {
    return { amount: amount * 1000, unit: 'ml' };
  }
  
  return { amount, unit: normalizedUnit };
};

/**
 * Convert input amount to base unit for consumption tracking
 * Handles kg/L to g/ml conversion based on target unit type
 */
export const convertToBaseUnit = (amount: number, fromUnit: string, toUnit: string): number => {
  const from = fromUnit.toLowerCase();
  const to = toUnit.toLowerCase();
  
  if (from === 'kg' && to === 'g') {
    return amount * 1000;
  } else if (from === 'L' && to === 'ml') {
    return amount * 1000;
  } else if (from === 'g' && to === 'kg') {
    return amount / 1000;
  } else if (from === 'ml' && to === 'L') {
    return amount / 1000;
  }
  
  return amount;
};

/**
 * Sanitize item data for Supabase
 * Ensures numeric fields are valid numbers (no NaN) and strings are trimmed
 */
export const sanitizeItemForSupabase = (item: any): any => {
  const sanitized: any = {};
  
  // String fields - trim and ensure not null
  if (item.name) sanitized.name = String(item.name).trim();
  if (item.category) sanitized.category = String(item.category).trim();
  if (item.storage_location) sanitized.storage_location = String(item.storage_location).trim();
  if (item.unit) sanitized.unit = String(item.unit).trim();
  if (item.unit_type) sanitized.unit_type = String(item.unit_type).trim();
  if (item.barcode) sanitized.barcode = String(item.barcode).trim();
  if (item.brand) sanitized.brand = String(item.brand).trim();
  if (item.notes) sanitized.notes = String(item.notes).trim();
  
  // Numeric fields - ensure valid numbers, default to 0 if NaN/null
  sanitized.quantity = Number(item.quantity) || 0;
  sanitized.unit_size = Number(item.unit_size) || 1;
  sanitized.shelf_life_days = Number(item.shelf_life_days) || 7;
  sanitized.calories = Number(item.calories) || 0;
  sanitized.protein_g = Number(item.protein_g) || 0;
  sanitized.carbs_g = Number(item.carbs_g) || 0;
  sanitized.fat_g = Number(item.fat_g) || 0;
  
  // Date fields - ensure valid ISO strings or null
  if (item.purchase_date) sanitized.purchase_date = item.purchase_date;
  if (item.expiry_date) sanitized.expiry_date = item.expiry_date;
  
  // Status - default to 'active'
  sanitized.status = item.status || 'active';
  
  // ID - pass through if exists
  if (item.id) sanitized.id = item.id;
  if (item.user_id) sanitized.user_id = item.user_id;
  
  return sanitized;
};

/**
 * Format expiry date for display
 */
export const formatExpiryDate = (date: string | null): string => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};
