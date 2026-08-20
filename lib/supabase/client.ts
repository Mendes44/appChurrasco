import { createBrowserClient } from "@supabase/ssr";

// Cliente público: a chave anon é segura no navegador quando o RLS está ativo.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
