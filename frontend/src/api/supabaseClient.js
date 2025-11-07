// frontend/src/api/supabaseClient.js

import { createClient } from '@supabase/supabase-js';

// Use the Project URL and Anon Key you provided
const supabaseUrl = 'https://ofnkkewymvgqqkhovhvj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mbmtrZXd5bXZncXFraG92aHZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMDc3NDMsImV4cCI6MjA3Njg4Mzc0M30.XSWtJrFukCqpbl1j8hG5tzk98dFMKTKcXXLIeh2jNx0'; // Your anon/public key

export const supabase = createClient(supabaseUrl, supabaseKey);