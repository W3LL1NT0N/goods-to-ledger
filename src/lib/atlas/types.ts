export type Papel = "MASTER" | "SU" | "GESTOR" | "ANALISTA" | "USER";
export type TipoSku = "SERIALIZADO" | "MISCELANEA";
export type StatusUnidade = "PENDENTE" | "CONFERIDO" | "FNF";

export interface Galpao { id: string; nome: string; ativo: boolean }
export interface Cliente { id: string; nome: string }
export interface Projeto { id: string; clienteId: string; parentId?: string; nome: string }
export interface Cidade { uf: string; nome: string; custom?: boolean }
export interface Sku {
  id: string; codigo: string; descricao: string; tipo: TipoSku;
  unidade: string; fracionavel: boolean; ativo: boolean;
}
export interface Usuario { id: string; nome: string; papel: Papel }

export interface NotaFiscal {
  id: string; numero: string; serie: string; chave: string; natureza: string;
  uf: string; cidade: string; razaoSocial: string; dataEmissao: string;
}
export interface Unidade { id: string; serial: string; docsAparelho: string[]; status: StatusUnidade }
export interface Item {
  id: string; skuId: string; qtd: number; valorUnit?: number;
  unidades: Unidade[]; // serializados
  qtdConferida?: number; // miscelânea
  conferidoEm?: string;
}
export interface FsdRegistro { id: string; skuId: string; qtd: number; serial?: string; obs: string; em: string; por: string }
export interface DocEntrada {
  id: string; numero: string; nfs: NotaFiscal[]; docsCliente: string[]; itens: Item[]; fsd: FsdRegistro[];
}
export interface Romaneio { id: string; codigo: string; docs: DocEntrada[] }
export interface Recebimento {
  id: string; numero: number; galpaoId: string; projetoId: string; data: string;
  modalidade: string; status: "RASCUNHO" | "FINALIZADO"; romaneios: Romaneio[];
  criadoPor: string; criadoEm: string;
}
export interface Requisicao {
  id: string; numero: number; origemId: string; destinoId: string; projetoId: string;
  skuId: string; qtd: number; motivo: string; status: "PENDENTE" | "APROVADA" | "REJEITADA";
  solicitante: string; aprovador?: string; criadoEm: string; decididoEm?: string;
}
export interface LogAuditoria { id: string; em: string; usuario: string; papel: Papel; acao: string; detalhe: string }

export interface AtlasDB {
  galpoes: Galpao[]; clientes: Cliente[]; projetos: Projeto[]; modalidades: string[];
  naturezas: string[]; cidades: Cidade[]; razoesSociais: { nome: string; por: string; em: string }[];
  skus: Sku[]; usuarios: Usuario[]; usuarioAtualId: string;
  recebimentos: Recebimento[]; requisicoes: Requisicao[]; logs: LogAuditoria[];
  seq: { recebimento: number; requisicao: number };
}
