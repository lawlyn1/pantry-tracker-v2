export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Ingredient {
  id: string;
  user_id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  unit_size: number;
  unit_type: string;
  purchase_date: string;
  expiry_date: string | null;
  shelf_life_days: number | null;
  status: 'active' | 'expiring_soon' | 'expired' | 'consumed';
  storage_location: 'pantry' | 'fridge' | 'freezer';
  barcode: string | null;
  brand: string | null;
  notes: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  created_at: string;
  updated_at: string;
}

export interface FoodLog {
  id: string;
  user_id: string;
  ingredient_id: string | null;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  meal_name: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  logged_at: string;
  created_at: string;
  updated_at: string;
}

export interface ReceiptItem {
  id: string;
  user_id: string;
  store_name: string;
  purchase_date: string;
  total_amount: number;
  items: ReceiptItemLine[];
  image_url: string | null;
  processed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReceiptItemLine {
  name: string;
  quantity: number;
  unit_price: number | null;
  total_price: number | null;
  category: string;
  storage_location: 'fridge' | 'freezer' | 'pantry';
  shelf_life_days: number;
  unit_size: number;
  unit_type: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export type IngredientStatus = Ingredient['status'];
export type StorageLocation = Ingredient['storage_location'];
export type MealType = FoodLog['meal_type'];
