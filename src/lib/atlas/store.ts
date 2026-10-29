import { useSyncExternalStore } from "react";
import type { AtlasDB, Recebimento, Usuario } from "./types";

const KEY = "atlas-v10-db";
export const uid = () => Math.random().toString(36).slice(2, 10);
export const hoje = () => new Date().toLocaleDateString("sv-SE");

const CAPITAIS: [string, string][] = [["AC","RIO BRANCO"],["AL","MACEIO"],["AP","MACAPA"],["AM","MANAUS"],["BA","SALVADOR"],["CE","FORTALEZA"],["DF","BRASILIA"],["ES","VITORIA"],["GO","GOIANIA"],["MA","SAO LUIS"],["MT","CUIABA"],["MS","CAMPO GRANDE"],["MG","BELO HORIZONTE"],["MG","UBERLANDIA"],["MG","CONTAGEM"],["PA","BELEM"],["PB","JOAO PESSOA"],["PR","CURITIBA"],["PR","LONDRINA"],["PE","RECIFE"],["PI","TERESINA"],["RJ","RIO DE JANEIRO"],["RJ","NITEROI"],["RN","NATAL"],["RS","PORTO ALEGRE"],["RO","PORTO VELHO"],["RR","BOA VISTA"],["SC","FLORIANOPOLIS"],["SC","JOINVILLE"],["SP","SAO PAULO"],["SP","CAMPINAS"],["SP","BARUERI"],["SP","GUARULHOS"],["SE","ARACAJU"],["TO","PALMAS"]];

function seed(): AtlasDB {
  const usuarios: Usuario[] = [
    { id: "u1", nome: "TON MASTER", papel: "MASTER" },
    { id: "u2", nome: "SUPORTE SU", papel: "SU" },
    { id: "u3", nome: "MARIA GESTORA", papel: "GESTOR" },
    { id: "u4", nome: "JOAO ANALISTA", papel: "ANALISTA" },
    { id: "u5", nome: "PEDRO USUARIO", papel: "USER" },
  ];
  return {
    galpoes: [
      { id: "g1", nome: "GALPÃO 01 - BARUERI", ativo: true },
      { id: "g2", nome: "GALPÃO 02 - CAMPINAS", ativo: true },
      { id: "g3", nome: "GALPÃO 03 - CONTAGEM", ativo: true },
    ],
    clientes: [{ id: "c1", nome: "TELECOM BRASIL" }, { id: "c2", nome: "VAREJO NACIONAL" }],
    projetos: [
      { id: "p1", clienteId: "c1", nome: "REVERSA MODEMS" },
      { id: "p2", clienteId: "c1", parentId: "p1", nome: "REVERSA MODEMS / SUDESTE" },
      { id: "p3", clienteId: "c2", nome: "ESTOQUE PDV" },
    ],
    modalidades: ["TRANSPORTADORA", "CORREIOS", "COLETA PRÓPRIA", "ENTREGA CLIENTE"],
    naturezas: ["VENDA", "REMESSA PARA ARMAZENAGEM", "DEVOLUÇÃO", "REMESSA PARA CONSERTO", "TRANSFERÊNCIA"],
    cidades: CAPITAIS.map(([uf, nome]) => ({ uf, nome })),
    razoesSociais: [{ nome: "ATLAS LOGISTICA LTDA", por: "SISTEMA", em: hoje() }],
    skus: [
      { id: "s1", codigo: "MDM-4G-001", descricao: "MODEM 4G DUAL BAND", tipo: "SERIALIZADO", unidade: "UN", fracionavel: false, ativo: true },
      { id: "s2", codigo: "ROT-WIFI6-02", descricao: "ROTEADOR WIFI 6", tipo: "SERIALIZADO", unidade: "UN", fracionavel: false, ativo: true },
      { id: "s3", codigo: "CAB-UTP-CX", descricao: "CABO UTP CAT6 CAIXA 305M", tipo: "MISCELANEA", unidade: "CX", fracionavel: false, ativo: true },
      { id: "s4", codigo: "FIO-COB-KG", descricao: "FIO DE COBRE", tipo: "MISCELANEA", unidade: "KG", fracionavel: true, ativo: true },
    ],
    usuarios, usuarioAtualId: "u1",
    recebimentos: [], requisicoes: [], logs: [],
    seq: { recebimento: 1000, requisicao: 500 },
  };
}

