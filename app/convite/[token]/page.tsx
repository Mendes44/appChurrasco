// Página pública do convite individual. O token identifica somente um convite.
import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { InviteForm } from "./InviteForm";
import Image from "next/image";

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
  const { data: invitation } = await admin.from("invitations").select("id, guest_name, responded_at, events(title, event_date, address)").eq("token", token).maybeSingle();
  if (!invitation) notFound();
  const event = Array.isArray(invitation.events) ? invitation.events[0] : invitation.events;
  const { data: recordedGuest } = invitation.responded_at ? await admin.from("guests").select("is_attending").eq("invitation_id", invitation.id).maybeSingle() : { data: null };
  const date = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", timeZone: "America/Sao_Paulo" }).format(new Date(event.event_date));
  const time = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(event.event_date));
  return <main className="public-shell invite-shell"><section className="invite-card"><Image className="invite-logo" src="/braza-logo.png" alt="Braza" width={110} height={110}/><span className="eyebrow">CONVITE INDIVIDUAL</span><h1>Olá, {invitation.guest_name}!</h1><p className="invite-intro">Você foi convidado para {event.title}. Confirme sua presença.</p><div className="event-details"><span><b>{date}, às {time}</b>Data e horário</span><span><b>{event.address||"Local a confirmar"}</b>Endereço</span></div><InviteForm token={token} guestName={invitation.guest_name} alreadyAnswered={Boolean(invitation.responded_at)} wasAttending={Boolean(recordedGuest?.is_attending)} address={event.address} eventTitle={event.title} eventDate={event.event_date}/><small className="privacy">🔒 Convite individual para até duas pessoas.</small></section></main>;
}
