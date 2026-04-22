import '@testing-library/jest-dom';

// Provide stub Supabase env vars so the supabase client can be imported in tests
// without throwing "supabaseUrl is required". The actual client is never called
// in pure-function tests.
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key';
