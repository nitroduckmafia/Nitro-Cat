import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, key);

export async function joinWaitlist(email: string): Promise<void> {
  const { error } = await supabase
    .from('waitlist')
    .insert({ email });

  if (error) {
    // Duplicate email is not an error the user needs to see
    if (error.code === '23505') return;
    throw new Error(error.message);
  }
}
