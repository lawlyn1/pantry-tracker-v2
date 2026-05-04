-- Pantry Tracker V1 Schema
-- Run this in the Supabase SQL Editor

-- Drop old tables if they exist
DROP TABLE IF EXISTS public.ingredients CASCADE;
DROP TABLE IF EXISTS public.food_logs CASCADE;
DROP TABLE IF EXISTS public.receipt_items CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.inventory CASCADE;
DROP TABLE IF EXISTS public.shopping_list CASCADE;

-- Create inventory table
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  volume_weight TEXT,
  location TEXT NOT NULL CHECK (location IN ('Fridge', 'Freezer', 'Cupboard', 'Spice Rack', 'Pantry')),
  category TEXT NOT NULL CHECK (category IN ('Dairy', 'Meat', 'Fruit', 'Veg', 'Grains', 'Tinned Goods', 'Fish', 'Spices', 'Alcohol')),
  expiration_date DATE,
  date_added TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create shopping_list table
CREATE TABLE public.shopping_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  checked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No RLS for V1 (shared household, no auth)
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on inventory" ON public.inventory FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.shopping_list ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on shopping_list" ON public.shopping_list FOR ALL USING (true) WITH CHECK (true);
