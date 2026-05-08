-- Add edit_access to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS edit_access BOOLEAN DEFAULT false;