let db: AtlasDB = seed();
let loaded = false;
const subs = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try { const raw = localStorage.getItem(KEY); if (raw) db = { ...seed(), ...JSON.parse(raw) }; } catch { /* ignore */ }
}

export function getDB() { load(); return db; }
export function useDB() {
  return useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, getDB, () => db);
}
export function usuarioAtual(d = getDB()) { return d.usuarios.find((u) => u.id === d.usuarioAtualId)!; }

/** Mutação imutável + persistência + log de auditoria opcional. */
export function update(fn: (d: AtlasDB) => void, log?: { acao: string; detalhe: string }) {
  const next: AtlasDB = structuredClone(getDB());
  fn(next);
  if (log) {
    const u = usuarioAtual(next);
    next.logs.unshift({ id: uid(), em: new Date().toISOString(), usuario: u.nome, papel: u.papel, ...log });
    next.logs = next.logs.slice(0, 2000);
  }
  db = next;
  localStorage.setItem(KEY, JSON.stringify(db));
  subs.forEach((s) => s());
}

export function resetDB() { db = seed(); localStorage.removeItem(KEY); subs.forEach((s) => s()); }

export function novoRecebimento(): Recebimento {
  const d = getDB();
  return {
    id: uid(), numero: 0, galpaoId: "", projetoId: "", data: hoje(), modalidade: "",
    status: "RASCUNHO", romaneios: [], criadoPor: usuarioAtual(d).nome, criadoEm: new Date().toISOString(),
  };
}

export function salvarRecebimento(r: Recebimento, finalizar: boolean) {
  update((d) => {
    const i = d.recebimentos.findIndex((x) => x.id === r.id);
    const rec = structuredClone(r);
    if (!rec.numero) rec.numero = ++d.seq.recebimento;
    if (finalizar) rec.status = "FINALIZADO";
    // gera unidades para serializados
    rec.romaneios.forEach((ro) => ro.docs.forEach((doc) => doc.itens.forEach((it) => {
      const sku = d.skus.find((s) => s.id === it.skuId);
      if (sku?.tipo === "SERIALIZADO") {
        while (it.unidades.length < it.qtd) it.unidades.push({ id: uid(), serial: "", docsAparelho: [], status: "PENDENTE" });
        if (it.unidades.length > it.qtd) it.unidades = it.unidades.slice(0, it.qtd);
      }
    })));
    if (i >= 0) d.recebimentos[i] = rec; else d.recebimentos.unshift(rec);
    r.numero = rec.numero;
  }, { acao: finalizar ? "RECEBIMENTO FINALIZADO" : "RASCUNHO SALVO", detalhe: `RECEBIMENTO ${r.numero || "NOVO"}` });
}

/** Estoque derivado: conferido entra disponível; FNF não; FSD conta como não disponível (bloqueado). */
export function calcularEstoque(d: AtlasDB) {
  const map = new Map<string, { galpaoId: string; skuId: string; esperado: number; disponivel: number; fnf: number; fsd: number; pendente: number }>();
  const get = (g: string, s: string) => {
    const k = g + "|" + s;
    if (!map.has(k)) map.set(k, { galpaoId: g, skuId: s, esperado: 0, disponivel: 0, fnf: 0, fsd: 0, pendente: 0 });
    return map.get(k)!;
  };
  d.recebimentos.filter((r) => r.status === "FINALIZADO").forEach((r) => r.romaneios.forEach((ro) => ro.docs.forEach((doc) => {
    doc.itens.forEach((it) => {
      const sku = d.skus.find((s) => s.id === it.skuId); if (!sku) return;
      const e = get(r.galpaoId, it.skuId); e.esperado += it.qtd;
      if (sku.tipo === "SERIALIZADO") it.unidades.forEach((u) => {
        if (u.status === "CONFERIDO") e.disponivel++; else if (u.status === "FNF") e.fnf++; else e.pendente++;
      });
      else if (it.qtdConferida == null) e.pendente += it.qtd;
      else { e.disponivel += Math.min(it.qtdConferida, it.qtd); e.fnf += Math.max(0, it.qtd - it.qtdConferida); }
    });
    doc.fsd.forEach((f) => { get(r.galpaoId, f.skuId).fsd += f.qtd; });
  })));
  d.requisicoes.filter((q) => q.status === "APROVADA").forEach((q) => {
    get(q.origemId, q.skuId).disponivel -= q.qtd;
    get(q.destinoId, q.skuId).disponivel += q.qtd;
  });
  return [...map.values()];
}
