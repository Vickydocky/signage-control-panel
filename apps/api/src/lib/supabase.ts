import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

// service_role: bypass RLS. Hanya dipakai di server, JANGAN dikirim ke client.
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
