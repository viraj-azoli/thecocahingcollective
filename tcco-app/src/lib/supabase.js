import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gzagyzvcekvpsdpkkqno.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6YWd5enZjZWt2cHNkcGtrcW5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MzE1NTUsImV4cCI6MjA5NDMwNzU1NX0.jusPYod4RBzdE3A24kvHgRp8s8uOkiRavFm81aVpy_8';

export const supabase = createClient(supabaseUrl, supabaseKey);
