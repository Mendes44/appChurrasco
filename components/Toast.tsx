"use client";

import { useEffect } from "react";

// Aviso temporário e acessível usado nas ações administrativas.
export function Toast({
  message,
  error = false,
  onClose,
}: {
  message: string;
  error?: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(onClose, 2200);
    return () => window.clearTimeout(timeout);
  }, [message, onClose]);

  if (!message) return null;
  return (
    <div className={`toast${error ? " is-error" : ""}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}

