import { useState } from "react";
import { toast } from "sonner";
import { resetDB, uid, update, useDB, usuarioAtual } from "@/lib/atlas/store";
import { MATRIZ, pode, UFS, type Capacidade } from "@/lib/atlas/rules";
import type { Papel, Sku } from "@/lib/atlas/types";
import { Btn, Combo, Field, Input, Panel, Select, Table, Tag, dataHoraBR } from "./ui";

function useEdita() { const d = useDB(); return pode(usuarioAtual(d).papel, "CADASTRO_EDITAR"); }
const Aviso = () => <div className="mb-2 rounded-[4px] bg-warn-bg p-1.5 text-warn">SOMENTE LEITURA PARA SEU PAPEL</div>;

export function CadSku() {
  const d = useDB(); const ed = useEdita();
  const vazio: Omit<Sku, "id"> = { codigo: "", descricao: "", tipo: "SERIALIZADO", unidade: "UN", fracionavel: false, ativo: true };
  const [f, setF] = useState<Omit<Sku, "id"> & { id?: string }>(vazio);
  const [q, setQ] = useState("");
  const salvar = () => {
    if (!f.codigo || !f.descricao || !f.unidade) return toast.error("CÓDIGO, DESCRIÇÃO E UNIDADE SÃO OBRIGATÓRIOS");
    if (d.skus.some((s) => s.codigo === f.codigo && s.id !== f.id)) return toast.error("CÓDIGO JÁ EXISTE");
    update((db) => { const sku = { ...f, id: f.id ?? uid(), fracionavel: f.tipo === "SERIALIZADO" ? false : f.fracionavel } as Sku; const i = db.skus.findIndex((s) => s.id === sku.id); if (i >= 0) db.skus[i] = sku; else db.skus.push(sku); },
      { acao: f.id ? "SKU ALTERADO" : "SKU CRIADO", detalhe: f.codigo });
    setF(vazio); toast.success("SKU SALVO");
  };
  const lista = d.skus.filter((s) => !q || (s.codigo + s.descricao).includes(q));
  return (
    <div className="grid h-full min-h-0 grid-cols-[1fr_300px] gap-2">
      <Panel title={`CATÁLOGO DE SKU (${lista.length})`} actions={<Input className="w-56" placeholder="BUSCAR CÓDIGO OU DESCRIÇÃO" value={q} onChange={setQ} />}>
        <Table head={["CÓDIGO", "DESCRIÇÃO", "TIPO", "UN", "FRACIONA", "STATUS", ""]}>
          {lista.map((s) => (
            <tr key={s.id}><td className="font-bold">{s.codigo}</td><td>{s.descricao}</td><td>{s.tipo}</td><td>{s.unidade}</td><td>{s.fracionavel ? "SIM" : "NÃO"}</td>
              <td><Tag tone={s.ativo ? "ok" : "neutral"}>{s.ativo ? "ATIVO" : "INATIVO"}</Tag></td>
              <td className="text-right">{ed && <Btn onClick={() => setF(s)}>EDITAR</Btn>}</td></tr>
          ))}
        </Table>
      </Panel>
      <Panel title={f.id ? "EDITAR SKU" : "NOVO SKU"} actions={ed && <Btn variant="primary" onClick={salvar}>SALVAR</Btn>}>
        {!ed && <Aviso />}
        <fieldset disabled={!ed} className="flex flex-col gap-1.5">
          <Field label="CÓDIGO *"><Input value={f.codigo} onChange={(v) => setF({ ...f, codigo: v })} /></Field>
          <Field label="DESCRIÇÃO *"><Input value={f.descricao} onChange={(v) => setF({ ...f, descricao: v })} /></Field>
          <Field label="TIPO *"><Select value={f.tipo} onChange={(v) => setF({ ...f, tipo: (v || "SERIALIZADO") as Sku["tipo"] })} options={[{ value: "SERIALIZADO", label: "SERIALIZADO" }, { value: "MISCELANEA", label: "MISCELÂNEA" }]} /></Field>
          <Field label="UNIDADE *"><Input value={f.unidade} onChange={(v) => setF({ ...f, unidade: v })} /></Field>
          <label className="flex items-center gap-1"><input type="checkbox" disabled={f.tipo === "SERIALIZADO"} checked={f.fracionavel} onChange={(e) => setF({ ...f, fracionavel: e.target.checked })} /> ACEITA FRACIONAMENTO</label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={f.ativo} onChange={(e) => setF({ ...f, ativo: e.target.checked })} /> ATIVO</label>
          {f.id && <Btn onClick={() => setF(vazio)}>CANCELAR EDIÇÃO</Btn>}
        </fieldset>
      </Panel>
    </div>
  );
}

