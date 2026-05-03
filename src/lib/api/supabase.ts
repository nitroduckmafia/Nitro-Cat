import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!client) {
    if (!url || !key) {
      throw new Error('Supabase env vars missing — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local');
    }
    client = createClient(url, key);
  }
  return client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const c = getClient() as unknown as Record<string | symbol, unknown>;
    return c[prop];
  },
});

export async function joinWaitlist(email: string): Promise<void> {
  const { error } = await getClient()
    .from('waitlist')
    .insert({ email });

  if (error) {
    // Duplicate email is not an error the user needs to see
    if (error.code === '23505') return;
    throw new Error(error.message);
  }
}
