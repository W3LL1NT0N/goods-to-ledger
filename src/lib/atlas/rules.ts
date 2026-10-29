import type { AtlasDB, DocEntrada, NotaFiscal, Papel, Sku } from "./types";

export const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

export type Capacidade =
  | "RECEBIMENTO_CRIAR" | "CONFERIR" | "REQUISICAO_CRIAR" | "REQUISICAO_APROVAR"
  | "CADASTRO_EDITAR" | "ACESSO_ADMIN" | "AUDITORIA_VER";

export const MATRIZ: Record<Papel, Capacidade[]> = {
  MASTER: ["RECEBIMENTO_CRIAR","CONFERIR","REQUISICAO_CRIAR","REQUISICAO_APROVAR","CADASTRO_EDITAR","ACESSO_ADMIN","AUDITORIA_VER"],
  SU: ["RECEBIMENTO_CRIAR","CONFERIR","REQUISICAO_CRIAR","REQUISICAO_APROVAR","CADASTRO_EDITAR","AUDITORIA_VER"],
  GESTOR: ["RECEBIMENTO_CRIAR","CONFERIR","REQUISICAO_CRIAR","REQUISICAO_APROVAR","CADASTRO_EDITAR","AUDITORIA_VER"],
  ANALISTA: ["RECEBIMENTO_CRIAR","CONFERIR","REQUISICAO_CRIAR"],
  USER: ["REQUISICAO_CRIAR"],
};
export const pode = (papel: Papel, c: Capacidade) => MATRIZ[papel].includes(c);

export const chaveValida = (c: string) => /^\d{44}$/.test(c);

/** Erros de uma NF iniciada (todos os campos obrigatórios + chave 44 dígitos + cidade/UF válidas). */
export function validarNF(nf: NotaFiscal, db: Pick<AtlasDB, "naturezas" | "cidades">): string[] {
  const e: string[] = [];
  if (!nf.numero.trim()) e.push("NÚMERO DA NF OBRIGATÓRIO");
  if (!nf.serie.trim()) e.push("SÉRIE OBRIGATÓRIA");
  if (!chaveValida(nf.chave)) e.push("CHAVE DE ACESSO DEVE TER 44 DÍGITOS NUMÉRICOS");
  if (!db.naturezas.includes(nf.natureza)) e.push("NATUREZA INVÁLIDA");
  if (!UFS.includes(nf.uf)) e.push("UF INVÁLIDA");
  else if (!db.cidades.some((c) => c.uf === nf.uf && c.nome === nf.cidade)) e.push("CIDADE NÃO PERTENCE À UF");
  if (!nf.razaoSocial.trim()) e.push("RAZÃO SOCIAL OBRIGATÓRIA");
  if (!nf.dataEmissao) e.push("DATA DE EMISSÃO OBRIGATÓRIA");
  return e;
}

export function validarDoc(doc: DocEntrada, db: Pick<AtlasDB, "naturezas" | "cidades" | "skus">): string[] {
  const e: string[] = [];
  if (!doc.numero.trim()) e.push("NÚMERO DO DOC. ENTRADA OBRIGATÓRIO");
  doc.nfs.forEach((nf, i) => validarNF(nf, db).forEach((m) => e.push(`NF ${i + 1}: ${m}`)));
  if (doc.itens.length === 0) e.push("INFORME AO MENOS UM PRODUTO");
  doc.itens.forEach((it, i) => {
    const sku = db.skus.find((s) => s.id === it.skuId);
    if (!sku) { e.push(`PRODUTO ${i + 1}: SKU NÃO SELECIONADO`); return; }
    e.push(...validarQtd(it.qtd, sku).map((m) => `PRODUTO ${i + 1}: ${m}`));
    if (doc.nfs.length > 0 && !(typeof it.valorUnit === "number" && it.valorUnit > 0))
      e.push(`PRODUTO ${i + 1}: VALOR UNITÁRIO OBRIGATÓRIO COM NF`);
  });
  return e;
}

export function validarQtd(qtd: number, sku: Sku): string[] {
  if (!(qtd > 0)) return ["QUANTIDADE DEVE SER MAIOR QUE ZERO"];
  if ((sku.tipo === "SERIALIZADO" || !sku.fracionavel) && !Number.isInteger(qtd)) return ["SKU NÃO ACEITA FRAÇÃO"];
  return [];
}

/** Romaneios: no máximo uma linha em branco. */
export const podeAdicionarRomaneio = (codigos: string[]) => codigos.filter((c) => !c.trim()).length === 0;
