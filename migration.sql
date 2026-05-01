-- Add macronutrient columns to ingredients table
ALTER TABLE public.ingredients 
ADD COLUMN calories INTEGER DEFAULT 0,
ADD COLUMN protein_g NUMERIC DEFAULT 0,
ADD COLUMN carbs_g NUMERIC DEFAULT 0,
ADD COLUMN fat_g NUMERIC DEFAULT 0;

-- Add unit size and type columns to ingredients table
ALTER TABLE public.ingredients 
ADD COLUMN unit_size NUMERIC DEFAULT 1,
ADD COLUMN unit_type TEXT DEFAULT 'item';
