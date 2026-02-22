// ============================================================
// Supabase Client — Server-side (Service Role Key)
// For file uploads to Supabase Storage
// Lazy initialization: only creates client when first used
// ============================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const STORAGE_BUCKET = "documents";

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
    if (_supabase) return _supabase;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error(
            "Supabase env vars missing (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY). File uploads will not work."
        );
    }

    _supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
    });

    return _supabase;
}
