-- Migration: Add user_id column to existing tables
-- Run this in the Supabase Dashboard SQL Editor if you have existing data

-- Add user_id column to inventory table (if it doesn't already exist)
ALTER TABLE public.inventory 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to shopping_list table (if it doesn't already exist)
ALTER TABLE public.shopping_list 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Note: If you have existing data, you'll need to update those rows with a valid user_id
-- You can do this by running a separate UPDATE command for each user
-- Example (replace with actual user_id from your auth.users table):
-- UPDATE public.inventory SET user_id = 'your-uuid-here' WHERE user_id IS NULL;
-- UPDATE public.shopping_list SET user_id = 'your-uuid-here' WHERE user_id IS NULL;

-- After updating existing data, make the column NOT NULL
-- ALTER TABLE public.inventory ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE public.shopping_list ALTER COLUMN user_id SET NOT NULL;
