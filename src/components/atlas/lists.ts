import type { AtlasDB } from "@/lib/atlas/types";

export const optGalpoes = (d: AtlasDB) => d.galpoes.filter((g) => g.ativo).map((g) => ({ value: g.id, label: g.nome }));
export const nomeProjeto = (d: AtlasDB, id: string) => {
  const p = d.projetos.find((x) => x.id === id); if (!p) return "—";
  const c = d.clientes.find((x) => x.id === p.clienteId);
  return `${c?.nome ?? "?"} › ${p.nome}`;
};
export const optProjetos = (d: AtlasDB) => d.projetos.map((p) => ({ value: p.id, label: nomeProjeto(d, p.id) }));
export const optSkus = (d: AtlasDB) => d.skus.filter((s) => s.ativo).map((s) => ({ value: s.id, label: `${s.codigo} — ${s.descricao}` }));
export const nomeGalpao = (d: AtlasDB, id: string) => d.galpoes.find((g) => g.id === id)?.nome ?? "—";
export const skuDe = (d: AtlasDB, id: string) => d.skus.find((s) => s.id === id);
