import { useEffect, useRef, useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { calcularEstoque, update, useDB, usuarioAtual } from "@/lib/atlas/store";
import { Recebimentos, Conferencia, Estoque, Requisicoes } from "./Operacao";
import { Acessos, CadCidades, CadClientes, CadGalpoes, CadRazao, CadSimples, CadSku, Logs } from "./Cadastros";
import { Panel, Tag, Select } from "./ui";
import { cn } from "@/lib/utils";
import type { Papel } from "@/lib/atlas/types";

type TabId = "home" | "entradas" | "conferencia" | "estoque" | "requisicoes" | "sku" | "galpoes" | "clientes" | "modalidades" | "naturezas" | "cidades" | "razao" | "acessos" | "logs";
const TITULOS: Record<TabId, string> = {
  home: "TELA INICIAL", entradas: "ENTRADAS", conferencia: "CONFERÊNCIA", estoque: "ESTOQUE", requisicoes: "REQUISIÇÕES",
  sku: "CADASTRO DE SKU", galpoes: "GALPÕES", clientes: "CLIENTES E PROJETOS", modalidades: "MODALIDADES", naturezas: "NATUREZAS DE NF",
  cidades: "CIDADES", razao: "RAZÃO SOCIAL", acessos: "ACESSOS E PAPÉIS", logs: "LOGS DE AUDITORIA",
};
const MENUS: { label: string; itens: TabId[] }[] = [
  { label: "OPERAÇÃO", itens: ["entradas", "conferencia", "estoque"] },
  { label: "REQUISIÇÕES", itens: ["requisicoes"] },
  { label: "CADASTROS", itens: ["sku", "galpoes", "clientes", "modalidades", "naturezas", "cidades", "razao"] },
  { label: "CONFIGURAÇÕES", itens: ["acessos", "logs"] },
];

export function Shell() {
  const d = useDB();
  const [tabs, setTabs] = useState<TabId[]>(["home"]);
  const [ativa, setAtiva] = useState<TabId>("home");
  const [menu, setMenu] = useState<string | null>(null);
  const nav = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!nav.current?.contains(e.target as Node)) setMenu(null); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  const abrir = (t: TabId) => { setTabs((x) => (x.includes(t) ? x : [...x, t])); setAtiva(t); setMenu(null); };
  const fechar = (t: TabId) => { const n = tabs.filter((x) => x !== t); setTabs(n.length ? n : ["home"]); if (ativa === t) setAtiva(n[n.length - 1] ?? "home"); };
  const u = usuarioAtual(d);

  const conteudo: Record<TabId, ReactNode> = {
    home: <Home abrir={abrir} />, entradas: <Recebimentos />, conferencia: <Conferencia />, estoque: <Estoque />, requisicoes: <Requisicoes />,
    sku: <CadSku />, galpoes: <CadGalpoes />, clientes: <CadClientes />, modalidades: <CadSimples titulo="MODALIDADES DE CHEGADA" chave="modalidades" />,
    naturezas: <CadSimples titulo="NATUREZAS DE NOTA FISCAL" chave="naturezas" />, cidades: <CadCidades />, razao: <CadRazao />, acessos: <Acessos />, logs: <Logs />,
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <header ref={nav} className="flex h-9 shrink-0 items-center gap-4 border-b border-border bg-card px-3">
        <button onClick={() => abrir("home")} className="text-[13px] font-bold tracking-[0.2em] text-foreground">ATLAS<span className="text-subtle"> V10</span></button>
        <nav className="flex gap-1">
          {MENUS.map((m) => (
            <div key={m.label} className="relative">
              <button onClick={() => setMenu(menu === m.label ? null : m.label)} className={cn("h-6 rounded-[4px] px-2 text-[10px] font-bold tracking-wide", menu === m.label ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>{m.label}</button>
              {menu === m.label && (
                <div className="absolute left-0 top-7 z-40 min-w-48 rounded-[4px] border border-border bg-popover py-1 shadow-md">
                  {m.itens.map((i) => <button key={i} onClick={() => abrir(i)} className="block w-full px-3 py-1 text-left text-[10px] font-bold hover:bg-muted">{TITULOS[i]}</button>)}
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[9px] font-bold text-muted-foreground">SESSÃO</span>
          <Select className="w-44" value={u.id} placeholder="—" onChange={(v) => v && update((db) => { db.usuarioAtualId = v; }, { acao: "TROCA DE SESSÃO", detalhe: d.usuarios.find((x) => x.id === v)?.nome ?? "" })}
            options={d.usuarios.map((x) => ({ value: x.id, label: `${x.nome} · ${x.papel}` }))} />
        </div>
      </header>
      <div className="flex h-7 shrink-0 items-end gap-0.5 border-b border-border px-2">
        {tabs.map((t) => (
          <div key={t} onClick={() => setAtiva(t)}
            className={cn("-mb-px flex h-6 cursor-pointer items-center gap-2 rounded-t-[5px] border border-b-0 px-2.5 text-[10px] font-bold",
              t === ativa ? "border-border bg-card text-foreground" : "border-transparent text-subtle hover:text-muted-foreground")}>
            {TITULOS[t]}
            {t !== "home" && <button onClick={(e) => { e.stopPropagation(); fechar(t); }} className="text-subtle hover:text-foreground">×</button>}
          </div>
        ))}
      </div>
      <main className="min-h-0 flex-1 bg-card/40 p-2">
        {tabs.map((t) => <div key={t} className={cn("h-full", t !== ativa && "hidden")}>{conteudo[t]}</div>)}
      </main>
      <Toaster position="bottom-right" />
    </div>
  );
}

function Home({ abrir }: { abrir: (t: TabId) => void }) {
  const d = useDB();
  const est = calcularEstoque(d);
  const rasc = d.recebimentos.filter((r) => r.status === "RASCUNHO").length;
  const pend = est.reduce((a, b) => a + b.pendente, 0);
  const nc = est.reduce((a, b) => a + b.fnf + b.fsd, 0);
  const reqP = d.requisicoes.filter((r) => r.status === "PENDENTE").length;
  const papel: Papel = usuarioAtual(d).papel;
  const kpis = [
    { l: "RASCUNHOS DE RECEBIMENTO", v: rasc, t: "entradas" as TabId, tone: rasc ? "warn" : "neutral" },
    { l: "UNIDADES PENDENTES DE CONFERÊNCIA", v: pend, t: "conferencia" as TabId, tone: pend ? "warn" : "ok" },
    { l: "NÃO CONFORMIDADES (FNF + FSD)", v: nc, t: "estoque" as TabId, tone: nc ? "err" : "ok" },
    { l: "REQUISIÇÕES AGUARDANDO APROVAÇÃO", v: reqP, t: "requisicoes" as TabId, tone: reqP ? "warn" : "neutral" },
    { l: "DISPONÍVEL EM ESTOQUE", v: est.reduce((a, b) => a + b.disponivel, 0), t: "estoque" as TabId, tone: "ok" },
  ] as const;
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="grid grid-cols-5 gap-2">
        {kpis.map((k) => (
          <button key={k.l} onClick={() => abrir(k.t)} className="rounded-md border border-border bg-card p-2 text-left hover:border-ring">
            <div className="text-[9px] font-bold text-muted-foreground">{k.l}</div>
            <div className="mt-1 flex items-center justify-between"><span className="text-xl font-bold">{k.v}</span><Tag tone={k.tone}>{k.tone === "ok" ? "OK" : k.tone === "err" ? "ATENÇÃO" : k.tone === "warn" ? "PENDENTE" : "—"}</Tag></div>
          </button>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[1fr_1fr] gap-2">
        <Panel title="FLUXO HIERÁRQUICO DE ENTRADA">
          <ol className="flex flex-col gap-1.5 text-[11px]">
            {["RECEBIMENTO — GALPÃO, PROJETO, DATA, MODALIDADE", "ROMANEIOS DO RECEBIMENTO", "DOCUMENTOS DE ENTRADA DE CADA ROMANEIO", "NFs (0..N), DOCS DO CLIENTE (0..N) E PRODUTOS (1..N)", "CONFERÊNCIA POR UNIDADE (SERIAL) OU POR TOTAL (MISCELÂNEA)", "NC FNF / FSD AFETAM A DISPONIBILIDADE"].map((s, i) => (
              <li key={s} className="flex gap-2"><span className="w-4 font-bold text-subtle">{i + 1}</span>{s}</li>
            ))}
          </ol>
          <div className="mt-3 text-[9px] text-subtle">PAPEL ATUAL: {papel} · DADOS ARMAZENADOS NESTE NAVEGADOR</div>
        </Panel>
        <Panel title="ÚLTIMAS AÇÕES">
          {d.logs.slice(0, 14).map((l) => <div key={l.id} className="flex justify-between border-b border-border py-0.5"><span><b>{l.acao}</b> · {l.detalhe}</span><span className="text-subtle">{l.usuario}</span></div>)}
          {d.logs.length === 0 && <div className="text-subtle">NENHUMA AÇÃO REGISTRADA</div>}
        </Panel>
      </div>
    </div>
  );
}
