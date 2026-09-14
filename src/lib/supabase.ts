import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string) ||
  'https://snhllplycrumbyqwqqpb.supabase.co';
const supabaseKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ||
  'sb_publishable_qdCeKrPLdpAWX8a2sYhoxA_guDNEHEp';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  supabaseUrl !== 'your_supabase_project_url' &&
  !supabaseUrl.includes('placeholder')
);

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    'Missing or invalid Supabase env vars. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to your Vercel Project Settings or .env file.'
  );
}

// Provide valid placeholder URLs so createClient won't throw an unhandled exception crashing the bundle
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseKey : 'placeholder-anon-key',
  {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

