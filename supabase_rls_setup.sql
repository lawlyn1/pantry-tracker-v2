-- Supabase Row Level Security (RLS) Setup for Multi-Tenant SaaS
-- Run this in the Supabase Dashboard SQL Editor after migrating your schema

-- Enable RLS on inventory table
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (in case you ran the old migration)
DROP POLICY IF EXISTS "Allow all on inventory" ON public.inventory;

-- Create policy for inventory: users can only access their own rows
CREATE POLICY "Users can view own inventory" ON public.inventory
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own inventory" ON public.inventory
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own inventory" ON public.inventory
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own inventory" ON public.inventory
  FOR DELETE
  USING (auth.uid() = user_id);

-- Enable RLS on shopping_list table
ALTER TABLE public.shopping_list ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (in case you ran the old migration)
DROP POLICY IF EXISTS "Allow all on shopping_list" ON public.shopping_list;

-- Create policy for shopping_list: users can only access their own rows
CREATE POLICY "Users can view own shopping_list" ON public.shopping_list
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shopping_list" ON public.shopping_list
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shopping_list" ON public.shopping_list
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own shopping_list" ON public.shopping_list
  FOR DELETE
  USING (auth.uid() = user_id);