export function CadGalpoes() {
  const d = useDB(); const ed = useEdita(); const [n, setN] = useState("");
  return (
    <Panel title="GALPÕES" className="h-full" actions={ed && <><Input className="w-60" placeholder="NOME DO GALPÃO" value={n} onChange={setN} />
      <Btn variant="primary" disabled={!n} onClick={() => { update((db) => { db.galpoes.push({ id: uid(), nome: n, ativo: true }); }, { acao: "GALPÃO CRIADO", detalhe: n }); setN(""); }}>+ ADICIONAR</Btn></>}>
      <Table head={["NOME", "STATUS", ""]}>
        {d.galpoes.map((g) => <tr key={g.id}><td className="font-bold">{g.nome}</td><td><Tag tone={g.ativo ? "ok" : "neutral"}>{g.ativo ? "ATIVO" : "INATIVO"}</Tag></td>
          <td className="text-right">{ed && <Btn onClick={() => update((db) => { const x = db.galpoes.find((y) => y.id === g.id)!; x.ativo = !x.ativo; }, { acao: "GALPÃO STATUS", detalhe: g.nome })}>{g.ativo ? "INATIVAR" : "ATIVAR"}</Btn>}</td></tr>)}
      </Table>
    </Panel>
  );
}

export function CadClientes() {
  const d = useDB(); const ed = useEdita();
  const [cli, setCli] = useState(""); const [proj, setProj] = useState({ clienteId: "", parentId: "", nome: "" });
  return (
    <div className="grid h-full min-h-0 grid-cols-[300px_1fr] gap-2">
      <Panel title="CLIENTES" actions={ed && <><Input className="w-32" value={cli} onChange={setCli} placeholder="NOVO CLIENTE" />
        <Btn variant="primary" disabled={!cli} onClick={() => { update((db) => { db.clientes.push({ id: uid(), nome: cli }); }, { acao: "CLIENTE CRIADO", detalhe: cli }); setCli(""); }}>+</Btn></>}>
        <Table head={["CLIENTE", "PROJETOS"]}>{d.clientes.map((c) => <tr key={c.id}><td className="font-bold">{c.nome}</td><td>{d.projetos.filter((p) => p.clienteId === c.id).length}</td></tr>)}</Table>
      </Panel>
      <Panel title="PROJETOS E SUBPROJETOS">
        {ed && (
          <div className="mb-2 grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
            <Field label="CLIENTE *"><Combo value={proj.clienteId} onChange={(v) => setProj({ ...proj, clienteId: v, parentId: "" })} options={d.clientes.map((c) => ({ value: c.id, label: c.nome }))} /></Field>
            <Field label="PROJETO PAI (SUBPROJETO)"><Combo value={proj.parentId} onChange={(v) => setProj({ ...proj, parentId: v })} options={d.projetos.filter((p) => p.clienteId === proj.clienteId && !p.parentId).map((p) => ({ value: p.id, label: p.nome }))} placeholder="NENHUM (PROJETO RAIZ)" /></Field>
            <Field label="NOME *"><Input value={proj.nome} onChange={(v) => setProj({ ...proj, nome: v })} /></Field>
            <Btn variant="primary" disabled={!proj.clienteId || !proj.nome} onClick={() => {
              const pai = d.projetos.find((p) => p.id === proj.parentId);
              const nome = pai ? `${pai.nome} / ${proj.nome}` : proj.nome;
              update((db) => { db.projetos.push({ id: uid(), clienteId: proj.clienteId, parentId: proj.parentId || undefined, nome }); }, { acao: "PROJETO CRIADO", detalhe: nome });
              setProj({ ...proj, nome: "" });
            }}>+ ADICIONAR</Btn>
          </div>
        )}
        <Table head={["CLIENTE", "PROJETO", "NÍVEL"]}>
          {d.projetos.map((p) => <tr key={p.id}><td>{d.clientes.find((c) => c.id === p.clienteId)?.nome}</td><td className="font-bold">{p.nome}</td><td><Tag>{p.parentId ? "SUBPROJETO" : "PROJETO"}</Tag></td></tr>)}
        </Table>
      </Panel>
    </div>
  );
}

