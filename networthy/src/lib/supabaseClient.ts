import { createClient } from '@supabase/supabase-js'

// Read environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key must be provided in environment variables (.env file).");
}

// Create and export the Supabase client instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey); 