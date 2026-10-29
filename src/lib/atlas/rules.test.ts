import { describe, expect, it } from "vitest";
import { chaveValida, pode, podeAdicionarRomaneio, validarDoc, validarQtd } from "./rules";
import type { DocEntrada, Sku } from "./types";

const sku: Sku = { id: "s1", codigo: "A", descricao: "A", tipo: "MISCELANEA", unidade: "UN", fracionavel: false, ativo: true };
const db = { naturezas: ["VENDA"], cidades: [{ uf: "SP", nome: "SAO PAULO" }], skus: [sku] };
const nf = { id: "n", numero: "1", serie: "1", chave: "1".repeat(44), natureza: "VENDA", uf: "SP", cidade: "SAO PAULO", razaoSocial: "X", dataEmissao: "2026-01-01" };
const doc = (o: Partial<DocEntrada>): DocEntrada => ({ id: "d", numero: "D1", nfs: [], docsCliente: [], fsd: [], itens: [{ id: "i", skuId: "s1", qtd: 1, unidades: [] }], ...o });

describe("regras ATLAS", () => {
  it("chave de acesso exige 44 dígitos", () => {
    expect(chaveValida("1".repeat(44))).toBe(true);
    expect(chaveValida("1".repeat(43))).toBe(false);
  });
  it("valor unitário obrigatório somente com NF", () => {
    expect(validarDoc(doc({}), db)).toEqual([]);
    expect(validarDoc(doc({ nfs: [nf] }), db)).toContain("PRODUTO 1: VALOR UNITÁRIO OBRIGATÓRIO COM NF");
  });
  it("cidade precisa pertencer à UF", () => {
    expect(validarDoc(doc({ nfs: [{ ...nf, uf: "RJ" }] }), db).some((e) => e.includes("CIDADE"))).toBe(true);
  });
  it("SKU não fracionável recusa fração", () => {
    expect(validarQtd(1.5, sku)).toEqual(["SKU NÃO ACEITA FRAÇÃO"]);
  });
  it("no máximo uma linha de romaneio em branco", () => {
    expect(podeAdicionarRomaneio(["R1", ""])).toBe(false);
    expect(podeAdicionarRomaneio(["R1"])).toBe(true);
  });
  it("USER não confere nem aprova", () => {
    expect(pode("USER", "CONFERIR")).toBe(false);
    expect(pode("GESTOR", "REQUISICAO_APROVAR")).toBe(true);
    expect(pode("ANALISTA", "REQUISICAO_APROVAR")).toBe(false);
  });
});
