import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Metadados ajudam o projeto a aparecer bem em buscadores e no portfólio.
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Brasa — Planejador de churrasco",
  description: "Organize convidados e calcule carnes e bebidas sem desperdício.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "Brasa — Planejador de churrasco",
    description: "Do convite à brasa: organize tudo sem desperdício.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Brasa, churrasco bem planejado" }],
    locale: "pt_BR",
    type: "website",
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

// O layout define idioma e fontes para todas as páginas do aplicativo.
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body className={`${Geist({ variable: "--font-geist-sans", subsets: ["latin"] }).variable} ${Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] }).variable}`}>{children}</body></html>;
}
