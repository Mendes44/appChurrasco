import { AdminHeader } from "@/components/AdminHeader";
import { getAdminContext } from "@/lib/admin";
import { redirect } from "next/navigation";
import { EventManager } from "./EventManager";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  // Compatibilidade temporária para projetos cujo cache ainda não conhece address.
  const context = await getAdminContext();
  if (!context) redirect("/login");
  let { data, error } = await context.database
    .from("events")
    .select("id,title,event_date,address,grams_per_person,beer_liters_per_drinker,invite_token,pix_key,pix_holder")
    .eq("owner_id", context.user.id)
    .order("event_date", { ascending: false });
  if (error?.code === "PGRST204") {
    const fallback = await context.database
      .from("events")
      .select("id,title,event_date,grams_per_person,invite_token")
      .eq("owner_id", context.user.id)
      .order("event_date", { ascending: false });
    data = (fallback.data ?? []).map((event) => ({ ...event, 
      address: null, 
      pix_key: null,
      pix_holder: null,
      beer_liters_per_drinker: 1.5,
    }));
    error = fallback.error;
  }
  if (error) console.error("events_list_failed", error.code);
  return (
    <main>
      <AdminHeader active="eventos" />
      <section className="page-heading compact-heading">
        <span className="eyebrow">ADMINISTRAÇÃO</span>
        <h1>Seus churrascos</h1>
        <p>Escolha um evento ou crie um novo.</p>
      </section>
      <EventManager events={data ?? []} />
    </main>
  );
}
