"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { AutoRefresh } from "@/components/AutoRefresh";

type AdminSection = "resumo" | "eventos" | "convidados" | "compras" | "financeiro";

const links: Array<{ key: AdminSection; href: string; label: string }> = [
  { key: "resumo", href: "/painel", label: "Resumo" },
  { key: "eventos", href: "/painel/eventos", label: "Eventos" },
  { key: "convidados", href: "/painel/convidados", label: "Convidados" },
  { key: "compras", href: "/painel/compras", label: "Compras" },
  { key: "financeiro", href: "/painel/financeiro", label: "Financeiro" },
];

// A navegação é compartilhada para manter o mesmo comportamento em todas as telas.
export function AdminHeader({ active, eventId }: { active: AdminSection; eventId?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="topbar"><AutoRefresh />
      <Link className="brand" href="/painel" aria-label="Ir para o resumo do Braza">
        <Image className="app-logo" src="/braza-logo.png" alt="" width={48} height={48}/><span>BRAZA</span>
      </Link>
      <button className="menu-toggle" type="button" aria-expanded={open} aria-label="Abrir menu" onClick={()=>setOpen(!open)}><span/><span/><span/></button>
      <nav className={`admin-nav${open?" is-open":""}`} aria-label="Navegação do painel">
        {links.map((link) => <Link className={active === link.key ? "active" : ""} href={eventId ? `${link.href}?evento=${eventId}` : link.href} key={link.key} onClick={()=>setOpen(false)}>{link.label}</Link>)}
      </nav>
      <a className="logout" href="/auth/signout">Sair</a>
    </header>
  );
}
