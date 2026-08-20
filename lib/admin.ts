import { isAdmin } from "@/lib/auth";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Centraliza autenticação e cliente privado para todas as rotas administrativas.
export async function getAdminContext() {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user || !isAdmin(user.email)) return null;
  const database = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  return { user, database };
}
