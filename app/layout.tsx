import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DeveloperFooter } from "@/components/DeveloperFooter";

// O Next.js carrega e otimiza as fontes no build, sem chamadas externas no navegador.
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// Metadados ajudam o projeto a aparecer bem em buscadores e no portfólio.
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Braza — Planejador de churrasco",
  description: "Organize convidados e calcule carnes e bebidas sem desperdício.",
  icons: { icon: "/braza-logo.png" },
  openGraph: {
    title: "Braza — Planejador de churrasco",
    description: "Do convite à brasa: organize tudo sem desperdício.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Braza, churrasco bem planejado" }],
    locale: "pt_BR",
    type: "website",
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

// O layout define idioma e fontes para todas as páginas do aplicativo.
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}<DeveloperFooter /></body></html>;
}
