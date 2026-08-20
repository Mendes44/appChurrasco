import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { InviteForm } from "./InviteForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Confirme sua presença | Braza",
  description: "Responda ao seu convite individual.",
  openGraph: { title: "Você vem ao churrasco?", description: "Confirme sua presença pelo Braza.", images: [] },
  twitter: { title: "Você vem ao churrasco?", description: "Confirme sua presença pelo Braza.", images: [] },
};

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound();
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data: invitation } = await admin.from("invitations").select("guest_name, responded_at, events(title, event_date)").eq("token", token).maybeSingle();
  if (!invitation) notFound();
  const event = Array.isArray(invitation.events) ? invitation.events[0] : invitation.events;
  const date = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", timeZone: "America/Sao_Paulo" }).format(new Date(event.event_date));
  const time = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(event.event_date));
  return <main className="public-shell invite-shell"><section className="invite-card"><span className="brand-mark large">B</span><span className="eyebrow">CONVITE INDIVIDUAL</span><h1>Olá, {invitation.guest_name}!</h1><p className="invite-intro">Você foi convidado para {event.title}. Confirme sua presença.</p><div className="event-details"><span><b>{date}</b>às {time}</span><span><b>Convite para até 2</b>Você pode levar 1 acompanhante</span></div><InviteForm token={token} guestName={invitation.guest_name} alreadyAnswered={Boolean(invitation.responded_at)} /><small className="privacy">🔒 Este link é exclusivo e aceita uma única resposta.</small></section></main>;
}
