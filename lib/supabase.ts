import { createClient } from "@supabase/supabase-js";

// Menggunakan non-null assertion (!) hanya jika kita yakin env var ada di local.
// Namun untuk build di Vercel yang terkadang tidak membaca env var saat 'collecting page data',
// kita berikan fallback agar build tidak fail.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
