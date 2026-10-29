import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/atlas/Shell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ATLAS V10 — Recebimento, Conferência e Estoque" },
      { name: "description", content: "Sistema ATLAS V10: recebimento hierárquico, conferência, estoque, requisições e cadastros." },
      { property: "og:title", content: "ATLAS V10 — Recebimento, Conferência e Estoque" },
      { property: "og:description", content: "Recebimento hierárquico, conferência, estoque e requisições entre galpões." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const [ok, setOk] = useState(false);
  useEffect(() => setOk(true), []);
  if (!ok) return <div className="flex h-screen items-center justify-center text-subtle">CARREGANDO ATLAS…</div>;
  return <Shell />;
}
