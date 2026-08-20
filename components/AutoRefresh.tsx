"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Atualiza dados do servidor sem recarregar a página inteira.
export function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [router]);
  return null;
}
