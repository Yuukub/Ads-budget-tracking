import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = () => {
    if (supabaseInstance) return supabaseInstance;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
        throw new Error('Missing environment variable: SUPABASE_URL');
    }
    if (!supabaseKey) {
        throw new Error('Missing environment variable: SUPABASE_ANON_KEY');
    }

    supabaseInstance = createClient(supabaseUrl, supabaseKey);
    return supabaseInstance;
};
