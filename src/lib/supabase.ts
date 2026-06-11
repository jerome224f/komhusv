import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zqcguxgqsmmnubigpdnw.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxY2d1eGdxc21tbnViaWdwZG53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MjcyNTgsImV4cCI6MjA5NjMwMzI1OH0.wPOCY3vnMH6P_hsW12LSA34eF5Qaj-sL4QHby2HoEoU';

export const supabase = createClient(supabaseUrl, supabaseKey);
