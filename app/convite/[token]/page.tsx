import type { Metadata } from "next";
import { InviteForm } from "./InviteForm";

// O convite não herda a imagem institucional porque é uma rota individual compartilhável.
export const metadata: Metadata = {
  title: "Confirme sua presença | Brasa",
  description: "Responda ao convite do churrasco.",
  openGraph: { title: "Você vem ao churrasco?", description: "Confirme sua presença pelo Brasa.", images: [] },
  twitter: { title: "Você vem ao churrasco?", description: "Confirme sua presença pelo Brasa.", images: [] },
};

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <main className="public-shell invite-shell"><section className="invite-card"><span className="brand-mark large">B</span><span className="eyebrow">VOCÊ ESTÁ CONVIDADO</span><h1>Churrasco de sábado</h1><p className="invite-intro">Confirme sua presença. Leva menos de um minuto.</p><div className="event-details"><span><b>23 de agosto</b>Sábado, às 13h</span><span><b>Casa do Marcos</b>O endereço será enviado pelo organizador</span></div><InviteForm token={token} /><small className="privacy">🔒 Seus dados serão usados somente para organizar este evento.</small></section></main>;
}
