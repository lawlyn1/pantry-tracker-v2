export const LOCATIONS = ['Fridge', 'Freezer', 'Cupboard', 'Spice Rack', 'Pantry'] as const;
export type Location = typeof LOCATIONS[number];

export const CATEGORIES = ['Dairy', 'Meat', 'Fruit', 'Veg', 'Grains', 'Tinned Goods', 'Fish', 'Spices', 'Alcohol'] as const;
export type Category = typeof CATEGORIES[number];

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  volume_weight: string | null;
  location: Location;
  category: Category;
  expiration_date: string | null;
  date_added: string;
  calories_per_100: number | null;
  protein_per_100: number | null;
  carbs_per_100: number | null;
  fat_per_100: number | null;
  fibre_per_100: number | null;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  checked: boolean;
  created_at: string;
}

export interface ParsedReceiptItem {
  name: string;
  quantity: number;
  volume_weight: string | null;
  location: Location;
  category: Category;
  expiration_date: string | null;
}
