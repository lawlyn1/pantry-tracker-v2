-- Migration: Add Macro Nutrient Columns to Inventory Table
-- Run this in the Supabase Dashboard SQL Editor

-- Add macro nutrient columns to inventory table
ALTER TABLE public.inventory 
  ADD COLUMN IF NOT EXISTS calories_per_100 NUMERIC,
  ADD COLUMN IF NOT EXISTS protein_per_100 NUMERIC,
  ADD COLUMN IF NOT EXISTS carbs_per_100 NUMERIC,
  ADD COLUMN IF NOT EXISTS fat_per_100 NUMERIC,
  ADD COLUMN IF NOT EXISTS fibre_per_100 NUMERIC;