export function CadSimples({ titulo, chave }: { titulo: string; chave: "modalidades" | "naturezas" }) {
  const d = useDB(); const ed = useEdita(); const [n, setN] = useState("");
  return (
    <Panel title={titulo} className="h-full" actions={ed && <><Input className="w-60" value={n} onChange={setN} placeholder="NOVO VALOR" />
      <Btn variant="primary" disabled={!n || d[chave].includes(n)} onClick={() => { update((db) => { db[chave].push(n); }, { acao: `${titulo} CRIADO`, detalhe: n }); setN(""); }}>+ ADICIONAR</Btn></>}>
      <Table head={["VALOR", ""]}>{d[chave].map((v) => <tr key={v}><td className="font-bold">{v}</td>
        <td className="text-right">{ed && <Btn variant="danger" onClick={() => update((db) => { db[chave] = db[chave].filter((x) => x !== v); }, { acao: `${titulo} REMOVIDO`, detalhe: v })}>REMOVER</Btn>}</td></tr>)}</Table>
    </Panel>
  );
}

export function CadCidades() {
  const d = useDB(); const ed = useEdita(); const [uf, setUf] = useState("SP"); const [n, setN] = useState("");
  return (
    <Panel title="CIDADES POR UF" className="h-full" actions={<>
      <Select className="w-16" value={uf} onChange={setUf} placeholder="UF" options={UFS.map((u) => ({ value: u, label: u }))} />
      {ed && <><Input className="w-48" value={n} onChange={setN} placeholder="NOVA CIDADE" />
        <Btn variant="primary" disabled={!n || !uf} onClick={() => { update((db) => { if (!db.cidades.some((c) => c.uf === uf && c.nome === n)) db.cidades.push({ uf, nome: n, custom: true }); }, { acao: "CIDADE CRIADA", detalhe: `${n}/${uf}` }); setN(""); }}>+ ADICIONAR</Btn></>}</>}>
      <Table head={["UF", "CIDADE", "ORIGEM"]}>{d.cidades.filter((c) => !uf || c.uf === uf).map((c) => <tr key={c.uf + c.nome}><td>{c.uf}</td><td className="font-bold">{c.nome}</td><td><Tag>{c.custom ? "EXTENSÃO LOCAL" : "BASE"}</Tag></td></tr>)}</Table>
    </Panel>
  );
}

export function CadRazao() {
  const d = useDB();
  return (
    <Panel title="RAZÕES SOCIAIS (SUGESTÕES COM AUTORIA)" className="h-full">
      <Table head={["RAZÃO SOCIAL", "INCLUÍDA POR", "EM"]}>{d.razoesSociais.map((r) => <tr key={r.nome}><td className="font-bold">{r.nome}</td><td>{r.por}</td><td>{dataHoraBR(r.em)}</td></tr>)}</Table>
    </Panel>
  );
}

