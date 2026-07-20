// Supabase klijent — anon ključ je javan po dizajnu; tajne žive samo na serveru
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Da li je backend uopšte konfigurisan (walking skeleton radi i bez toga)
export const backendPodesen = Boolean(url && anonKey)

let klijent: SupabaseClient | null = null

export function supabase(): SupabaseClient {
  if (!klijent) {
    if (!url || !anonKey) {
      throw new Error(
        'Supabase nije podešen: nedostaju VITE_SUPABASE_URL i VITE_SUPABASE_ANON_KEY (vidi SETUP.md).',
      )
    }
    klijent = createClient(url, anonKey)
  }
  return klijent
}
