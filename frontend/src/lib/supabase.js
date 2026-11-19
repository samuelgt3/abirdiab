import { createClient } from '@supabase/supabase-js';

// Public values (safe in front-end code). Security is enforced by row level security + login.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** null when the env vars are missing: the public site then runs on the bundled fallback content. */
export const supabase =
  url && key && !key.startsWith('paste-')
    ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } })
    : null;

export const hasSupabase = Boolean(supabase);