export function Acessos() {
  const d = useDB(); const u = usuarioAtual(d); const admin = pode(u.papel, "ACESSO_ADMIN");
  const [n, setN] = useState(""); const [p, setP] = useState<Papel>("USER");
  const caps = Object.keys({ RECEBIMENTO_CRIAR: 1, CONFERIR: 1, REQUISICAO_CRIAR: 1, REQUISICAO_APROVAR: 1, CADASTRO_EDITAR: 1, ACESSO_ADMIN: 1, AUDITORIA_VER: 1 }) as Capacidade[];
  return (
    <div className="grid h-full min-h-0 grid-cols-[1fr_1fr] gap-2">
      <Panel title="USUÁRIOS E PAPÉIS" actions={admin && <><Input className="w-40" value={n} onChange={setN} placeholder="NOME" />
        <Select className="w-24" value={p} onChange={(v) => setP((v || "USER") as Papel)} options={(["GESTOR", "ANALISTA", "USER", "SU", "MASTER"] as Papel[]).map((x) => ({ value: x, label: x }))} />
        <Btn variant="primary" disabled={!n} onClick={() => { update((db) => { db.usuarios.push({ id: uid(), nome: n, papel: p }); }, { acao: "USUÁRIO CRIADO", detalhe: `${n} (${p})` }); setN(""); }}>+</Btn></>}>
        {!admin && <div className="mb-2 rounded-[4px] bg-warn-bg p-1.5 text-warn">CONCESSÃO DE PAPÉIS RESTRITA AO MASTER</div>}
        <Table head={["USUÁRIO", "PAPEL", ""]}>
          {d.usuarios.map((x) => <tr key={x.id}><td className="font-bold">{x.nome}</td>
            <td>{admin && x.id !== u.id ? <Select className="w-28" value={x.papel} onChange={(v) => v && update((db) => { db.usuarios.find((y) => y.id === x.id)!.papel = v as Papel; }, { acao: "PAPEL ALTERADO", detalhe: `${x.nome}: ${x.papel} → ${v}` })} options={(["MASTER", "SU", "GESTOR", "ANALISTA", "USER"] as Papel[]).map((y) => ({ value: y, label: y }))} /> : <Tag>{x.papel}</Tag>}</td>
            <td className="text-right">{x.id === u.id && <Tag tone="ok">SESSÃO ATUAL</Tag>}</td></tr>)}
        </Table>
      </Panel>
      <Panel title="MATRIZ DE CAPACIDADES (PROPOSTA — A VALIDAR)">
        <Table head={["CAPACIDADE", "MASTER", "SU", "GESTOR", "ANALISTA", "USER"]}>
          {caps.map((c) => <tr key={c}><td className="font-bold">{c.replace(/_/g, " ")}</td>
            {(["MASTER", "SU", "GESTOR", "ANALISTA", "USER"] as Papel[]).map((pp) => <td key={pp}>{MATRIZ[pp].includes(c) ? <Tag tone="ok">SIM</Tag> : <span className="text-subtle">—</span>}</td>)}</tr>)}
        </Table>
        {admin && <div className="mt-3"><Btn variant="danger" onClick={() => { if (window.confirm("APAGAR TODOS OS DADOS LOCAIS E RESTAURAR DEMONSTRAÇÃO?")) resetDB(); }}>RESTAURAR DADOS DE DEMONSTRAÇÃO</Btn></div>}
      </Panel>
    </div>
  );
}

export function Logs() {
  const d = useDB(); const [q, setQ] = useState("");
  if (!pode(usuarioAtual(d).papel, "AUDITORIA_VER")) return <Panel title="LOGS DE AUDITORIA"><Aviso /></Panel>;
  const l = d.logs.filter((x) => !q || (x.acao + x.detalhe + x.usuario).includes(q));
  return (
    <Panel title={`LOGS DE AUDITORIA (${l.length})`} className="h-full" actions={<Input className="w-60" placeholder="FILTRAR" value={q} onChange={setQ} />}>
      <Table empty={l.length === 0} head={["DATA/HORA", "USUÁRIO", "PAPEL", "AÇÃO", "DETALHE"]}>
        {l.map((x) => <tr key={x.id}><td>{dataHoraBR(x.em)}</td><td>{x.usuario}</td><td><Tag>{x.papel}</Tag></td><td className="font-bold">{x.acao}</td><td>{x.detalhe}</td></tr>)}
      </Table>
    </Panel>
  );
}
