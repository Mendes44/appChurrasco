import type { SupabaseClient } from "@supabase/supabase-js";

// Auditoria não interrompe a operação principal caso o registro auxiliar falhe.
export async function writeAudit(database: SupabaseClient, eventId: string, actorId: string, action: string, details: Record<string, unknown> = {}) {
  const { error } = await database.from("audit_logs").insert({ event_id:eventId, actor_id:actorId, action, details });
  if (error) console.error("audit_write_failed", error.code);
}

