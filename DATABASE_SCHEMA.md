# Supabase Database Schema

## Users Table (extends auth.users)
```sql
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can only see their own profile
CREATE POLICY "Users can view own profile" 
  ON public.users FOR SELECT 
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
  ON public.users FOR UPDATE 
  USING (auth.uid() = id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON public.users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Ingredients Table
```sql
CREATE TABLE public.ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  purchase_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expiry_date TIMESTAMP WITH TIME ZONE,
  shelf_life_days INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expiring_soon', 'expired', 'consumed')),
  storage_location TEXT NOT NULL DEFAULT 'pantry' CHECK (storage_location IN ('pantry', 'fridge', 'freezer')),
  barcode TEXT,
  brand TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;

-- Users can only view their own ingredients
CREATE POLICY "Users can view own ingredients" 
  ON public.ingredients FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can insert their own ingredients
CREATE POLICY "Users can insert own ingredients" 
  ON public.ingredients FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own ingredients
CREATE POLICY "Users can update own ingredients" 
  ON public.ingredients FOR UPDATE 
  USING (auth.uid() = user_id);

-- Users can delete their own ingredients
CREATE POLICY "Users can delete own ingredients" 
  ON public.ingredients FOR DELETE 
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_ingredients_user_id ON public.ingredients(user_id);
CREATE INDEX idx_ingredients_status ON public.ingredients(status);
CREATE INDEX idx_ingredients_expiry_date ON public.ingredients(expiry_date);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_ingredients_updated_at 
  BEFORE UPDATE ON public.ingredients 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Food Logs Table
```sql
CREATE TABLE public.food_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  ingredient_id UUID REFERENCES public.ingredients(id),
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  meal_name TEXT NOT NULL,
  calories NUMERIC,
  protein_g NUMERIC,
  carbs_g NUMERIC,
  fat_g NUMERIC,
  logged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;

-- Users can only view their own food logs
CREATE POLICY "Users can view own food logs" 
  ON public.food_logs FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can insert their own food logs
CREATE POLICY "Users can insert own food logs" 
  ON public.food_logs FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own food logs
CREATE POLICY "Users can update own food logs" 
  ON public.food_logs FOR UPDATE 
  USING (auth.uid() = user_id);

-- Users can delete their own food logs
CREATE POLICY "Users can delete own food logs" 
  ON public.food_logs FOR DELETE 
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_food_logs_user_id ON public.food_logs(user_id);
CREATE INDEX idx_food_logs_logged_at ON public.food_logs(logged_at);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_food_logs_updated_at 
  BEFORE UPDATE ON public.food_logs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Receipt Items Table
```sql
CREATE TABLE public.receipt_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  store_name TEXT NOT NULL,
  purchase_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  total_amount NUMERIC NOT NULL,
  items JSONB NOT NULL,
  image_url TEXT,
  processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.receipt_items ENABLE ROW LEVEL SECURITY;

-- Users can only view their own receipt items
CREATE POLICY "Users can view own receipt items" 
  ON public.receipt_items FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can insert their own receipt items
CREATE POLICY "Users can insert own receipt items" 
  ON public.receipt_items FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own receipt items
CREATE POLICY "Users can update own receipt items" 
  ON public.receipt_items FOR UPDATE 
  USING (auth.uid() = user_id);

-- Users can delete their own receipt items
CREATE POLICY "Users can delete own receipt items" 
  ON public.receipt_items FOR DELETE 
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_receipt_items_user_id ON public.receipt_items(user_id);
CREATE INDEX idx_receipt_items_purchase_date ON public.receipt_items(purchase_date);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_receipt_items_updated_at 
  BEFORE UPDATE ON public.receipt_items 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Function to create user profile on signup
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```
